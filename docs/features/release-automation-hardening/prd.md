---
title: "Release automation hardening PRD"
description: "Fixes the broken release-please pipeline so every merge to main reliably produces a published GitHub Release, recovers the v1.3.0 desync, and prevents silent release failures from recurring."
owner: "Platform Engineering"
lastUpdated: "2026-06-07"
---

# Release automation hardening PRD

## Purpose

Define implementation-ready requirements to repair and harden the automated release pipeline (`release-please`) so that merging changes to `main` reliably results in a published GitHub Release and git tag. Today the pipeline is silently broken: the repository was bumped to `1.3.0` but the corresponding tag and Release were never created, and every subsequent merge to `main` (weeks of `feat`/`fix` work) has produced **zero** releases while all workflow runs report green. This PRD covers (1) recovering the desynced state, (2) eliminating the root cause, and (3) adding guardrails so a desync can never again persist silently.

## Scope

- Included: reconciling the `release-please` manifest/tag/Release desync, fixing the token configuration that allows silent auth failures, adding a CI consistency guard that fails loudly when manifest version and latest git tag diverge, documenting the release flow and PAT rotation procedure, and verifying end-to-end that a merge produces a published Release.
- Excluded: migrating away from `release-please` to another tool (e.g., changesets, semantic-release), publishing artifacts to npm or any package registry, multi-package / monorepo independent versioning (the repo is single-package `"."` today), changing the conventional-commit enforcement rules, and any application code changes.

---

## Problem

