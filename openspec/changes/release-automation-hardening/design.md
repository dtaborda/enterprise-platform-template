# Design: Release Automation Hardening

## Technical Approach

Keep `release-please` in manifest mode and repair the operational gaps around it. The implementation has two layers:

1. **State reconciliation** — restore the missing `v1.3.0` release baseline.
2. **Pipeline hardening** — make future release failures explicit, detectable, and recoverable.

The design intentionally preserves the current release model: conventional commits -> release PR -> merge release PR -> publish tag/release.

## Architecture Decisions

| Decision | Choice | Alternative | Rationale |
|----------|--------|-------------|-----------|
| Reconciliation strategy | Create missing `v1.3.0` | Roll manifest back to `1.2.0` | Preserves current changelog and avoids history rewrite |
| Release tool | Keep `release-please` | Migrate to semantic-release/changesets | Tool is not the root cause; operational hardening is cheaper and safer |
| Token contract | Require explicit valid release token path | Silent `PAT || GITHUB_TOKEN` fallback | Current fallback masks expired/under-scoped PAT failures |
| Consistency enforcement | Fail-loud manifest/tag guard | Human monitoring only | Prevents multi-week green-but-broken state |
| Observability | Structured summary + assertions | Best-effort success badge | Green runs must reflect actual release state |

## Data / Control Flow

### Normal release flow after hardening

```text
push to main
  -> release workflow starts
  -> validate token strategy / release prerequisites
  -> run release-please action
  -> inspect outputs + repository state
  -> if release created: publish summary with tag/version/SHA
  -> if no release created: verify whether this is expected
  -> run manifest/tag consistency guard
  -> fail if state is inconsistent or unrecoverable
```

### One-time reconciliation flow

```text
inspect PR #70 merge commit efd81fe
  -> verify CHANGELOG entry 1.3.0 matches intended release
  -> create remote tag v1.3.0 on efd81fe
  -> create GitHub Release v1.3.0
  -> resolve stale autorelease: pending state for PR #70
  -> verify manifest/package/changelog/tag alignment
```

## File Changes

| File | Action | Description |
|------|--------|-------------|
| `.github/workflows/release.yml` | Modify | Add prerequisite checks, consistency guard, better summaries |
| `docs/developer-guide/releases.mdx` | Create | Document release flow, reconciliation, token rotation |
| `scripts/release/check-consistency.*` | Create | Compare manifest version with latest tag and expected pending-PR state |
| `scripts/release/reconcile-v1-3-0.*` | Optional | Operational helper for one-time repair |

## Verification Strategy

| Layer | What to Verify | Approach |
|-------|----------------|----------|
| Workflow logic | Token/guard behavior | Dry-run logic or scripted assertions in CI-friendly commands |
| Repository state | `v1.3.0` exists and matches manifest/changelog | `git tag`, `gh release view`, manifest check |
| End-to-end release | New conventional commit -> release PR -> merged release publishes | Controlled manual test after hardening |

## Chained Work Units

| Unit | Goal | Likely PR |
|------|------|-----------|
| 1 | Reconciliation helpers + release workflow hardening | PR 1 |
| 2 | Consistency guard + docs/runbook | PR 2 |
| 3 | Verification evidence and cleanup | PR 3 |

## Open Questions

- Whether to keep PAT-based auth for MVP or switch immediately to a GitHub App token.
- Whether the consistency guard lives inside `release.yml` or in a dedicated workflow reused by other automation.
