# Proposal: E2E Stability Hardening (flaky-baseline + theme SSR alignment)

> Roadmap P1 #17 — flaky-E2E leg only. Root causes verified per-spec in exploration `sdd/e2e-stability-hardening/explore`.

## Intent

The Playwright suite carries a persistent failing baseline (~5-6 failed + 1-2 flaky per CI run) that masks real regressions and erodes trust in CI. Root causes are confirmed and concrete: wrong theme assertions, shared-DB state contamination, inline (not `afterEach`) state restoration, content-readiness races, Mailpit-incompatible mailbox clearing, and incomplete CI readiness gating. Separately, the root layout hard-codes `data-theme="dark"` while the resolved brand defaults to light, producing a real dark→light **theme flash** for every user. We fix the suite AND eliminate that flash by aligning SSR with the resolved brand (user-approved "Option B").

## Scope

### In Scope
- **A** — Fix theme assertions (`theme.spec.ts`) to brand default `light` (light→dark→light); add `localStorage.clear()` for a known start state.
- **B** — **PRODUCTION UX FIX**: derive SSR `data-theme` from the resolved brand's `themeRef` in `layout.tsx`, removing the flash for any brand.
- **C** — Move role/slug/security restores into `afterEach` (team-management, workspace-admin) so they run on failure.
- **D** — Add content-ready heading assertions in team-management + workspace-admin page objects after `waitForURL`.
- **E** — Notifications DB-state isolation: reset mutated rows to `is_read=false` via existing service-role helper; replace `waitForTimeout(500)` with a state-based wait.
- **F** — Email polling + Mailpit compat in `inbucket.ts`: bump timeout 20s→35s; per-message delete fallback on bulk-DELETE 404; self-healing password restore in `afterEach`.
- **G** — CI readiness: PostgREST health + seed-verification pre-flight in `e2e.yml`.

### Out of Scope
- New unit/E2E coverage for currently uncovered features (separate change).
- Lockfile/build automation (already delivered in PR #119).
- Parallelizing workers — CI stays `workers:1` (safest with shared DB; explicit Q4 decision).

## Capabilities

### New Capabilities
- None.

### Modified Capabilities
- None at the spec/requirement level. Behavior change B is a UX rendering correction (initial theme), not a new requirement; it aligns runtime with the already-specified brand `themeRef` default. Everything else is test/CI tooling.

## Approach

Combine targeted per-spec state restoration (`afterEach`) with CI readiness gating and email-timing robustness — exploration Approach **1 + 3**. No per-test DB fixtures and no `supabase db reset` between tests (too slow, rejected). For the flash, **derive** rather than hard-code (see decision below).

### SSR theme decision: DERIVE (not hard-code)
`layout.tsx:35` ALREADY calls `resolveBrand()` and has `brand` in scope. The brand→mode rule already exists in `BrandProvider` (`provider.tsx:30`): `brand.themeRef.endsWith("light") ? "light" : "dark"`. We replace the hard-coded `data-theme="dark"` on `<html>` with the derived value (and any initial theme class). This is correct for ANY brand, removes the flash universally, and keeps SSR and client hydration consistent. Hard-coding `"light"` was the fallback only — deriving is feasible, so we derive.

### Open-question defaults adopted
- Q2 notifications → `afterEach` DB reset (not reordering).
- Q3 password reset → self-healing (`afterEach` restore + robust `clearMailbox`); never rely on Docker volume state.
- Q4 workers → keep `workers:1`.

## Fix Inventory

| # | File | Change |
|---|------|--------|
| A | `ui/e2e/theme/theme.spec.ts` (20,54,64,76) | Rewrite assertions to brand default light; toggle light→dark→light; `localStorage.clear()` in beforeEach |
| B | `ui/app/layout.tsx` | Derive `data-theme` (+ initial theme class) from resolved `brand.themeRef`; drop hard-coded `"dark"` |
| C | `ui/e2e/tenant-team-management/team-management.spec.ts` | Move role restore to `afterEach` |
| C | `ui/e2e/workspace-admin/workspace-admin.spec.ts` | Move slug + security toggle restore to `afterEach` |
| D | `ui/e2e/tenant-team-management/team-management-page.ts` | After `waitForURL`, assert Members heading visible |
| D | `ui/e2e/workspace-admin/workspace-admin-page.ts` | After `waitForURL`, assert page heading visible |
| E | `ui/e2e/notifications/notifications.spec.ts` | `afterEach` reset member notifications (c0000001-…-0001, …-0005) to `is_read=false`; replace `waitForTimeout(500)` with state-based wait |
| F | `ui/e2e/helpers/inbucket.ts` | `DEFAULT_TIMEOUT_MS` 20s→35s; `clearMailbox` per-message DELETE on 404 |
| F | `ui/e2e/auth/password-reset.spec.ts` | `afterEach` restore reset/reset2 user passwords (self-healing) |
| G | `.github/workflows/e2e.yml` | Add PostgREST readiness + seed-verification pre-flight after supabase start |

## Affected Areas

| Area | Impact | Description |
|------|--------|-------------|
| `@enterprise/web` (`ui/`) | Modified | One Server Component (layout.tsx) + E2E specs/page objects/helpers |
| `.github/workflows/e2e.yml` | Modified | CI readiness gating |
| `@enterprise/contracts`, `core`, `db` | None | No package, schema, RLS, or contract changes |

## Feature Readiness / Traceability

Per `feature-readiness` decision tree: this change has **no CUD operations in production code** and **no external-provider integration**. Item B modifies a Server Component's render output only (initial theme) — no mutation, no data access change. **Full traceability checklist does NOT apply.** Explicit confirmation:

- Audit events: none needed (no mutations).
- Sentry: no new area/instrumentation.
- Seed data: unchanged (test helpers only reset existing seed rows to seed values).
- External adapters / env vars: none.
- E2E flows: this change hardens existing flows; no new product flows.
- Only product-visible change: initial SSR theme matches resolved brand (flash removed); brand E2E must stay green.

## Risks

| Risk | Likelihood | Mitigation |
|------|------------|------------|
| Theme assertions re-couple to a specific brand value | Med | Drive expectations from brand default contract / shared constant; light is enterprise default |
| 35s email timeout still insufficient under heavy CI load | Low | Best-effort; combined with seed/readiness gating; revisit only if it recurs |
| Notification `afterEach` reset needs service-role | Low | Uses existing `supabaseRequest` service-role helper already in suite |
| Deriving SSR theme changes hydration timing for dark brands | Low | Rule mirrors existing `BrandProvider` derivation; `suppressHydrationWarning` retained |
| Hidden flake unmasked once baseline is green | Med | Acceptance requires 3 consecutive clean CI runs |

## Rollback Plan

- **B (production):** revert `layout.tsx` to the prior `data-theme="dark"` literal — single-file, isolated.
- **A,C–G (tests/CI):** revert per-file; each fix is independent and additive (`afterEach`, timeout bump, CI step). No DB schema, RLS, or migration changes, so nothing to roll back at the data layer.

## Dependencies

- PR #119 (lockfile/build automation) — already merged.
- Local Supabase stack with Mailpit/Inbucket for email tests (existing).

## Success Criteria

- [ ] `pnpm e2e` and the CI Playwright job finish **0 failed / 0 flaky**.
- [ ] Stable across **3 consecutive CI runs**.
- [ ] No production behavior change beyond intended theme SSR alignment (flash removed); brand E2E stays green.
- [ ] No new audit events, Sentry areas, seed data, adapters, or env vars introduced.
