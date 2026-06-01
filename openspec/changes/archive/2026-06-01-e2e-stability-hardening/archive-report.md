# Archive Report: e2e-stability-hardening

> **Archived**: 2026-06-01
> **Change**: e2e-stability-hardening — E2E Stability Hardening (flaky-baseline + theme SSR alignment)
> **Roadmap**: P1 #17 — flaky-E2E leg
> **Merged to main**: e933a80
> **PRs**: #129 (S1 — theme SSR), #130 (S2 — state isolation), #131 (S3 — team-management + email + CI)
> **SDD Cycle**: Explore → Propose → Spec → Design → Tasks → Apply (3 slices) → Verify → **Archive ✅**

---

## Executive Summary

The Playwright E2E suite had a persistent failing baseline of 5–6 failed + 1–2 flaky tests per CI
run, masking real regressions. All root causes were fixed across 3 independent PR slices:

- **S1**: Derived SSR `data-theme` from resolved brand's `themeRef` via new `deriveThemeMode()`
  helper, eliminating the dark→light theme flash. Rewrote theme spec with stable brand-driven
  assertions and `localStorage.clear()` isolation.
- **S2**: Added idempotent `afterEach` service-role DB restores for notifications, team roles,
  workspace slug, and security settings. Added content-ready heading assertions in page object
  `goto()` methods.
- **S3**: Discovered and fixed a React 19 + Next.js 15 UX bug (router.refresh() inside
  startTransition keeping isPending=true through RSC re-render). Hardened Mailpit email helpers,
  added password self-heal afterEach, and added PostgREST readiness + seed verification
  pre-flight to CI workflow.

**Outcome**: E2E suite green — 0 failed / 0 flaky in CI.

---

## Specs Synced to Canonical

| Domain | Action | Details |
|--------|--------|---------|
| `brand-behavior` | **DELTA MERGED** | Added 1 requirement: Root Layout SSR Theme Consistency (3 scenarios). Merged into existing `openspec/specs/brand-behavior/spec.md` — all 5 prior requirements preserved. |
| `e2e-suite-determinism` | **NEW CANONICAL** | Promoted to `openspec/specs/e2e-suite-determinism/spec.md` — 4 requirements, 9 scenarios. |

---

## Archive Contents

| Artifact | File | Status |
|----------|------|--------|
| Proposal | `proposal.md` | ✅ |
| Specs (delta) | `specs/brand-behavior/spec.md` | ✅ |
| Specs (new) | `specs/e2e-suite-determinism/spec.md` | ✅ |
| Design | `design.md` | ✅ |
| Tasks | `tasks.md` | ✅ (all tasks complete) |
| Archive Report | `archive-report.md` | ✅ (this file) |

---

## Engram Artifact Observation IDs

| Artifact | Topic Key | Observation ID |
|----------|-----------|----------------|
| Proposal | `sdd/e2e-stability-hardening/proposal` | #2780 |
| Spec | `sdd/e2e-stability-hardening/spec` | #2781 |
| Design | `sdd/e2e-stability-hardening/design` | #2782 |
| Tasks | `sdd/e2e-stability-hardening/tasks` | #2783 |
| Apply Progress | `sdd/e2e-stability-hardening/apply-progress` | #2784 |
| Status / Completion | `sdd/e2e-stability-hardening/status` | #2788 |
| Archive Report | `sdd/e2e-stability-hardening/archive-report` | (saved in this archive step) |

---

## Source of Truth Updated

The following canonical specs now reflect the changes from this SDD cycle:

- `openspec/specs/brand-behavior/spec.md` — amended with Root Layout SSR Theme Consistency requirement
- `openspec/specs/e2e-suite-determinism/spec.md` — new canonical spec created

---

## Deviations from Original Plan

| Item | Planned | Actual | Notes |
|------|---------|--------|-------|
| S3 email investigation | Focus on inbucket timeout + Mailpit | Root cause was RSC cold-start (not email) | Email fix still delivered; real fix was goto-after-mutation pattern |
| ResendInvitationButton | Not in original plan | Fixed router.refresh() inside startTransition | React 19 + Next.js 15 UX bug; real regression discovered during S3 |
| CancelInvitationButton | Not in scope | Same bug identified but NOT fixed | Follow-up recommended (not in original failing test list) |

---

## Open Items / Follow-up

1. **CancelInvitationButton**: Apply same `useEffect` fix as `ResendInvitationButton` — same
   `router.refresh()`-inside-`startTransition` bug; intermittent in local dev, passes in CI with
   `next start` + `retries:2`.
2. **Test coverage gaps**: Roadmap #17 also identifies additive test coverage — to be done as a
   separate change on the now-green suite.

---

## SDD Cycle Complete

Change `e2e-stability-hardening` has been fully planned, implemented, verified, and archived.
The E2E suite is green. Ready for the next change.
