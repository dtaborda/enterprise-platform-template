# Tasks: E2E Stability Hardening (flaky-baseline + theme SSR alignment)

## Review Workload Forecast

| Field | Value |
|-------|-------|
| Estimated changed lines | ~255 (B+A ≈95 · C+D+E ≈75 · F+G ≈85) |
| 800-line budget risk | **Low** |
| Chained PRs recommended | **No — but 3 independent PRs recommended** |
| Suggested split | PR-S1 (B+A) → PR-S2 (C+D+E) → PR-S3 (F+G) off `main` |
| Delivery strategy | auto-forecast |
| Chain strategy | stacked-to-main (ordered, but non-stacked: slices share NO files) |

> **Independence note**: The 3 slices target **different files** with zero overlap. They
> can be opened as parallel independent PRs off `main` rather than stacked. "Stacked-to-main"
> here means sequential merge order (S1 → S2 → S3) for traceability, not a branching chain.

Decision needed before apply: No
Chained PRs recommended: No
Chain strategy: stacked-to-main
400-line budget risk: Low

### Suggested Work Units

| Unit | Goal | Likely PR | Notes |
|------|------|-----------|-------|
| S1 | deriveThemeMode helper + layout.tsx SSR + theme.spec rewrite | PR-S1 | TDD: failing spec first; brand import confirmed (gate 1S) |
| S2 | afterEach restores + goto() content-ready + notifications isolation | PR-S2 | Table/column confirmed (gate 2S); independent of S1 |
| S3 | Mailpit timeout/delete + password self-heal + CI pre-flight | PR-S3 | Independent of S1 and S2 |

---

## ⚠️ CONFIRMATION GATE 1 — @enterprise/brand in Playwright runtime
**MUST run BEFORE any Slice 1 code task.**

- [ ] **GATE-1**: In the Playwright runtime, confirm `require('@enterprise/brand')` resolves
  without error (getBrandRegistry uses `require()`). If it resolves → use barrel import.
  If it throws (module not in jest/ts-jest require chain) → use documented direct-import fallback:
  `import enterpriseBrand from '@enterprise/brand/src/brands/enterprise.brand'` (or the compiled
  path). Record choice in apply notes before proceeding to task 1.2.

## ⚠️ CONFIRMATION GATE 2 — workspace table/column names in seed.sql
**MUST run BEFORE any Slice 2 code task.**

- [ ] **GATE-2**: Open `supabase/seed.sql` and confirm:
  (a) exact table name holding workspace slug (expected: `tenants`, column `slug`).
  (b) exact column for admin-invites/security flag (expected: security-settings related column).
  Record confirmed names in apply notes before proceeding to task 2.1.

---

## Slice 1: deriveThemeMode Helper + Theme Spec (Items B + A)
> Must land together — the E2E spec encodes the no-flash TDD expectation.

- [ ] 1.1 **[RED]** Write failing unit test `packages/brand/src/brand/__tests__/theme-mode.test.ts`:
  assert `deriveThemeMode("light")==="light"`, `deriveThemeMode("dark")==="dark"`,
  `deriveThemeMode("acme-light")==="light"`, `deriveThemeMode("acme-dark")==="dark"`.
  Run → 4 failures (file not yet created).

- [ ] 1.2 **[GREEN]** Create `packages/brand/src/brand/theme-mode.ts`:
  `export type ThemeMode = "light" | "dark";`
  `export function deriveThemeMode(themeRef: string): ThemeMode { return themeRef.endsWith("light") ? "light" : "dark"; }`
  Unit tests go green.

- [ ] 1.3 Add subpath export `"./theme-mode"` to `packages/brand/package.json` exports map.
  Re-export from `packages/brand/src/index.ts` barrel.

- [ ] 1.4 Refactor `packages/brand/src/brand/provider.tsx` line ~30: replace inline ternary
  `brand.themeRef.endsWith("light") ? "light" : "dark"` with `deriveThemeMode(brand.themeRef)`.
  Import from `./theme-mode`. Verify existing brand E2E still green.

