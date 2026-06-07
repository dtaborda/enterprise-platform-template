# Tasks: Brand Abstraction Layer + Backend Provider Decoupling

## Review Workload Forecast

| Field | Value |
|-------|-------|
| Estimated changed lines | ~2600 (A: ~5, B: ~1000, C: ~1600) |
| 800-line budget risk | High (total), mitigated by 5-PR split |
| Chained PRs recommended | Yes |
| Suggested split | PR-A → PR-B1 → PR-B2 (B-track) \| PR-C1 → PR-C2 → PR-C3 (C-track) |
| Delivery strategy | auto-forecast |
| Chain strategy | stacked-to-main |

Decision needed before apply: No
Chained PRs recommended: Yes
Chain strategy: stacked-to-main
400-line budget risk: High

### Suggested Work Units

| Unit | Goal | Likely PR | Est. Lines | Notes |
|------|------|-----------|------------|-------|
| A | Roadmap fix | PR-A | ~5 | Merge to main independently; trivial |
| B1 | Brand contracts + module + provider + layout | PR-B1 | ~600 | Base: main; typecheck must pass standalone |
| B2 | BrandLogo + BrandFooter + subpath exports + E2E | PR-B2 | ~400 | Base: PR-B1 branch |
| C1 | Port interfaces + adapters + factory (additive) | PR-C1 | ~500 | Base: main; no behavior change |
| C2 | auth-service + actions + middleware migration | PR-C2 | ~600 | Base: PR-C1 branch; invasive |
| C3 | Test rewrite to port mocks + env docs + migration guide | PR-C3 | ~500 | Base: PR-C2 branch |

B-track (B1→B2) and C-track (C1→C2→C3) run in parallel after PR-A merges.

---

## PR-A: Roadmap Fix

### Phase 1: Roadmap Update

