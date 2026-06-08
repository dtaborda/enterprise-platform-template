# Tasks: Release Automation Hardening

## Review Workload Forecast

| Field | Value |
|-------|-------|
| Estimated changed lines | ~350-650 lines |
| 400-line budget risk | Medium |
| 800-line budget risk | Low |
| Chained PRs recommended | Yes |
| Delivery strategy | force-chained |
| Chain strategy | feature-branch-chain |

Decision needed before apply: No
Chained PRs recommended: Yes
Chain strategy: feature-branch-chain
400-line budget risk: Medium

### Suggested Work Units

| Unit | Goal | Likely PR | Notes |
|------|------|-----------|-------|
| 1 | Reconcile missing `v1.3.0` + workflow hardening | PR 1 | Operational repair + CI changes |
| 2 | Consistency guard + developer documentation | PR 2 | Prevent recurrence |
| 3 | Verification evidence and cleanup | PR 3 | Prove the pipeline works end-to-end |

---

## Phase 1: Reconciliation Baseline

- [x] 1.1 Verify PR #70 merge commit `efd81fe` is the correct source for `v1.3.0`.
- [x] 1.2 Create or script the one-time reconciliation steps for missing remote tag/release `v1.3.0`.
- [x] 1.3 Resolve the stale `autorelease: pending` state for PR #70.
- [x] 1.4 Capture verification evidence that manifest/package/changelog/tag are aligned after reconciliation.

**Work unit commit**: `fix(ci): reconcile missing v1.3.0 release state`

---

## Phase 2: Release Workflow Hardening

- [x] 2.1 Modify `.github/workflows/release.yml` to make token assumptions explicit and visible.
- [x] 2.2 Add fail-loud checks around release-please outputs and unexpected no-release states.
- [x] 2.3 Improve workflow summary output so maintainers can distinguish PR update vs published release vs failure.
- [x] 2.4 Add or wire any helper script needed by the workflow.

**Work unit commit**: `fix(ci): harden release workflow failure handling`

---

## Phase 3: Consistency Guard

- [x] 3.1 Add a manifest/tag consistency check that compares `.release-please-manifest.json` with the latest git tag.
- [x] 3.2 Exempt the legitimate open `autorelease: pending` window so the guard does not false-positive.
- [x] 3.3 Ensure the guard fails loudly with actionable remediation text.

**Work unit commit**: `fix(ci): add release consistency guard`

---

## Phase 4: Documentation and Runbook

- [x] 4.1 Create/update developer documentation for the release flow.
- [x] 4.2 Document PAT/App token requirements, scopes, expiry, and rotation steps.
- [x] 4.3 Document the recovery runbook for future manifest/tag desync incidents.

**Work unit commit**: `docs(ci): add release automation runbook`

---

## Phase 5: Verification

- [x] 5.1 Run targeted validation for scripts/workflow logic.
- [x] 5.2 Verify remote tag/release state after reconciliation.
- [x] 5.3 Capture evidence that the next release path is healthy.
- [x] 5.4 Update any progress artifact if apply spans multiple batches.

**Work unit commit**: `test(ci): verify release automation recovery`
