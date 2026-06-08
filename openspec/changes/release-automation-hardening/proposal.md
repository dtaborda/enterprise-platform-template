# Proposal: Release Automation Hardening

## Intent

The repository release pipeline is silently broken. `release-please` advanced the repository to `1.3.0`, but the corresponding GitHub Release and git tag `v1.3.0` were never created. Since that desync, every merge to `main` has remained unreleased while the workflow still reports success. This change restores a correct release baseline, hardens authentication and observability, and prevents future manifest/tag desync from surviving undetected.

## Scope

### In Scope
- Reconcile the missing `v1.3.0` release state.
- Harden `.github/workflows/release.yml` so token failures are explicit, not silent.
- Add a manifest/tag consistency guard.
- Improve release run observability and failure messaging.
- Document the release flow and recovery/rotation procedure.

### Out of Scope
- Replacing `release-please` with another release tool.
- Publishing npm packages or any registry artifacts.
- Independent package versioning.
- Application feature code changes.

## Capabilities

### New Capabilities
- `release-automation`: release-state consistency validation, explicit token contract, release observability, documented recovery workflow.

### Modified Capabilities
- `github-release`: release-please flow becomes fail-loud and operationally recoverable.

## Approach

Use a one-time reconciliation plus workflow hardening.

**Chosen reconciliation strategy**: honor the existing `1.3.0` changelog and repository version by creating the missing `v1.3.0` tag/release from PR #70 merge commit `efd81fe`, then clear the stale `autorelease: pending` state. This is less invasive than rewriting history back to `1.2.0`.

After reconciliation, update the release workflow so it validates token presence/intent, checks manifest/tag consistency, and makes the real release outcome visible in the workflow summary.

## Affected Areas

| Area | Impact | Description |
|------|--------|-------------|
| `.github/workflows/release.yml` | Modified | Harden token handling, add consistency checks, improve summaries |
| `.github/workflows/` | New/Modified | Optional dedicated guard workflow or helper job |
| `scripts/` | New | Small release consistency or recovery helper scripts if needed |
| `docs/developer-guide/` | New/Modified | Release flow, token rotation, recovery runbook |
| GitHub repo state | Manual/Operational | Create missing `v1.3.0` tag/release and clear stale pending state |

## Risks

| Risk | Likelihood | Mitigation |
|------|------------|------------|
| Tagging the wrong commit for `v1.3.0` | Low | Use PR #70 merge commit `efd81fe` and verify against `CHANGELOG.md` |
| PAT remains under-scoped/expired | Medium | Validate token assumptions in workflow and document rotation |
| Consistency guard blocks legitimate open release PR state | Medium | Exempt known `autorelease: pending` release-PR windows |
| Review scope exceeds budget | Medium | Split implementation into chained work units |

## Rollback Plan

1. Revert workflow and docs changes if hardening introduces false positives.
2. If reconciliation is wrong, delete the manually created tag/release and restore prior repo metadata state.
3. Re-run consistency checks before enabling normal release flow.

## Dependencies

- GitHub repository admin access for release/tag reconciliation.
- Valid `RELEASE_PLEASE_TOKEN` or alternative authenticated token strategy.
- Existing `release-please` config files remain the source of truth.

## Success Criteria

- [ ] `v1.3.0` exists as both a remote git tag and GitHub Release.
- [ ] The stale `autorelease: pending` state is resolved.
- [ ] Manifest version and latest tag can no longer drift silently.
- [ ] Release workflow fails loudly on invalid token/config state.
- [ ] The next release PR merge publishes a Release without manual repair.