- [ ] A.1.1 Edit `docs/features/roadmap.md`: change Notifications (#10) status from `"Planned"` to `"Done"`
- [ ] A.1.2 Verify: grep roadmap.md confirms `"Done"` on the Notifications row

---

## PR-B1: Brand Contracts + Module + Provider + Layout

### Phase 1: Schema (RED → GREEN)

- [x] B1.1.1 RED: Write `packages/contracts/src/schemas/__tests__/brand.test.ts` — 6 scenarios: valid full config passes, minimal config passes, invalid slug rejected at path `["slug"]`, missing nested field rejected, features non-boolean rejected, social.twitter invalid URL rejected
- [x] B1.1.2 GREEN: Create `packages/contracts/src/schemas/brand.ts` — `brandLogoVariantSchema`, `brandLogoSchema`, `brandMetadataSchema`, `brandLegalSchema`, `brandSocialSchema`, `brandConfigSchema`; export types `BrandConfig`, `BrandLogoVariant`, `BrandLogo`, `BrandMetadata`, `BrandLegal`, `BrandSocial`
- [x] B1.1.3 Export all brand schemas + types from `packages/contracts/src/index.ts`
- [x] B1.1.4 Run vitest — all schema tests GREEN

### Phase 2: Brand Registry (RED → GREEN)

- [x] B1.2.1 RED: Write `packages/ui/src/brand/__tests__/registry.test.ts` — scenarios: duplicate slug throws, no brands throws on `getDefaultBrand()`, `getDefaultBrand()` returns `isDefault=true` brand, falls back to `"enterprise"` slug
- [x] B1.2.2 GREEN: Create `packages/ui/src/brands/enterprise.brand.ts` — default enterprise brand config satisfying `brandConfigSchema`
- [x] B1.2.3 GREEN: Create `packages/ui/src/brand/registry.ts` — `buildRegistry()`, `getAllBrands()`, `getBrandBySlug()`, `getDefaultBrand()`; pure helpers + lazy singleton; throws on duplicate slug or missing default
- [x] B1.2.4 Run vitest — all registry tests GREEN

### Phase 3: Brand Resolution (RED → GREEN)

- [x] B1.3.1 RED: Write `packages/ui/src/brand/__tests__/resolve.test.ts` — scenarios: `BRAND_SLUG` forces brand, unknown `BRAND_SLUG` throws with available slugs, subdomain resolves, unrecognized subdomain warns+falls back, path prefix resolves, static asset paths produce no spurious warn
- [x] B1.3.2 GREEN: Create `packages/ui/src/brand/resolve.ts` — `resolveBrand()` server-only function + `resolveBrandFromRegistry()` pure testable variant; priority chain: env → subdomain → path prefix → `getDefaultBrand()`; `console.warn` on unrecognized fallback
- [x] B1.3.3 Run vitest — all resolve tests GREEN

### Phase 4: BrandProvider + useBrand() (RED → GREEN)

- [x] B1.4.1 RED: Write `packages/ui/src/brand/__tests__/provider.test.ts` — scenarios: `useBrand()` returns brand inside provider, `useBrand()` throws outside provider with `<BrandProvider>` guidance, ThemeProvider receives derived `defaultMode` from `themeRef`
- [x] B1.4.2 GREEN: Create `packages/ui/src/brand/context.ts` — `BrandContext = createContext<BrandContextValue | null>(null)`
- [x] B1.4.3 GREEN: Create `packages/ui/src/brand/provider.tsx` — `"use client"`, `BrandProvider` wraps `ThemeProvider` deriving mode from `themeRef`, `useBrand()` hook
- [x] B1.4.4 Run vitest — all provider tests GREEN

### Phase 5: generateBrandMetadata() (RED → GREEN)

- [x] B1.5.1 RED: Write `packages/ui/src/brand/__tests__/metadata.test.ts` — scenario: all fields mapped correctly; `openGraph.images = []` when `ogImage` falsy
- [x] B1.5.2 GREEN: Create `packages/ui/src/brand/metadata.ts` — `generateBrandMetadata(brand: BrandConfig): Metadata`; returns `title.template`, `title.default`, `description`, `icons.icon`, `openGraph.images`
- [x] B1.5.3 Run vitest — metadata test GREEN

### Phase 6: Layout Integration

- [x] B1.6.1 Modify `ui/app/layout.tsx`: convert static `metadata` export to `async generateMetadata()` calling `resolveBrand()` + `generateBrandMetadata()`
- [x] B1.6.2 Wrap `children` with `<BrandProvider brand={brand}>` in `RootLayout`; preserve font `className` on `<html>`, preserve `<Toaster>` as sibling (not inside BrandProvider)
- [x] B1.6.3 Run `pnpm typecheck` from root — no errors

### Phase 7: Barrel Export (packages/ui)

- [x] B1.7.1 Create `packages/ui/src/brand/index.ts` — re-exports `BrandProvider`, `useBrand`, `BrandContext`
- [x] B1.7.2 Add subpath exports to `packages/ui/package.json`: `"./brand/provider"`, `"./brand/context"`, `"./brand/resolve"`, `"./brand/registry"`, `"./brand/metadata"`
- [x] B1.7.3 Add brand barrel to `packages/ui/src/index.ts` (or existing barrel entry point)
- [x] B1.7.4 Run `pnpm typecheck` + `pnpm lint` — clean

---

## PR-B2: BrandLogo + BrandFooter + E2E (base: PR-B1)

### Phase 1: BrandLogo (RED → GREEN)

- [ ] B2.1.1 RED: Write `packages/ui/src/brand/__tests__/logo.test.tsx` — scenarios: correct variant rendered by mode (`light`/`dark`), empty `src` renders `<span>` with `displayName`
- [ ] B2.1.2 GREEN: Create `packages/ui/src/brand/logo.tsx` — `"use client"`, reads `useBrand().logo` + `useTheme()`, renders `<img>` with variant src+alt, falls back to `<span>` when src empty, forwards `className`
- [ ] B2.1.3 Run vitest — logo tests GREEN

### Phase 2: BrandFooter (RED → GREEN)

- [ ] B2.2.1 RED: Write `packages/ui/src/brand/__tests__/footer.test.tsx` — scenarios: legal links rendered when non-empty, omitted when empty string, social links when `brand.social` present, "Powered by" when `features?.showPoweredBy === true`
- [ ] B2.2.2 GREEN: Create `packages/ui/src/brand/footer.tsx` — `"use client"`, `© year displayName`, conditional legal `<a>` links, conditional social links, conditional "Powered by"
- [ ] B2.2.3 Run vitest — footer tests GREEN

### Phase 3: Subpath Exports + Barrel (finish)

- [ ] B2.3.1 Add `BrandLogo`, `BrandFooter` to `packages/ui/src/brand/index.ts`
- [ ] B2.3.2 Add subpath exports for `./brand/logo` and `./brand/footer` to `packages/ui/package.json`
- [ ] B2.3.3 Run `pnpm typecheck` — clean

### Phase 4: E2E Tests

- [ ] B2.4.1 Write `ui/e2e/brand/brand.spec.ts` — scenarios: default brand renders (logo visible), `BRAND_SLUG` env override resolves correct brand, existing auth E2E suite passes unchanged
- [ ] B2.4.2 Run `pnpm e2e` — brand suite GREEN

---

## PR-C1: Port Interfaces + Adapters + Factory (base: main)

### Phase 1: Port Interfaces (RED → GREEN)

- [ ] C1.1.1 RED: Write `packages/core/src/services/ports/__tests__/auth-port.test.ts` — scenarios: mock satisfies `AuthPort` interface without SDK import; `getUser` mock returns `null` (not error) for anonymous
- [ ] C1.1.2 GREEN: Create `packages/core/src/services/ports/auth-port.ts` — `AuthPort` interface; 7 methods with correct `ServiceResult<T>` return types; no SDK imports
- [ ] C1.1.3 RED: Write `packages/core/src/services/ports/__tests__/storage-port.test.ts` — scenarios: mock satisfies `StoragePort` interface; delete accepts multiple paths
- [ ] C1.1.4 GREEN: Create `packages/core/src/services/ports/storage-port.ts` — `StoragePort` interface; 6 methods + supporting types exported (`StorageUploadResult`, `StorageSignedUrlResult`, `StoragePublicUrlResult`, `StorageFileEntry`)
- [ ] C1.1.5 GREEN: Create `packages/core/src/services/ports/session-port.ts` — `SessionPort` interface; single `refreshSession(request: NextRequest): Promise<NextResponse>`
- [ ] C1.1.6 Run vitest — all port tests GREEN

### Phase 2: Supabase Adapters (RED → GREEN)

- [ ] C1.2.1 RED: Write `packages/core/src/services/adapters/__tests__/supabase-auth-adapter.test.ts` — scenarios: `signInWithPassword` maps Supabase error to `INVALID_CREDENTIALS`; `getUserRole` ignores `PGRST116` and returns `{ role: "guest" }`
- [ ] C1.2.2 GREEN: Create `packages/core/src/services/adapters/supabase-auth-adapter.ts` — `SupabaseAuthAdapter implements AuthPort`; constructor `(client: SupabaseClient)`; maps all 7 methods; all error codes listed in spec
- [ ] C1.2.3 RED: Write `packages/core/src/services/adapters/__tests__/supabase-storage-adapter.test.ts` — scenarios: `upload` returns `path+fullPath`; `getPublicUrl` always succeeds (no error path)
- [ ] C1.2.4 GREEN: Create `packages/core/src/services/adapters/supabase-storage-adapter.ts` — `SupabaseStorageAdapter implements StoragePort`; constructor `(client: SupabaseClient)`
- [ ] C1.2.5 GREEN: Create `packages/core/src/services/adapters/supabase-session-adapter.ts` — `SupabaseSessionAdapter implements SessionPort`; delegates `refreshSession()` to `updateSession()`; constructor `(supabaseUrl, supabaseAnonKey)`
- [ ] C1.2.6 Run vitest — all adapter tests GREEN

### Phase 3: Factory (RED → GREEN)

- [ ] C1.3.1 RED: Write `packages/core/src/services/__tests__/backend-adapters.test.ts` — scenarios: default returns Supabase adapters; unknown provider throws with guidance; missing `NEXT_PUBLIC_SUPABASE_URL` throws descriptive error
- [ ] C1.3.2 GREEN: Create `packages/core/src/services/backend-adapters.ts` — `createBackendAdapters()` returning `{ auth: (client) => AuthPort, storage: (client) => StoragePort, session: SessionPort }`; reads `BACKEND_AUTH_PROVIDER`, `BACKEND_STORAGE_PROVIDER`, `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- [ ] C1.3.3 Run vitest — factory tests GREEN

### Phase 4: Exports

- [ ] C1.4.1 Export `AuthPort`, `StoragePort`, `SessionPort` from `packages/core/src/services/index.ts` (subpath export)
- [ ] C1.4.2 Export `createBackendAdapters` from `packages/core/src/services/index.ts`
- [ ] C1.4.3 Run `pnpm typecheck` + `pnpm lint` — clean

---

## PR-C2: Service Migration + Actions + Middleware (base: PR-C1)

### Phase 1: auth-service Migration

- [ ] C2.1.1 Modify `packages/core/src/services/auth-service.ts`: change all 7 function signatures — first param `SupabaseClient` → `AuthPort`; bodies become thin delegations `return auth.method(input)`; remove all `@supabase/supabase-js` SDK calls from service functions
- [ ] C2.1.2 Run `pnpm typecheck` — verify no SDK imports remain in service functions

### Phase 2: Server Actions Migration

- [ ] C2.2.1 Modify `ui/features/auth/actions.ts`: add `createBackendAdapters()` at module level; add per-request `authFactory(client)` call inside each action; replace `client` → `auth` (AuthPort) in service function calls for all 6 Server Actions
- [ ] C2.2.2 Run `pnpm typecheck` — actions file clean

### Phase 3: Middleware Migration

- [ ] C2.3.1 Modify `ui/middleware.ts`: import `createBackendAdapters`; call at module level to get `sessionPort`; replace `updateSession(request)` call with `sessionPort.refreshSession(request)`; retain `createMiddlewareClient` for `getUserRoleService` DB query; add comment `// TODO: DatabasePort — see brand-and-decoupling migration guide`
- [ ] C2.3.2 Run `pnpm typecheck` + `pnpm lint` — middleware clean

### Phase 4: Integration Verify

- [ ] C2.4.1 Run full `pnpm test` — all existing auth tests pass (may be failing until C3 rewrite — acceptable at this PR stage; document in PR description)
- [ ] C2.4.2 Run `pnpm typecheck` from root — zero errors

---

## PR-C3: Test Rewrite + Env Docs + Migration Guide (base: PR-C2)

### Phase 1: Port Mock Helpers (RED → GREEN)

- [ ] C3.1.1 Create `packages/core/src/services/__tests__/mocks/auth-port.mock.ts` — `createMockAuthPort()` returning object with 7 `vi.fn()` stubs; zero `@supabase/supabase-js` imports
- [ ] C3.1.2 Create `packages/core/src/services/__tests__/mocks/storage-port.mock.ts` — `createMockStoragePort()` returning object with 6 `vi.fn()` stubs

### Phase 2: auth-service Test Rewrite (RED → GREEN)

- [ ] C3.2.1 Rewrite `packages/core/src/services/__tests__/auth-service.test.ts`: use `createMockAuthPort()` in all test cases; no `@supabase/supabase-js` import in test file; verify `signInWithPasswordService` delegates to `auth.signInWithPassword`; verify all 7 functions delegate correctly
- [ ] C3.2.2 Run vitest — all auth-service tests GREEN

### Phase 3: Env Docs

- [ ] C3.3.1 Add to `.env.example`: `BRAND_SLUG=` (optional, with comment), `BACKEND_AUTH_PROVIDER=supabase` (with comment), `BACKEND_STORAGE_PROVIDER=supabase` (with comment)
- [ ] C3.3.2 Update `AGENTS.md` or `packages/core/AGENTS.md` to document the port pattern for new services

### Phase 4: Migration Guide

- [ ] C3.4.1 Create `docs/migrations/brand-and-decoupling-migration-guide.md` — covers: auth-service signature breaking change (SupabaseClient → AuthPort), adapter injection pattern for Server Actions, implementing a custom AuthPort, implementing a custom StoragePort, test setup with `createMockAuthPort()`

### Phase 5: Final Verification

- [ ] C3.5.1 Run `pnpm typecheck` from root — zero errors
- [ ] C3.5.2 Run `pnpm lint` from root — zero errors  
- [ ] C3.5.3 Run `pnpm test` — all unit tests GREEN (auth-service + adapters + factory + brand schema + registry + resolve)
- [ ] C3.5.4 Run `pnpm e2e` — brand suite + auth suite GREEN
