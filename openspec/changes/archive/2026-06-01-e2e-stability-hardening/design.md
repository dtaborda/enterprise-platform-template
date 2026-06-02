# Design: E2E Stability Hardening (flaky-baseline + theme SSR alignment)

## Technical Approach

One production change (Item B: derive SSR `data-theme` from the resolved brand to kill the dark→light flash) plus six test/CI determinism fixes (A, C–G). Strategy: extract the existing `themeRef→mode` rule into ONE shared pure helper so layout SSR and `BrandProvider` can never drift; make every state-mutating spec self-healing via `afterEach` service-role resets; replace time-based waits with state/content assertions; harden email + CI readiness. No schema/RLS/contract changes. Verified file locations below match the real code (layout.tsx:40, provider.tsx:29-30, brand themeRef "light").

## Architecture Decisions

| Decision | Choice | Alternatives rejected | Rationale |
|----------|--------|----------------------|-----------|
| SSR theme | DERIVE `data-theme` from `brand.themeRef` in layout | Hard-code `"light"`; client-only inline script | layout already holds resolved `brand`; correct for any brand; removes flash universally; SSR == client-initial value |
| Rule location | New shared `deriveThemeMode(themeRef)` in `@enterprise/brand/theme-mode` | Duplicate rule in layout; put in `@enterprise/contracts` | Single source kills drift between layout + BrandProvider; brand pkg already imported by layout; pure fn (no React/headers) → safe in Server + Client |
| Theme test expectation | Assert against shared `EXPECTED_DEFAULT_THEME` computed via `deriveThemeMode` | Magic `"light"` string | Decouples test from brand value; if brand flips, test follows automatically |
| State restore | `afterEach` service-role DB/Auth resets (idempotent) | Inline UI restore; per-test fixtures; `db reset` | Runs even on mid-test failure; cheap; uses existing `supabaseRequest` helper |
| Waits | State/content assertions | `waitForTimeout` | Deterministic; no arbitrary sleeps |

## Item B — SSR theme derivation (the only production change)

**Confirmed rule** (`provider.tsx:29-30`): `brand.themeRef.endsWith("light") ? "light" : "dark"`. Enterprise brand `themeRef: "light"` (`enterprise.brand.ts:37`) → default `"light"`. Today `layout.tsx:40` hard-codes `data-theme="dark"` → flash.

**Shared helper** — new `packages/brand/src/brand/theme-mode.ts`:
```ts
import type { ThemeMode } from "@enterprise/contracts";
/** Single source of truth for themeRef → initial theme mode. */
export function deriveThemeMode(themeRef: string): ThemeMode {
  return themeRef.endsWith("light") ? "light" : "dark";
}
```
- Add subpath export `"./theme-mode": "./src/brand/theme-mode.ts"` to `packages/brand/package.json` and re-export from `src/index.ts`.
- `provider.tsx`: replace inline ternary (line 29-30) with `deriveThemeMode(brand.themeRef)` (keep the `defaultMode ?? …` precedence).

**layout.tsx change** (`RootLayout`, after `resolveBrand()`):
```tsx
const initialThemeMode = deriveThemeMode(brand.themeRef);
// <html lang="en" data-theme={initialThemeMode} suppressHydrationWarning …>
```
Drop the literal `"dark"`. No initial theme *class* is needed — `ThemeProvider` and CSS key off `data-theme` only (provider.tsx:44/49 set the attribute; no class). Do NOT add a class.

**Hydration handling** — SSR `data-theme` = `deriveThemeMode(brand.themeRef)`. `BrandProvider` passes the SAME derived value as `ThemeProvider.defaultMode`, whose `useState(defaultMode)` initializes identically. On mount, `ThemeProvider` effect (provider.tsx:36-45) reads localStorage; when empty, `resolved === defaultMode` → re-sets the same attribute → **no flip, no flash** for fresh visitors. Keep `suppressHydrationWarning` because a returning user's stored preference can legitimately differ post-mount (client effect only; React never diffs it). 

**Fallback** — `resolveBrand()` always returns a brand (`getDefaultBrand`) or throws before render, so `brand` is defined; `deriveThemeMode` returns `"dark"` for any non-`*light` ref, matching the documented BrandProvider fallback.

