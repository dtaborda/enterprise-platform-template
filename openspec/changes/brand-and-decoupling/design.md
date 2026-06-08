# Design: Brand Abstraction Layer + Backend Provider Decoupling

## Technical Approach

Two parallel, zero-overlap tracks extend the template's customization surface. Track B adds a brand identity layer in `@enterprise/ui` that wraps `ThemeProvider` and is driven by static `*.brand.ts` configs validated against a Zod schema in `@enterprise/contracts`. Track C introduces `AuthPort`, `StoragePort`, and `SessionPort` in `@enterprise/core/services/ports/` with Supabase reference adapters, following the existing `PaymentProviderPort` + `StripePaymentAdapter` pattern. Both tracks share the same port/adapter/factory architecture already proven by billing.

## Architecture Decisions

| # | Decision | Choice | Alternatives | Rationale |
|---|----------|--------|-------------|-----------|
| 1 | Brand module location | `@enterprise/ui/src/brand/` | New `@enterprise/brand` package | `@enterprise/ui` already owns `ThemeProvider`; brand is a neighbor. Package extraction is clean follow-up if scope grows. No new package for MVP. |
| 2 | BrandProvider component type | Client Component (`"use client"`) | Server Component | `ThemeProvider` uses `useState`; `BrandProvider` renders it internally → must be client. Resolution is server-side via `resolveBrand()` in layout. |
| 3 | Brand config storage | Static `*.brand.ts` files | Database-driven | Git history, PR review, Zod type safety free. DB-driven config is P2 follow-up. |
| 4 | Brand resolution priority | ENV → subdomain → path prefix → default | Any other order | ENV is most explicit (single-brand deploys), subdomain is canonical prod, path prefix is local dev fallback, default prevents 500s. |
| 5 | Auth/Storage factory return shape | `(client) => Adapter` functions | Fully-constructed adapter (billing pattern) | `SupabaseClient` is request-scoped (from `getServerClient()`). Can't capture at module level. Session adapter IS constructed eagerly since it creates its own internal client per call. |
| 6 | Service function migration | `SupabaseClient` → `AuthPort` as first param | Keep `SupabaseClient`, wrap internally | Moving provider logic into adapters makes services stable interface boundaries. Tests mock `AuthPort` (plain object), not Supabase SDK. |
| 7 | SessionPort return type | `NextResponse` (Next.js type) | Custom response wrapper | Middleware is a Next.js primitive. Custom abstraction adds complexity without benefit. Framework swap requires middleware rewrite anyway. |
| 8 | Middleware split dependency | `SessionPort` for refresh, `SupabaseClient` for DB query | Full decoupling (requires DatabasePort) | Bounded concession documented explicitly. `DatabasePort` is P1 follow-up. |

## Data Flow

### Brand Resolution (Track B)

```
Next.js Server (RSC)              Client
─────────────────────             ──────
layout.tsx
  │
  ├─ resolveBrand()               
  │   ├─ ENV BRAND_SLUG? → Map.get()
  │   ├─ headers().host → subdomain? → Map.get()
  │   ├─ headers().path → prefix? → Map.get()
  │   └─ getDefaultBrand()
  │
  ├─ generateBrandMetadata(brand) → <head>
  │
  └─ <BrandProvider brand={brand}>    ← serialized as prop
        │
        ├─ BrandContext.Provider       ← useBrand() reads here
        └─ <ThemeProvider defaultMode>  ← themeRef drives mode
              └─ {children}
```

### Auth Action Flow (Track C — post-migration)

```
Client                     Server Action                    Adapter
──────                     ─────────────                    ───────
signInAction(formData)
  │                        ├─ Zod validate
  │                        ├─ getServerClient() → client
  │                        ├─ authFactory(client) → AuthPort
  │                        ├─ signInWithPasswordService(auth, input)
  │                        │     └─ auth.signInWithPassword(input) ──→ SupabaseAuthAdapter
  │                        │                                            └─ client.auth.signInWithPassword()
  │                        └─ redirect(rolePath)
```