The release pipeline uses [`release-please`](https://github.com/googleapis/release-please) in **manifest mode** via `.github/workflows/release.yml`. It is a two-phase flow:

1. **PR phase** — release-please collects conventional commits since the last release and opens/updates a `chore: release vX` PR that bumps `package.json`, `.release-please-manifest.json`, and `CHANGELOG.md`. It labels that PR `autorelease: pending`.
2. **Tag phase** — when that release PR merges, the next run finds the merged PR labeled `autorelease: pending`, creates the GitHub Release + git tag, and relabels it `autorelease: tagged`.

**The Tag phase silently failed for `1.3.0`.** Evidence gathered during diagnosis:

| PR | Version | Final label | Outcome |
|----|---------|-------------|---------|
| #64 | 1.2.0 | `autorelease: tagged` | Release + tag `v1.2.0` created ✅ |
| #70 | **1.3.0** | `autorelease: pending` (still) | Tag/Release `v1.3.0` **never created** ❌ |

- PR #70 merged on 2026-05-09 and advanced `package.json`, `.release-please-manifest.json`, and `CHANGELOG.md` to `1.3.0`.
- No `v1.3.0` tag exists locally or on the remote — real tags stop at `v1.2.0` (SHA `44135e9`).
- The merge run `chore: release main (#70)` reported **success** but created nothing and never relabeled PR #70.

**The desync now blocks all future releases (domino effect):** with the manifest at `1.3.0` but no matching tag, release-please has no anchor SHA for "last release", so it cannot reliably compute the next release PR; the unresolved `autorelease: pending` PR #70 further blocks opening a new release PR. As a result, every merge since 2026-05-09 (workspace-admin, brand-isolation, e2e-stability, tenant-onboarding, and more) has shipped to `main` with no release — and every run stayed green, hiding the failure.

**Root cause (most probable):** the `RELEASE_PLEASE_TOKEN` PAT. The workflow uses `token: ${{ secrets.RELEASE_PLEASE_TOKEN || secrets.GITHUB_TOKEN }}`. The `||` operator only falls back when the secret is **empty/unset** — an **expired or under-scoped** PAT is still a non-empty string, so it is used and auth fails silently. Opening the release PR needs only `pull-requests: write`; creating the Release/tag needs `contents: write`. A PAT missing or having lost `contents: write` (or expired) produces this exact signature: PR opens, tag never created. The PAT was created 2026-05-07 and never rotated.

**This is recurring, not a one-off.** History shows prior desync fixes (#26 "restore manifest… sync with missing GitHub tag", commit `dda6511` "sync manifest to last existing tag v1.1.1") and remediation branches `fix/release-please-pat`, `fix/release-please-config`. This is the **third** occurrence — a systemic gap, not bad luck.

## Users and stakeholders

| Role | Need |
|------|------|
| Template maintainer | Merging to `main` reliably publishes a Release without manual intervention |
| Template adopter | A trustworthy `CHANGELOG.md` and GitHub Releases page that reflects what actually shipped |
| Platform engineering | A pipeline that **fails loudly** when state desyncs, instead of staying green |
| Release reviewer | Confidence that a green Release run means a Release was actually created |

## Goals

- Recover the desynced state so the repository has a consistent (manifest version == latest tag) baseline.
- Restore reliable automated releases: merging the release PR always publishes the Release + tag.
- Eliminate the silent-failure mode in the token configuration.
- Add a loud consistency guard so a manifest/tag desync can never persist undetected again.
- Document the release flow and PAT rotation so the next maintainer is not surprised.

### Non-goals / design decision: "a release on every merge to main"

The literal interpretation — cutting a new version tag on **every single commit merged to `main`** — is explicitly **out of scope and not recommended** for this template. It produces version noise (a release per docs typo or dependency bump), fragments the changelog, and breaks semantic grouping. The practical, intended meaning adopted by this PRD is: **every merge to `main` is releasable, and the release PR auto-publishes reliably the moment it is merged** — which is exactly what `release-please` provides when healthy. If the maintainer truly wants per-commit continuous releases, that is a separate decision recorded under "Alternatives considered" below and would require replacing release-please.

---

## MVP scope

### Core capabilities

**1. State reconciliation (one-time recovery)**

Bring manifest, tags, and Releases back into a single consistent baseline. Two viable strategies — the implementation MUST pick one and document the choice:

- **Strategy A — Honor `1.3.0`:** create the missing `v1.3.0` tag on PR #70's merge commit (`efd81fe`) and publish the corresponding GitHub Release from the existing `CHANGELOG.md` `[1.3.0]` entry, then relabel PR #70 `autorelease: tagged`. Preserves the already-bumped `package.json`/manifest and the published changelog history.
- **Strategy B — Roll back the manifest:** reset `.release-please-manifest.json` and `package.json` to the last real tag (`1.2.0`), remove the `[1.3.0]` changelog entry, and let release-please regenerate a fresh release PR that consolidates everything merged since `v1.2.0`.

Recommended: **Strategy A** (less history rewrite, the `1.3.0` changelog is already public-facing in `CHANGELOG.md`). The unresolved `autorelease: pending` label on PR #70 MUST be cleared either way.

**2. Token configuration hardening**

Replace the false-safety `||` fallback with an explicit, verifiable token contract:

- Rotate `RELEASE_PLEASE_TOKEN` to a fine-grained PAT with **both** `contents: write` and `pull-requests: write` on this repository, OR move to a GitHub App installation token (preferred long-term: no human-tied expiry).
- Record the PAT expiration date and add a maintenance reminder (see capability 5).
- Make the absence of a valid token a **hard, visible failure** rather than a silent fallback. The workflow must not pretend to succeed when it ran with a token that cannot create Releases.

**3. Consistency guard (loud failure)**

Add a CI check (a step in `release.yml` or a small dedicated workflow) that compares `.release-please-manifest.json` version against the latest git tag (`git describe --tags --abbrev=0`). If they diverge AND there is no open `autorelease: pending` release PR explaining the gap, the job **fails** with an actionable message. This converts the current silent multi-week desync into an immediate red signal.

**4. Release run observability**

Surface the real outcome of each Release run so a green check is meaningful:

- Emit a clear job summary distinguishing "release PR updated", "release published (tag X)", and "no releasable changes".
- When `release_created == false` but releasable commits exist since the last tag, annotate the run so maintainers notice.

**5. Documentation and rotation procedure**

- Document the two-phase release flow, the manifest/tag invariant, and the recovery runbook in a developer guide (e.g., `docs/developer-guide/releases.mdx`).
- Document the PAT/App token setup, required scopes, expiration tracking, and rotation steps so the token is never silently the cause again.

### Out of MVP

- Switching to a GitHub App token (recommended but can be a follow-up if PAT rotation unblocks faster).
- npm/registry publishing.
- Independent per-package versioning.

---

## Verification and rollout

> Note: the `feature-readiness` traceability checklist (audit events, Sentry, seed data, E2E, external adapters) is intentionally **not applicable** here — this is CI/release infrastructure with no application CUD operations and no external app-provider integration. The criteria below replace it.

### Acceptance criteria

- [ ] `git describe --tags --abbrev=0` and `.release-please-manifest.json` report the same version (consistent baseline restored).
- [ ] A GitHub Release and tag `v1.3.0` exist (Strategy A) **or** the manifest is back at `1.2.0` with a fresh release PR open (Strategy B).
- [ ] PR #70 no longer carries `autorelease: pending`.
- [ ] `RELEASE_PLEASE_TOKEN` (or App token) is rotated with verified `contents: write` + `pull-requests: write`, and its expiry is recorded.
- [ ] The consistency guard fails a deliberately introduced manifest/tag mismatch (tested in a throwaway branch/PR).
- [ ] End-to-end proof: a test conventional commit merged to `main` opens/updates a release PR, and merging that PR publishes a Release + tag with no manual steps.
- [ ] Release flow and PAT rotation documented in the developer guide.

### Rollout steps

1. Land the token rotation + workflow hardening + consistency guard (no state change yet).
2. Execute the one-time state reconciliation (Strategy A or B).
3. Verify end-to-end with a low-risk commit (e.g., a `fix`/`docs`-triggering change or `workflow_dispatch`).
4. Confirm the next real merge to `main` flows through cleanly.

---

## Risks and mitigations

| Risk | Impact | Mitigation |
|------|--------|------------|
| Manual tag creation points at the wrong SHA | Changelog/tag mismatch | Use PR #70's recorded merge commit `efd81fe`; verify against `CHANGELOG.md` `[1.3.0]` before tagging |
| New PAT also under-scoped | Failure repeats | Verify scopes with a dry-run release on a test commit before closing the work; prefer GitHub App token long-term |
| Consistency guard false-positives during a legitimately open release PR | Blocked merges | Exempt the guard when an `autorelease: pending` PR is open |
| Strategy B rewrites public changelog history | Adopter confusion | Prefer Strategy A; if B is chosen, document the consolidation clearly |
| Token expiry recurs in the future | Silent break returns | Record expiry + reminder; migrate to GitHub App token (no human-tied expiry) |

## Alternatives considered

- **Per-commit continuous release (a tag on every merge):** rejected — version/changelog noise, no semantic grouping, poor fit for a template consumers track by version. Would require replacing release-please.
- **Replace release-please with `changesets` or `semantic-release`:** out of scope — release-please is correctly configured; the failure is operational (token + desync), not the tool. Swapping tools adds risk without addressing the root cause.
- **Keep the `|| GITHUB_TOKEN` fallback as-is:** rejected — it is the mechanism that converts a bad PAT into a silent failure.

## Open questions

- Strategy A vs B for reconciliation — recommendation is A; needs maintainer sign-off.
- PAT now vs GitHub App token — App token is the more durable fix; confirm whether to do it in MVP or as a fast follow-up.