- [ ] 1.5 **[RED]** Write failing E2E: in `ui/e2e/theme/theme.spec.ts` add SSR no-flash assertion
  (raw HTML request to `/sign-in`, assert `data-theme="<EXPECTED_DEFAULT_THEME>"` in response body
  using the shared constant from gate GATE-1 resolution). Run → fails (layout.tsx still hard-codes
  `"dark"`).

- [ ] 1.6 **[GREEN]** Update `ui/app/layout.tsx`: import `deriveThemeMode` + `resolveBrand`.
  `const initialThemeMode = deriveThemeMode(brand.themeRef);`
  Set `<html data-theme={initialThemeMode} suppressHydrationWarning ...>`. Drop literal `"dark"`.
  SSR no-flash test goes green.

- [ ] 1.7 Create `ui/e2e/helpers/theme.ts` with `EXPECTED_DEFAULT_THEME` constant derived from
  brand registry (or direct import per GATE-1 choice). Export for spec consumption.

- [ ] 1.8 Rewrite `ui/e2e/theme/theme.spec.ts` hardened assertions:
  L20 → `toHaveAttribute("data-theme", EXPECTED_DEFAULT_THEME)`;
  L54/L64 → light→dark / full-cycle using constant;
  L76 → toggle + localStorage assertion;
  Add `beforeEach` `localStorage.clear()` after login+waitForURL(dashboard)+reload+networkidle.

- [ ] 1.9 **[VERIFY]** Run `ui/e2e/theme/theme.spec.ts` in isolation → 0 failed.
  Run full suite → 0 failed in theme group. Run **twice consecutively** to confirm idempotency.

---

## Slice 2: afterEach Restores + goto() Readiness + Notifications Isolation (Items C + D + E)
> Requires GATE-2 confirmed before 2.1.

- [ ] 2.1 Add `updateRows(table, filters, body)` PATCH helper to `ui/e2e/helpers/supabase-rest.ts`
  using existing `supabaseRequest`. `filters`: `Record<string,string>` for query params;
  `body`: `Record<string,unknown>`.

- [ ] 2.2 **[RED]** In `ui/e2e/team-management/team-management.spec.ts` remove inline role-restore
  code (lines 147–151). Run → role contamination failure visible.

- [ ] 2.3 **[GREEN]** Add `test.afterEach` in team-management Admin flows describe:
  PATCH `profiles` `email=eq.member@enterprise.dev` → `{ role: "member" }` via service-role.
  Run → role contamination fixed.

- [ ] 2.4 **[RED]** In `ui/e2e/workspace-admin/workspace-admin.spec.ts` remove inline restores
  (lines 105–109, 167–170). Run → slug + security-flag contamination visible.

- [ ] 2.5 **[GREEN]** Add `test.afterEach` in workspace-admin Owner flows describe:
  PATCH tenants with confirmed GATE-2 table/column → seed slug `"enterprise-demo"`.
  PATCH confirmed security flag column → seed default value. Run → contamination fixed.

- [ ] 2.6 Update `ui/e2e/team-management/team-management-page.ts` `goto()`:
  after `waitForURL` add `await expect(page.getByRole("heading", { name: "Members" })).toBeVisible({ timeout: 30_000 })`.

- [ ] 2.7 Update `ui/e2e/workspace-admin/workspace-admin-page.ts` `goto()`:
  after `waitForURL` add `await expect(page.getByRole("heading", { name: "Settings" })).toBeVisible({ timeout: 30_000 })`.

- [ ] 2.8 **[RED]** In `ui/e2e/notifications/notifications.spec.ts` remove `waitForTimeout(500)`
  at line ~73. Run → timing failure visible.