### Middleware Session Flow (Track C — post-migration)

```
Request → middleware.ts
            ├─ sessionPort.refreshSession(request) ──→ SupabaseSessionAdapter
            │                                            └─ updateSession(request, config)
            ├─ createMiddlewareClient(request)     ← DB query (kept until DatabasePort)
            │     └─ supabase.auth.getUser()
            │     └─ getUserRoleService(supabase, userId)
            └─ NextResponse (with refreshed cookies)
```

## File Changes

| File | Action | PR | Description |
|------|--------|-----|-------------|
| `packages/contracts/src/schemas/brand.ts` | Create | B1 | `brandConfigSchema` + all sub-schemas + type exports |
| `packages/contracts/src/index.ts` | Modify | B1 | Add brand schema + type exports to barrel |
| `packages/ui/src/brand/context.ts` | Create | B1 | `BrandContext` — `createContext<BrandContextValue \| null>(null)` |
| `packages/ui/src/brand/provider.tsx` | Create | B1 | `BrandProvider` (wraps ThemeProvider) + `useBrand()` hook |
| `packages/ui/src/brand/registry.ts` | Create | B1 | `buildRegistry()` — loads, validates, deduplicates brand configs |
| `packages/ui/src/brand/resolve.ts` | Create | B1 | `resolveBrand()` — async, server-only, priority chain lookup |
| `packages/ui/src/brand/brand-meta.ts` | Create | B1 | `generateBrandMetadata()` — returns Next.js `Metadata` from `BrandConfig` |
| `packages/ui/src/brands/index.ts` | Create | B1 | Barrel re-export of all `*.brand.ts` configs |
| `packages/ui/src/brands/enterprise.brand.ts` | Create | B1 | Default brand config (isDefault: true) |
| `packages/ui/package.json` | Modify | B1 | Add 6 subpath exports: `./brand/provider`, `./brand/context`, `./brand/resolve`, `./brand/brand-logo`, `./brand/brand-footer`, `./brand/brand-meta` |
| `ui/app/layout.tsx` | Modify | B1 | Static `metadata` → async `generateMetadata()`, `ThemeProvider` → `BrandProvider`, preserve fonts + Toaster |
| `packages/ui/src/brand/brand-logo.tsx` | Create | B2 | Light/dark logo switcher with text fallback |
| `packages/ui/src/brand/brand-footer.tsx` | Create | B2 | Legal links, social icons, optional "Powered by" |
| `packages/ui/src/index.ts` | Modify | B2 | Add brand exports: BrandProvider, useBrand, BrandLogo, BrandFooter, BrandContext |
| `packages/ui/src/brands/acme.brand.ts` | Create | B2 | Commented-out example brand for adopters |
| `packages/ui/src/brand/__tests__/registry.test.ts` | Create | B2 | Registry validation + duplicate slug tests |
| `packages/ui/src/brand/__tests__/resolve.test.ts` | Create | B2 | Resolution priority chain tests |
| `packages/ui/src/brand/__tests__/brand-logo.test.tsx` | Create | B2 | Logo variant + text fallback tests |
| `packages/contracts/src/__tests__/brand.test.ts` | Create | B2 | Schema validation edge cases |
| `ui/e2e/brand/brand.spec.ts` | Create | B2 | E2E: default brand renders, logo variants, metadata |
| `docs/features/roadmap.md` | Modify | B2 | Notifications #10 status: "Planned" → "Done" |
| `packages/core/src/services/ports/auth-port.ts` | Create | C1 | `AuthPort` interface — 7 methods matching auth-service functions |
| `packages/core/src/services/ports/storage-port.ts` | Create | C1 | `StoragePort` interface — upload, download, delete, signedUrl, publicUrl, listFiles |
| `packages/core/src/services/ports/session-port.ts` | Create | C1 | `SessionPort` interface — `refreshSession(request): Promise<NextResponse>` |
| `packages/core/src/services/adapters/supabase-auth-adapter.ts` | Create | C1 | Wraps `SupabaseClient.auth.*` + profiles table — 1:1 with current auth-service logic |
| `packages/core/src/services/adapters/supabase-storage-adapter.ts` | Create | C1 | Wraps `SupabaseClient.storage.*` — all 6 StoragePort methods |
| `packages/core/src/services/adapters/supabase-session-adapter.ts` | Create | C1 | Wraps existing `updateSession()` from middleware.ts |
| `packages/core/src/services/backend-adapters.ts` | Create | C1 | `createBackendAdapters()` — env-var driven factory, returns `{ auth, storage, session }` |
| `packages/core/src/services/auth-service.ts` | Modify | C2 | 7 function signatures: `SupabaseClient` → `AuthPort`. Bodies become thin delegations. `ServiceResult`, input/data types, `resolveRoleRedirectPath` unchanged. |
| `ui/features/auth/actions.ts` | Modify | C2 | Module-level `createBackendAdapters()`, per-call `authFactory(client)`. All 6 actions updated. |
| `ui/middleware.ts` | Modify | C2 | `updateSession()` → `sessionPort.refreshSession()`. Keep `createMiddlewareClient` for DB query. |
| `packages/core/src/services/__tests__/auth-service.test.ts` | Modify | C3 | Full rewrite: `createMockAuthPort()` replaces `createMockClient()`. No `@supabase/supabase-js` imports. |
| `packages/core/src/services/__tests__/supabase-auth-adapter.test.ts` | Create | C3 | Adapter-level tests that DO mock Supabase SDK |
| `packages/core/src/services/__tests__/supabase-storage-adapter.test.ts` | Create | C3 | Storage adapter mapping tests |
| `packages/core/src/services/__tests__/backend-adapters.test.ts` | Create | C3 | Factory env-var selection + error handling |
| `.env.example` | Modify | C3 | Add `BRAND_SLUG`, `BACKEND_AUTH_PROVIDER`, `BACKEND_STORAGE_PROVIDER` with docs |