**Known pre-existing limitation (out of scope):** a returning user with `localStorage="dark"` on a light-default brand still gets a one-frame light→dark correction on mount (localStorage isn't readable during SSR). Not the targeted universal flash; a pre-paint inline script is a separate future change.

**Unit test:** add `theme-mode.test.ts` (project: brand): `light`→light, `dark`→dark, `acme-light`→light, `acme-dark`→dark.

## Item A — theme.spec.ts rewrite

New helper `ui/e2e/helpers/theme.ts`:
```ts
import { deriveThemeMode } from "@enterprise/brand/theme-mode";
import { getBrandRegistry, getDefaultBrand } from "@enterprise/brand";
export const EXPECTED_DEFAULT_THEME = deriveThemeMode(getDefaultBrand(getBrandRegistry()).themeRef);
```
(If `getBrandRegistry()`'s `require()` misbehaves under the Playwright runtime, fall back to importing the default brand config directly — see Risks.)

| Line | Now | Rewrite |
|------|-----|---------|
| 20-25 | asserts `data-theme="dark"` on `/sign-in` | rename test → "loads with brand default theme"; assert `toHaveAttribute("data-theme", EXPECTED_DEFAULT_THEME)`. **No-flash proof:** also `const html = await (await page.request.get("/sign-in")).text(); expect(html).toContain(\`data-theme="${EXPECTED_DEFAULT_THEME}"\`)` — proves the *server* emitted it. |
| 54-62 | "dark→light", asserts start dark | "light→dark": assert start `EXPECTED_DEFAULT_THEME`, click, assert `"dark"` |
| 64-74 | "back to dark" | full cycle light→dark→light: from default, click→`dark`, click→`light` |
| 76-86 | persists `"light"` | toggle once (light→dark), assert `localStorage["enterprise-theme-mode"] === "dark"` |

**localStorage.clear() placement:** Playwright gives each test a fresh context (empty storage), so default holds. To remove all ambiguity in the auth sub-describe, after `login` + `waitForURL(dashboard)` add: `await page.evaluate(() => localStorage.clear()); await page.reload(); await page.waitForLoadState("networkidle");` so `ThemeProvider` re-initializes to the brand default before each toggle test. (Line 88 "restored from localStorage" stays valid; optionally set/assert `"dark"` to keep it meaningful since default is now light.)

## Items C/D — afterEach restores + goto() readiness

**C team-management** (`Admin flows` describe): add `test.afterEach` that PATCHes `profiles` (email `eq.member@enterprise.dev`) → `role: "member"` via service-role. Remove inline UI restore (lines 147-151); the role-change test ends at the "Guest" assertion. Idempotent regardless of where the test failed.

**C workspace-admin** (`Owner flows` describe): add `test.afterEach` that restores via service-role PATCH to seed defaults: workspace **slug → `"enterprise-demo"`** and the **admin-invites flag → seed value**. Remove inline restores (105-109, 167-170). *(apply must confirm exact table/column from seed.sql — likely `tenants.slug` and the security flag column; set to documented seed defaults.)*

Add a `updateRows(table, filters, body)` PATCH helper to `ui/e2e/helpers/supabase-rest.ts` (wraps `supabaseRequest` with `method:"PATCH"`, `params:filters`, `body`).

**D goto() content-ready** (after existing `waitForURL`):
- `team-management-page.ts goto()`: `await expect(this.page.getByRole("heading", { name: "Members" })).toBeVisible({ timeout: 30_000 });`
- `workspace-admin-page.ts goto()`: `await expect(this.page.getByRole("heading", { name: "Settings" })).toBeVisible({ timeout: 30_000 });`

## Item E — notifications isolation

Member (`b1b2c3d4-…`) seed unread: `c0000001-…-0001` (team_invited) + `c0000001-…-0005` (team_role_changed). Add `test.afterEach` at the **top `Notifications` describe** (covers cross-describe contamination: mutation in line 82 vs read in line 131) using service-role:
```ts
await supabaseRequest("notifications", {
  method: "PATCH",
  params: { id: "in.(c0000001-0000-0000-0000-000000000001,c0000001-0000-0000-0000-000000000005)" },
  body: { is_read: false, read_at: null },
});
```
Idempotent; harmless for non-member tests. **Replace `waitForTimeout(500)` (spec:73):** after `clickFirstUnreadNotification` (2 unread → 1), assert `await expect(page.locator('[role="status"]')).toHaveCount(1, { timeout: 10_000 })` then the URL assertion. (Expose as `expectUnreadDotCount(1)` on the page object.)

## Item F — Mailpit + password self-heal

**inbucket.ts:** `DEFAULT_TIMEOUT_MS: 20_000 → 35_000`. **clearMailbox fallback** on Mailpit 404: reuse `getMailboxMessages(email)` (already returns Mailpit IDs filtered to the recipient), then best-effort `DELETE ${baseUrl}/api/v1/message/{id}` per message; if per-message 404/405, fall back to bulk `DELETE ${baseUrl}/api/v1/messages` with `{ IDs: [...] }`. Swallow individual failures (caller already wraps in `clearMailboxSafely`).

**password-reset.spec.ts** `afterEach`: restore both `reset@`/`reset2@` to `password123` (self-healing; never trust Docker volume). New helper `resetUserPassword(userId, password)` → `PUT ${SUPABASE_URL}/auth/v1/admin/users/{userId}` with `apikey`+`Authorization: Bearer <service-role>`, body `{ password }`. IDs: `reset@` = `d1b2c3d4-e5f6-7890-abcd-ef1234567890`, `reset2@` = `e1b2c3d4-e5f6-7890-abcd-ef1234567890` (seed.sql:123/149). Loop both in `afterEach`.

## Item G — CI workflow (.github/workflows/e2e.yml)

Insert AFTER "Wait for Supabase to be ready" (Auth health), BEFORE "Build app" — one step:
1. **PostgREST readiness poll:** loop `curl -s -o /dev/null -w "%{http_code}" http://127.0.0.1:55331/rest/v1/ -H "apikey: $NEXT_PUBLIC_SUPABASE_ANON_KEY"` until `200` (≤30 tries × 2s).
2. **Seed verification:** `curl -s http://127.0.0.1:55331/rest/v1/notifications?select=id&limit=1 -H "apikey: $SUPABASE_SERVICE_ROLE_KEY"` (service-role bypasses RLS); fail fast if response doesn't contain `"id"`.

## Sequencing / PR-slice recommendation

Total ≈240 changed lines (mostly tests) — under the 400 budget, but slice for review focus + rollback isolation. Slices share no files → ship as **3 independent PRs off `main`** (preferred; no chaining needed):

| Slice | Items | Files | ~lines |
|-------|-------|-------|--------|
| 1 — Production + its spec (STRICT TDD) | B + A | layout.tsx, brand/theme-mode.ts(+test), provider.tsx, brand package.json/index.ts, theme.spec.ts, e2e/helpers/theme.ts | ~95 |
| 2 — State determinism | C + D + E | team/workspace specs+page objects, notifications spec+page, supabase-rest.ts | ~75 |
| 3 — Email + CI resilience | F + G | inbucket.ts, password-reset.spec.ts, auth-admin helper, e2e.yml | ~90 |

B and A MUST land together — the theme spec encodes the no-flash expectation (TDD spec for the production change).
`Decision needed before apply: Yes` · `Chained PRs recommended: No (independent slices)` · `400-line budget risk: Low`

## Verification Plan

- **Local:** full `pnpm e2e` → 0 failed / 0 flaky.
- **Item B (no-flash, TDD):** theme.spec line-20 raw-HTML assertion proves SSR emits brand default; existing "no Hydration errors" test (spec:27) stays green.
- **Isolation vs order:** run `notifications.spec.ts` and `password-reset.spec.ts` BOTH in isolation AND in full-suite order; run each **twice consecutively** — the 2nd pass proves `afterEach` self-heal (notifications back to unread; passwords back to `password123`).
- **CI:** require **3 consecutive green** Playwright runs (proposal success criterion); confirm new PostgREST/seed pre-flight passes.

## Risks / Rollback (per item)

| Item | Risk | Mitigation | Rollback |
|------|------|-----------|----------|
| B | Hydration timing shifts for dark brands | Mirrors BrandProvider rule; keep `suppressHydrationWarning` | Revert layout.tsx to `data-theme="dark"` (1 line) |
| A | `@enterprise/brand` import fails in Playwright runtime (`require()` in `getBrandRegistry`) | Fallback: import default brand config directly + `deriveThemeMode`; verify tsconfig path/transpile | Revert spec + helper |
| C/D | Wrong table/column in restore PATCH | Confirm names from seed.sql during apply; idempotent set-to-seed | Revert per-file |
| E | `afterEach` needs service-role | Existing `supabaseRequest` already uses it | Revert spec/page |
| F | 35s still short under heavy CI load | Best-effort + CI readiness gating (G) reduces contention | Revert inbucket/spec |
| G | anon RLS blocks seed-check | Use service-role key for verification curl | Revert e2e.yml |
| All | Hidden flake unmasked once baseline green | 3 consecutive clean CI runs gate | n/a (additive) |

## Open Questions
- [ ] Confirm exact workspace table/column for slug + admin-invites flag in `supabase/seed.sql` (apply-time).
- [ ] Confirm `@enterprise/brand` resolves in the Playwright test runtime; else use the documented direct-import fallback.
