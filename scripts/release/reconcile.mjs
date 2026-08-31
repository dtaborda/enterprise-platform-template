import { execFileSync } from "node:child_process";
import { readFileSync, unlinkSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

const PREFIX = "[release-reconcile]";

// ---------------------------------------------------------------------------
// CLI parsing
// ---------------------------------------------------------------------------

const args = process.argv.slice(2);

if (args.includes("--help") || args.includes("-h")) {
  console.log(`Usage: node scripts/release/reconcile.mjs [--apply]

Reconcile a stuck release-please deadlock by creating the missing GitHub Release
and fixing the autorelease labels on the merged release PR.

Options:
  --apply   Actually create the release and update labels (default: dry-run)
  --help    Show this message

Environment:
  GITHUB_REPOSITORY  Required. owner/repo (e.g. dtaborda/enterprise-platform-template)
  GH_TOKEN           Required. GitHub token with contents:write + pull-requests:write

The script is safe to run repeatedly (idempotent). Without --apply it only
prints what it WOULD do and exits 0.`);
  process.exit(0);
}

const apply = args.includes("--apply");

// ---------------------------------------------------------------------------
// Environment guards
// ---------------------------------------------------------------------------

const repository = process.env.GITHUB_REPOSITORY;
const hasToken = Boolean(process.env.GH_TOKEN);

if (!repository) {
  console.error(
    `${PREFIX} FATAL: GITHUB_REPOSITORY is not set. This script requires it to query GitHub.`,
  );
  process.exit(1);
}

if (!hasToken) {
  console.error(
    `${PREFIX} FATAL: GH_TOKEN is not set. This script requires it to call the GitHub CLI.`,
  );
  process.exit(1);
}

// ---------------------------------------------------------------------------
// Helpers (same style as check-consistency.mjs)
// ---------------------------------------------------------------------------

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

// ---------------------------------------------------------------------------
// Step 1 — Read manifest version
// ---------------------------------------------------------------------------

function getManifestVersion() {
  const manifest = JSON.parse(readFileSync(".release-please-manifest.json", "utf8"));
  const version = manifest["."];

  if (!version) {
    throw new Error("Manifest entry for '.' is missing in .release-please-manifest.json.");
  }

  return version;
}

const manifestVersion = getManifestVersion();
console.log(`${PREFIX} manifest=${manifestVersion}`);

// ---------------------------------------------------------------------------
// Step 2 — Check if tag already exists
// ---------------------------------------------------------------------------

const existingTags = run("git", ["tag", "--list", `v${manifestVersion}`]);

if (existingTags.includes(`v${manifestVersion}`)) {
  console.log(`${PREFIX} Tag v${manifestVersion} already exists. Nothing to do.`);
  process.exit(0);
}

// ---------------------------------------------------------------------------
// Step 3 — Ensure manifest is not BEHIND latest tag
// ---------------------------------------------------------------------------

const allTags = run("git", ["tag", "--list", "v*", "--sort=-version:refname"]);
const [latestTag] = allTags.split("\n").filter(Boolean);

if (latestTag) {
  const latestTagVersion = latestTag.replace(/^v/, "");
  console.log(`${PREFIX} latestTag=${latestTagVersion}`);

  if (compareVersions(manifestVersion, latestTagVersion) < 0) {
    console.error(
      `${PREFIX} ERROR: manifest version ${manifestVersion} is BEHIND latest tag ${latestTagVersion}. This is not a release-please deadlock — it is a different corruption that requires human inspection.`,
    );
    process.exit(1);
  }
} else {
  console.log(`${PREFIX} No existing v* tags found.`);
}

// ---------------------------------------------------------------------------
// Step 4 — Find candidate release PRs with autorelease: pending
// ---------------------------------------------------------------------------

console.log(`${PREFIX} Searching for merged release PRs with autorelease: pending...`);

const rawPullRequests = run("gh", [
  "pr",
  "list",
  "--repo",
  repository,
  "--state",
  "merged",
  "--search",
  'label:"autorelease: pending"',
  "--json",
  "number,title,mergeCommit,mergedAt,url",
  "--limit",
  "20",
]);

const allPullRequests = JSON.parse(rawPullRequests);
const releasePullRequests = allPullRequests.filter((pr) => pr.title.startsWith("chore: release"));

console.log(
  `${PREFIX} Found ${releasePullRequests.length} merged release PR(s) with autorelease: pending.`,
);

// ---------------------------------------------------------------------------
// Step 5 — Safety gate: verify manifest at merge commit
// ---------------------------------------------------------------------------

const candidates = [];

for (const pr of releasePullRequests) {
  const mergeOid = pr.mergeCommit?.oid;

  if (!mergeOid) {
    console.log(`${PREFIX}   PR #${pr.number}: no merge commit OID available, skipping.`);
    continue;
  }

  let prManifestVersion;

  try {
    const rawManifest = run("git", ["show", `${mergeOid}:.release-please-manifest.json`]);
    const manifest = JSON.parse(rawManifest);
    prManifestVersion = manifest["."];
  } catch {
    console.log(
      `${PREFIX}   PR #${pr.number} (${mergeOid}): could not read manifest at merge commit, skipping.`,
    );
    continue;
  }

  if (prManifestVersion === manifestVersion) {
    console.log(
      `${PREFIX}   PR #${pr.number} (${mergeOid}): manifest at merge commit = ${prManifestVersion} — MATCH.`,
    );
    candidates.push({ ...pr, mergeOid });
  } else {
    console.log(
      `${PREFIX}   PR #${pr.number} (${mergeOid}): manifest at merge commit = ${prManifestVersion} — does not match ${manifestVersion}, skipping.`,
    );
  }
}

// ---------------------------------------------------------------------------
// Step 6 — Zero candidates
// ---------------------------------------------------------------------------

if (candidates.length === 0) {
  console.error(
    `${PREFIX} ERROR: No merged release PR has a manifest version matching ${manifestVersion} at its merge commit. This needs human inspection.`,
  );
  process.exit(1);
}

// ---------------------------------------------------------------------------
// Step 7 — More than one candidate
// ---------------------------------------------------------------------------

if (candidates.length > 1) {
  console.error(
    `${PREFIX} ERROR: Multiple merged release PRs match manifest version ${manifestVersion}. Ambiguity cannot be resolved automatically:`,
  );

  for (const pr of candidates) {
    console.error(`  - #${pr.number} ${pr.url} (merged at ${pr.mergeOid})`);
  }

  process.exit(1);
}

// ---------------------------------------------------------------------------
// Step 8 — Exactly one candidate: extract release notes
// ---------------------------------------------------------------------------

const target = candidates[0];
console.log(`${PREFIX} Reconciliation target: PR #${target.number} (${target.url})`);
console.log(`${PREFIX}   merge commit: ${target.mergeOid}`);

let releaseNotes = "";
let notesSource = "changelog";

try {
  const changelog = run("git", ["show", `${target.mergeOid}:CHANGELOG.md`]);
  const versionHeading = `## [${manifestVersion}]`;
  const startIndex = changelog.indexOf(versionHeading);

  if (startIndex === -1) {
    throw new Error(`Heading "${versionHeading}" not found in CHANGELOG.md at merge commit.`);
  }

  const afterHeading = changelog.indexOf("\n", startIndex);
  const nextSection = changelog.indexOf("\n## [", afterHeading);
  const endIndex = nextSection === -1 ? changelog.length : nextSection;

  releaseNotes = changelog.substring(startIndex, endIndex).trim();
} catch (error) {
  console.warn(
    `${PREFIX} WARNING: Could not extract release notes from CHANGELOG.md: ${error.message}`,
  );
  console.warn(`${PREFIX} WARNING: Using a generated fallback note.`);
  releaseNotes = `Release v${manifestVersion}\n\nReconciled from PR #${target.number}: ${target.url}\n\nRelease notes could not be extracted from CHANGELOG.md at the merge commit. Consult the PR for the full changelog.`;
  notesSource = "fallback";
}

// ---------------------------------------------------------------------------
// Step 9 & 10 — Apply or dry-run
// ---------------------------------------------------------------------------

if (!apply) {
  console.log("");
  console.log(`${PREFIX} DRY RUN — the following actions would be taken with --apply:`);
  console.log(
    `${PREFIX}   1. gh release create v${manifestVersion} --target ${target.mergeOid} --title v${manifestVersion} --notes-file <tmp> --latest`,
  );
  console.log(
    `${PREFIX}   2. gh pr edit ${target.number} --remove-label "autorelease: pending" --add-label "autorelease: tagged"`,
  );
  console.log(`${PREFIX}   Notes source: ${notesSource}`);

  if (notesSource === "fallback") {
    console.log(`${PREFIX}   Notes content:`);
    console.log(releaseNotes);
  }

  console.log("");
  console.log(`${PREFIX} To execute, rerun with --apply.`);
  process.exit(0);
}

// --apply mode
const tmpFile = join(tmpdir(), `release-notes-v${manifestVersion}-${Date.now()}.md`);

try {
  writeFileSync(tmpFile, releaseNotes, "utf8");

  console.log(`${PREFIX} Creating GitHub Release v${manifestVersion}...`);
  const releaseOutput = run("gh", [
    "release",
    "create",
    `v${manifestVersion}`,
    "--repo",
    repository,
    "--target",
    target.mergeOid,
    "--title",
    `v${manifestVersion}`,
    "--notes-file",
    tmpFile,
    "--latest",
  ]);
  console.log(`${PREFIX}   Release created: ${releaseOutput}`);

  console.log(`${PREFIX} Updating labels on PR #${target.number}...`);
  run("gh", [
    "pr",
    "edit",
    String(target.number),
    "--repo",
    repository,
    "--remove-label",
    "autorelease: pending",
    "--add-label",
    "autorelease: tagged",
  ]);
  console.log(`${PREFIX}   Labels updated.`);

  console.log("");
  console.log(`${PREFIX} Reconciliation complete.`);
  console.log(`${PREFIX}   Release: v${manifestVersion}`);
  console.log(`${PREFIX}   Target:  ${target.mergeOid}`);
  console.log(`${PREFIX}   PR:      #${target.number} ${target.url}`);
  console.log(`${PREFIX}   Notes:   ${notesSource}`);
} finally {
  try {
    unlinkSync(tmpFile);
  } catch {
    // temp file cleanup is best-effort
  }
}