## Interfaces / Contracts

### AuthPort (key signatures)

```typescript
interface AuthPort {
  signInWithPassword(input: SignInServiceInput): Promise<ServiceResult<SignInServiceData>>;
  signUp(input: SignUpServiceInput): Promise<ServiceResult<SignUpServiceData>>;
  signOut(): Promise<ServiceResult<null>>;
  getUser(): Promise<ServiceResult<PlatformUser | null>>;
  getUserRole(userId: string): Promise<ServiceResult<UserRoleServiceData>>;
  requestPasswordReset(input: PasswordResetServiceInput): Promise<ServiceResult<null>>;
  updatePassword(input: UpdatePasswordServiceInput): Promise<ServiceResult<null>>;
}
```

### createBackendAdapters return type

```typescript
function createBackendAdapters(): {
  auth: (client: SupabaseClient) => AuthPort;
  storage: (client: SupabaseClient) => StoragePort;
  session: SessionPort; // eager — creates own internal client per call
};
```

### BrandProvider wrapper chain (layout.tsx after migration)

```tsx
// ui/app/layout.tsx — key structural change
export async function generateMetadata() {
  const brand = await resolveBrand();
  return generateBrandMetadata(brand);
}

export default async function RootLayout({ children }) {
  const brand = await resolveBrand();
  return (
    <html lang="en" data-theme="dark" suppressHydrationWarning
          className={`${inter.variable} ${jetbrainsMono.variable} ${plusJakartaSans.variable} ${spaceGrotesk.variable}`}>
      <body className="min-h-screen bg-background font-sans antialiased">
        <BrandProvider brand={brand}>
          {children}
        </BrandProvider>
        <Toaster richColors position="top-right" />
      </body>
    </html>
  );
}
```

## Testing Strategy