- [ ] 2.9 **[GREEN]** Replace with `await expect(page.locator('[role="status"]')).toHaveCount(1, { timeout: 10_000 })`.
  Expose `expectUnreadDotCount(n)` helper on the notifications page object.

- [ ] 2.10 Add `test.afterEach` at TOP of Notifications describe:
  PATCH notifications `id=in.(c0000001-0000-0000-0000-000000000001,c0000001-0000-0000-0000-000000000005)`
  → `{ is_read: false, read_at: null }` via service-role. Idempotent.

- [ ] 2.11 **[VERIFY]** Run `notifications.spec.ts` in isolation → 0 failed.
  Run full suite in standard order → 0 failed. Run **twice consecutively** to confirm afterEach heal.
  Same for team-management.spec + workspace-admin.spec.

---

## Slice 3: Mailpit Fixes + Password Self-Heal + CI Pre-Flight (Items F + G)

- [ ] 3.1 Update `DEFAULT_TIMEOUT_MS` in `ui/e2e/helpers/inbucket.ts` from `20_000` → `35_000`.

- [ ] 3.2 Refactor `clearMailbox()` in `ui/e2e/helpers/inbucket.ts`:
  (a) call `getMailboxMessages(email)` → collect `ids`;
  (b) for each id DELETE `${baseUrl}/api/v1/message/${id}`;
  (c) if 404/405 → best-effort bulk DELETE `${baseUrl}/api/v1/messages` body `{ IDs: [...] }`;
  (d) wrap in `clearMailboxSafely()` that swallows all failures.

- [ ] 3.3 Add `resetUserPassword(userId, password)` helper to `ui/e2e/helpers/supabase-rest.ts`:
  PUT `${SUPABASE_URL}/auth/v1/admin/users/${userId}` with `apikey` + `Bearer` service-role key,
  body `{ password }`.

- [ ] 3.4 Add `test.afterEach` to `ui/e2e/auth/password-reset.spec.ts`:
  call `resetUserPassword` for both seed UUIDs (`d1b2c3d4-…` reset@ and `e1b2c3d4-…` reset2@)
  with `"password123"`. Loop both. Errors swallowed (best-effort).

- [ ] 3.5 **[RED]** In `.github/workflows/e2e.yml` verify the `supabase start` step exists without
  PostgREST readiness polling. Document gap as expected failure for this task.

- [ ] 3.6 **[GREEN]** Insert step AFTER Auth health wait, BEFORE Build app in `.github/workflows/e2e.yml`:
  (a) Poll `curl http://127.0.0.1:55321/rest/v1/ -H "apikey: ${{ secrets.ANON_KEY }}"` until 2xx
      (up to 30s, 3s sleep).
  (b) Seed-verify: `curl .../rest/v1/notifications?select=id&limit=1 -H "apikey: ${{ secrets.SERVICE_ROLE_KEY }}"`;
      fail with `echo "No seed data — aborting" && exit 1` if response contains no `"id"`.

- [ ] 3.7 **[VERIFY]** Run `password-reset.spec.ts` in isolation → 0 failed.
  Run full suite → 0 failed. Run **twice consecutively** to confirm password self-heal.
  Validate CI workflow YAML syntax (`act --dryrun` or local parse).

---

## Phase 4: Cross-Slice Verification

- [ ] 4.1 Run full `pnpm e2e` locally → 0 failed / 0 flaky.
- [ ] 4.2 Run again immediately (2nd pass) → 0 failed / 0 flaky.
- [ ] 4.3 Confirm brand E2E remains green after Slice 1 (ThemeProvider + layout consistent).
- [ ] 4.4 Typecheck: `pnpm typecheck` passes for `packages/brand` + `ui/`.
- [ ] 4.5 Lint: `pnpm lint` passes (no `any`, no `waitForTimeout`).
- [ ] 4.6 CI: merge PRs sequentially (S1 → S2 → S3); verify 3 consecutive green CI runs.
