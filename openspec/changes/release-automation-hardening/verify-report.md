# Verify Report: Release Automation Hardening

## Status

PASS

## Executive Summary

The change successfully reconciled the missing `v1.3.0` release state, hardened the release workflow, added a fail-loud manifest/tag consistency guard, and documented the operational runbook. The repository is now back in a consistent state (`manifest == latest tag == 1.3.0`), and the stale `autorelease: pending` label on PR #70 was corrected to `autorelease: tagged`.

The main remaining warning is operational rather than code-level: the repository still relies on a PAT-based `RELEASE_PLEASE_TOKEN` path. The workflow now documents the risk and fails loudly on resulting state inconsistency, but a future move to a GitHub App token would be more durable.

## Evidence

### Reconciliation

- Created GitHub Release: `https://github.com/dtaborda/enterprise-platform-template/releases/tag/v1.3.0`
- Verified target commit: `efd81feb04b4f6debeb1404f955dc8ebd1e11a0c`
- Updated PR #70 label state from `autorelease: pending` to `autorelease: tagged`

### Consistency Guard

- Before reconciliation, `pnpm release:check-consistency` failed with:
  - manifest `1.3.0`
  - latest tag `1.2.0`
- After reconciliation and tag fetch, `pnpm release:check-consistency` passed with:
  - manifest `1.3.0`
  - latest tag `1.3.0`

### Workflow Hardening

- `.github/workflows/release.yml` now checks out the repository and tags.
- Release summary is emitted for both release-created and no-release runs.
- Token-source behavior and non-fallback gotcha are surfaced in the workflow summary.
- Post-release consistency verification now runs in CI.

### Documentation

- Added `docs/developer-guide/releases.mdx` covering:
  - normal release flow
  - PAT scope requirements
  - fallback gotcha
  - recovery runbook
  - rotation checklist

## Requirement Verdicts

| Requirement | Verdict | Notes |
|-------------|---------|-------|
| Reconcile Missing Release Baseline | PASS | `v1.3.0` tag and GitHub Release now exist on the intended commit |
| Fail Loudly on Invalid Release Preconditions | PASS | Workflow now exposes token-source assumptions and fails on inconsistent post-run state |
| Detect Manifest/Tag Desync | PASS | `scripts/release/check-consistency.mjs` enforces this with pending-PR grace handling |
| Expose Real Release Outcome | PASS | Workflow summary covers both published and non-published runs |
| Document Operational Recovery | PASS | Release guide added |

## Warnings

1. The token model is still PAT-based; this is acceptable for MVP hardening but remains a governance/operational risk.
2. End-to-end validation of the **next** brand-new release PR merge will happen on the next releasable merge to `main`; the repository is prepared, but that future event has not yet occurred during this session.

## Recommendation

Proceed with review/commit for this change. Consider a follow-up improvement to replace the PAT with a GitHub App token.