| Layer | What to Test | Approach |
|-------|-------------|----------|
| **Unit — contracts** | `brandConfigSchema` validation (valid/invalid slugs, missing fields, nested errors) | Vitest, 9 cases per RFC |
| **Unit — registry** | `buildRegistry()` — valid config, duplicate slug, invalid field, missing default | Vitest, mock brand modules |
| **Unit — resolve** | Resolution priority (env > subdomain > path > default), invalid env throws | Vitest, mock `next/headers` + `process.env` |
| **Unit — BrandLogo** | Light/dark variant, text fallback, className passthrough, throw outside provider | Vitest + React Testing Library |
| **Unit — auth-service (post-migration)** | All 7 functions delegate to `AuthPort` mock — `createMockAuthPort()` with `vi.fn()` stubs | Vitest, zero Supabase imports |
| **Unit — SupabaseAuthAdapter** | SDK response → `ServiceResult` mapping (success, errors, edge cases like PGRST116) | Vitest, mock `SupabaseClient` |
| **Unit — SupabaseStorageAdapter** | All 6 methods: upload/download/delete/signedUrl/publicUrl/listFiles mapping | Vitest, mock `SupabaseClient.storage` |
| **Unit — backend-adapters factory** | Default returns Supabase, unknown provider throws, missing env throws | Vitest, env var manipulation |
| **E2E — brand** | Default brand renders (title, favicon, footer links), logo light/dark, `BRAND_SLUG` override | Playwright, `@critical` tag |
| **E2E — auth (implicit)** | Existing auth E2E suite passes unchanged — validates adapter equivalence | Playwright, no new tests needed |

### Port Mock Pattern (canonical)

```typescript
function createMockAuthPort(): AuthPort {
  return {
    signInWithPassword: vi.fn(),
    signUp: vi.fn(),
    signOut: vi.fn(),
    getUser: vi.fn(),
    getUserRole: vi.fn(),
    requestPasswordReset: vi.fn(),
    updatePassword: vi.fn(),
  };
}
```

## PR Delivery Plan

| PR | Track | Base | Content | Est. Lines | Isolated Build/Test |
|----|-------|------|---------|------------|---------------------|
| **PR-B1** | Brand | `main` | Contracts schema, brand module (registry, resolve, context, provider, brand-meta), enterprise.brand.ts, layout.tsx migration, package.json exports | ~600 | `pnpm typecheck && pnpm test` — brand unit tests + contracts tests pass. Layout renders with BrandProvider wrapping ThemeProvider. |
| **PR-B2** | Brand | PR-B1 | BrandLogo, BrandFooter, barrel exports, acme.brand.ts example, E2E tests, roadmap fix, .env.example BRAND_SLUG | ~400 | `pnpm typecheck && pnpm test && pnpm e2e` — brand E2E suite passes. |
| **PR-C1** | Decoupling | `main` | Port interfaces (auth, storage, session), Supabase adapters (3 files), backend-adapters.ts factory | ~500 | `pnpm typecheck && pnpm test` — factory tests + adapter tests pass. No existing code changed. |
| **PR-C2** | Decoupling | PR-C1 | auth-service.ts migration (7 fn signatures), auth actions.ts (adapter injection), middleware.ts (SessionPort) | ~600 | `pnpm typecheck && pnpm test && pnpm e2e` — all existing tests + E2E pass (Supabase default path). |
| **PR-C3** | Decoupling | PR-C2 | auth-service.test.ts rewrite to port mocks, adapter unit tests, factory tests, .env.example additions, AGENTS.md QA updates | ~500 | `pnpm typecheck && pnpm test` — zero @supabase/supabase-js imports in service tests. |

**Parallelism**: B-track and C-track run independently (zero file overlap). C-track is chained (C2 → C1, C3 → C2).

## Migration / Rollout

No data migration required. No feature flags needed. Both tracks are additive — no DB schema or RLS changes.

**Backward compatibility**: auth-service function signatures change (Track C). This is a source-level breaking change for adopter forks. Migration guide documents before/after diffs for all 7 functions and all 6 Server Actions.

**Rollback**: Both tracks fully reversible — remove new files, revert modified files. Neither touches database.

## Open Questions

- [x] All technical questions resolved during exploration and proposal phases
- [ ] None blocking — design is implementation-ready
