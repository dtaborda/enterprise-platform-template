# Proposal: Brand Abstraction Layer + Backend Provider Decoupling

## Intent

The template is fully coupled to Supabase and ships a single hardcoded identity. Adopters who need a different auth provider or a second brand must fork and gut — losing upgrade paths. Features #14 (brand) and #16 (decoupling) are orthogonal (zero file overlap), both P1, and unblock the highest-value adopter customization axes: visual identity and backend choice. Bundling them in one SDD change reduces coordination overhead while enabling parallel PR tracks. The roadmap also has a stale status (Notifications #10 shows "Planned" but is Done).

## Scope

### In Scope
- **A. Roadmap fix**: Update `docs/features/roadmap.md` line 34 — Notifications status "Planned" to "Done"
- **B. Brand abstraction (#14)**: `BrandConfig` Zod schema in `@enterprise/contracts`, `BrandProvider` + `useBrand()` + `resolveBrand()` in `@enterprise/ui`, brand registry with default "enterprise" brand, `BrandLogo` + `BrandFooter` components, `generateBrandMetadata()` for dynamic Next.js metadata, layout.tsx migration
- **C. Backend decoupling (#16)**: `AuthPort`, `StoragePort`, `SessionPort` interfaces in `@enterprise/core/services/ports/`, Supabase reference adapters, `createBackendAdapters()` factory, auth-service migration from `SupabaseClient` to `AuthPort`, test rewrite to port mocks, middleware + Server Action updates, `.env.example` additions

### Out of Scope
- `DatabasePort` / `RealtimePort` abstractions (P1/P2 follow-ups per RFC #16)
- Runtime brand switching per user session or multi-tenant branding
- Visual brand editor UI
- Any changes to `@enterprise/db` Drizzle schemas or RLS policies
- Brand isolation package (#15) — separate change
- Deployment provider decoupling (#20) — separate change

## Capabilities

### New Capabilities
- `brand-config`: BrandConfig Zod schema, brand registry, resolution strategy, default "enterprise" brand
- `brand-provider`: BrandProvider context, useBrand() hook, BrandLogo/BrandFooter components, generateBrandMetadata()
- `backend-ports`: AuthPort, StoragePort, SessionPort interfaces in @enterprise/core
- `backend-adapters`: Supabase reference adapters, createBackendAdapters() factory, env-var-driven selection

### Modified Capabilities
- None — no existing `openspec/specs/` capabilities are affected (specs dir is empty)

## Approach

Three parallel tracks, sequenced by dependency:

1. **Track A (trivial)**: One-line roadmap edit. Ships in any PR as a drive-by fix.
2. **Track B (#14 — Brand)**: contracts schema -> ui/brand module (registry, resolve, context, provider) -> layout.tsx migration -> presentational components. ~800-1200 lines. Fits 1-2 PRs within 800-line budget.
3. **Track C (#16 — Decoupling)**: port interfaces -> Supabase adapters -> factory -> auth-service migration -> action/middleware updates -> test rewrite. ~1500-2200 lines. MUST split into 3 chained PRs.

Tracks B and C have **zero file overlap** and execute in parallel.

### PR Strategy (auto-forecast)

| PR | Track | Content | Est. Lines | Target |
|----|-------|---------|------------|--------|
| PR-B1 | B | Contracts schema + brand module + registry + resolve + provider + layout migration | ~600 | main |
| PR-B2 | B | BrandLogo + BrandFooter + package.json exports + E2E tests + roadmap fix (Track A) | ~400 | main |
| PR-C1 | C | Port interfaces + Supabase adapters + factory + exports | ~500 | main |
| PR-C2 | C | auth-service migration + action updates + middleware updates | ~600 | PR-C1 |
| PR-C3 | C | Test rewrite to port mocks + .env.example + migration docs | ~500 | PR-C2 |

Total: ~2600 lines across 5 PRs. All within 800-line review budget per PR. B-track and C-track run in parallel.

## Affected Areas

| Area | Impact | Description |
|------|--------|-------------|
| `packages/contracts/src/schemas/` | New | `brand.ts` — BrandConfig Zod schema + types |
| `packages/contracts/src/index.ts` | Modified | Barrel export for brand schemas |
| `packages/ui/src/brand/` | New | registry, resolve, context, provider, components |
| `packages/ui/package.json` | Modified | Add `./brand/*` subpath exports |
| `packages/ui/src/index.ts` | Modified | Barrel export brand module |
| `ui/app/layout.tsx` | Modified | Static metadata -> generateMetadata, ThemeProvider -> BrandProvider |
| `packages/core/src/services/ports/` | New | `auth-port.ts`, `storage-port.ts`, `session-port.ts` |
| `packages/core/src/services/adapters/` | New | `supabase-auth-adapter.ts`, `supabase-storage-adapter.ts`, `supabase-session-adapter.ts` |
| `packages/core/src/services/` | New | `backend-adapters.ts` factory |
| `packages/core/src/services/auth-service.ts` | Modified | 7 functions: SupabaseClient -> AuthPort first param |
| `packages/core/src/services/__tests__/auth-service.test.ts` | Modified | Full rewrite: SupabaseClient mocks -> AuthPort mocks |
| `ui/features/auth/actions.ts` | Modified | Inject adapters via createBackendAdapters() factory |
| `ui/middleware.ts` | Modified | SessionPort for token refresh (keep createMiddlewareClient for DB) |
| `docs/features/roadmap.md` | Modified | Line 34: Notifications "Planned" -> "Done" |
| `.env.example` | Modified | Add BRAND_SLUG, BACKEND_AUTH_PROVIDER, BACKEND_STORAGE_PROVIDER docs |

## Risks

| Risk | Likelihood | Mitigation |
|------|------------|------------|
| auth-service signature change breaks adopter forks | High | Document before/after diffs in migration guide. No runtime behavior change for default Supabase path |
| BrandProvider fails to render ThemeProvider (themeRef validation) | Medium | Startup validation in registry.ts catches invalid themeRef at boot, not render time |
| createBackendAdapters() module-level call fails in test envs missing env vars | Medium | Fast-fail is intentional. Document required test env setup |
| resolveBrand() called outside RSC context (headers() crash) | Medium | Type-level: resolveBrand() only exported from server-side module. Docs warn against client import |
| Chained PRs (C-track) cause merge conflicts between slices | Low | Each PR has autonomous scope. Rebase discipline between slices |

## Rollback Plan

- **Track A**: Revert single line in roadmap.md
- **Track B**: Remove `packages/ui/src/brand/` directory, revert layout.tsx to static metadata + ThemeProvider, remove brand schema from contracts. No DB changes involved
- **Track C**: Revert auth-service.ts signatures back to SupabaseClient, remove port/adapter files, revert actions.ts and middleware.ts. The port interfaces have no runtime consumers outside this change. No DB changes involved

Both tracks are fully reversible because neither touches database schemas or RLS policies.

## Dependencies

- Existing ThemeProvider and theme system must remain stable (brand wraps it)
- Existing payment-adapter-factory.ts pattern guides #16 factory design
- Node.js `next/headers` API for server-side brand resolution

## Success Criteria

- [ ] `pnpm typecheck` passes with zero errors across all packages
- [ ] `pnpm test` passes — auth-service tests use AuthPort mocks, zero @supabase/supabase-js imports in test files
- [ ] `pnpm lint` passes
- [ ] Default Supabase path works identically — no behavioral regression for adopters who change nothing
- [ ] `useBrand()` returns resolved BrandConfig in any client component under BrandProvider
- [ ] `resolveBrand()` correctly resolves "enterprise" brand from env/config in root layout
- [ ] layout.tsx renders with BrandProvider wrapping children, preserves font classNames and Toaster placement
- [ ] BrandLogo renders correct logo variant based on theme mode
- [ ] All 6 auth Server Actions use adapter injection pattern
- [ ] middleware.ts uses SessionPort for token refresh
- [ ] createBackendAdapters() returns Supabase adapters by default, respects env var overrides
- [ ] .env.example documents new optional variables with clear fallback behavior
- [ ] roadmap.md shows Notifications as "Done"
- [ ] All PRs under 800-line review budget
