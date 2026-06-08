import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";

function run(command, args, options = {}) {
  return execFileSync(command, args, {
    encoding: "utf8",
    stdio: ["ignore", "pipe", "pipe"],
    ...options,
  }).trim();
}

function parseVersion(version) {
  const match = version.match(/^(\d+)\.(\d+)\.(\d+)$/);

  if (!match) {
    throw new Error(`Invalid semver version: ${version}`);
  }

  return match.slice(1).map(Number);
}

function compareVersions(left, right) {
  const a = parseVersion(left);
  const b = parseVersion(right);

  for (let index = 0; index < a.length; index += 1) {
    if (a[index] > b[index]) return 1;
    if (a[index] < b[index]) return -1;
  }

  return 0;
}

function getLatestTagVersion() {
  const raw = run("git", ["tag", "--list", "v*", "--sort=-version:refname"]);
  const [latestTag] = raw.split("\n").filter(Boolean);

  if (!latestTag) {
    throw new Error("No release tags matching v* were found.");
  }

  return latestTag.replace(/^v/, "");
}

function getManifestVersion() {
  const manifest = JSON.parse(readFileSync(".release-please-manifest.json", "utf8"));
  const version = manifest["."];

  if (!version) {
    throw new Error("Manifest entry for '.' is missing in .release-please-manifest.json.");
  }

  return version;
}

function getPendingReleasePullRequests() {
  const repository = process.env.GITHUB_REPOSITORY;
  const hasToken = Boolean(process.env.GH_TOKEN);

  if (!repository || !hasToken) {
    return [];
  }

  const raw = run("gh", [
    "pr",
    "list",
    "--repo",
    repository,
    "--state",
    "all",
    "--search",
    'label:"autorelease: pending"',
    "--json",
    "number,title,state,mergedAt,updatedAt,url",
    "--limit",
    "20",
  ]);

  const pullRequests = JSON.parse(raw);

  return pullRequests.filter((pullRequest) => pullRequest.title.startsWith("chore: release"));
}

function isWithinGraceWindow(pullRequest, graceHours) {
  const reference = pullRequest.mergedAt ?? pullRequest.updatedAt;

  if (!reference) {
    return false;
  }

  const ageMs = Date.now() - new Date(reference).getTime();

  return ageMs <= graceHours * 60 * 60 * 1000;
}

const manifestVersion = getManifestVersion();
const latestTagVersion = getLatestTagVersion();

console.log(`[release-consistency] manifest=${manifestVersion}`);
console.log(`[release-consistency] latestTag=${latestTagVersion}`);

if (manifestVersion === latestTagVersion) {
  console.log("[release-consistency] OK: manifest and latest tag are aligned.");
  process.exit(0);
}

const comparison = compareVersions(manifestVersion, latestTagVersion);

if (comparison < 0) {
  console.error(
    `[release-consistency] ERROR: manifest version ${manifestVersion} is behind latest tag ${latestTagVersion}.`,
  );
  process.exit(1);
}

const graceHours = Number(process.env.RELEASE_PENDING_GRACE_HOURS ?? "2");
const pendingReleasePullRequests = getPendingReleasePullRequests();

if (pendingReleasePullRequests.length === 0) {
  console.error(
    `[release-consistency] ERROR: manifest ${manifestVersion} is ahead of latest tag ${latestTagVersion} and no autorelease: pending release PR exists.`,
  );
  console.error(
    "[release-consistency] Remediation: reconcile the missing release/tag or restore the manifest to the last published tag.",
  );
  process.exit(1);
}

const freshPending = pendingReleasePullRequests.find((pullRequest) =>
  isWithinGraceWindow(pullRequest, graceHours),
);

if (freshPending) {
  console.log(
    `[release-consistency] OK: manifest is ahead of tag, but pending release PR #${freshPending.number} is within the ${graceHours}h grace window.`,
  );
  process.exit(0);
}

console.error(
  `[release-consistency] ERROR: manifest ${manifestVersion} is ahead of latest tag ${latestTagVersion}, but pending release PRs are stale.`,
);

for (const pullRequest of pendingReleasePullRequests) {
  console.error(
    `- #${pullRequest.number} ${pullRequest.url} (state=${pullRequest.state}, mergedAt=${pullRequest.mergedAt ?? "n/a"}, updatedAt=${pullRequest.updatedAt ?? "n/a"})`,
  );
}

console.error(
  "[release-consistency] Remediation: repair the missing tag/release, clear the stale autorelease state, then rerun the workflow.",
);
process.exit(1);
