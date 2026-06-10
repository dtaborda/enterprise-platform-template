# Specs: brand-and-decoupling

> **Change**: brand-and-decoupling
> **Type**: New capabilities (openspec/specs/ is empty — full specs, not deltas)
> **Capabilities**: brand-config, brand-provider, backend-ports, backend-adapters

---

## Domain: brand-config

# Brand Config Specification

## Purpose

Define the data model and validation contract for a brand identity in the Enterprise Platform. `brandConfigSchema` in `@enterprise/contracts` is the single source of truth for what a brand is. Brand configs are static TypeScript files validated at startup — no database, no per-request overhead.

## Requirements

### Requirement: BrandConfig Schema Fields

`brandConfigSchema` MUST be a Zod object schema in `packages/contracts/src/schemas/brand.ts` with the following fields:

| Field | Type | Required | Constraint |
|-------|------|----------|------------|
| `slug` | `string` | Yes | Regex `/^[a-z0-9]+(?:-[a-z0-9]+)*$/`; min 1 |
| `name` | `string` | Yes | min 1 |
| `displayName` | `string` | Yes | min 1 |
| `description` | `string` | Yes | min 1 |
| `logo` | `{ light: LogoVariant, dark: LogoVariant }` | Yes | See brandLogoSchema |
| `favicon` | `string` | Yes | min 1 |
| `metadata` | `BrandMetadata` | Yes | See brandMetadataSchema |
| `legal` | `BrandLegal` | Yes | See brandLegalSchema |
| `social` | `BrandSocial` | No | optional |
| `themeRef` | `string` | Yes | min 1 |
| `features` | `Record<string, boolean>` | No | optional |
| `isDefault` | `boolean` | No | optional |

Sub-schemas MUST be exported: `brandLogoVariantSchema`, `brandLogoSchema`, `brandMetadataSchema`, `brandLegalSchema`, `brandSocialSchema`.

Type exports MUST be co-located: `BrandConfig`, `BrandLogoVariant`, `BrandLogo`, `BrandMetadata`, `BrandLegal`, `BrandSocial`.

#### Scenario: Valid full brand config passes schema

- GIVEN a brand config object with all required and all optional fields populated
- WHEN `brandConfigSchema.safeParse(config)` is called
- THEN result is `{ success: true, data: config }`

#### Scenario: Minimal valid config (required fields only)

- GIVEN a brand config with only required fields (no `social`, `features`, `isDefault`)
- WHEN `brandConfigSchema.safeParse(config)` is called
- THEN result is `{ success: true }` and optional fields are `undefined`

#### Scenario: Invalid slug with spaces or uppercase is rejected

- GIVEN `slug: "My Brand"` or `slug: "Enterprise"`
- WHEN `brandConfigSchema.safeParse(config)` is called
- THEN result is `{ success: false }` with issue path `["slug"]`

#### Scenario: Missing required nested field is rejected with path

- GIVEN `logo.light.alt: ""` (empty string)
- WHEN `brandConfigSchema.safeParse(config)` is called
- THEN result is `{ success: false }` with issue path `["logo", "light", "alt"]`

#### Scenario: features record rejects non-boolean value

- GIVEN `features: { showPoweredBy: "yes" }`
- WHEN `brandConfigSchema.safeParse(config)` is called
- THEN result is `{ success: false }` — `z.boolean()` rejects string

#### Scenario: social.twitter with invalid URL is rejected

- GIVEN `social: { twitter: "not-a-url" }`
- WHEN `brandConfigSchema.safeParse(config)` is called
- THEN result is `{ success: false }` with issue path `["social", "twitter"]`

### Requirement: Brand Registry Startup Validation

The registry (`packages/ui/src/brand/registry.ts`) MUST validate every brand config at module initialization using `brandConfigSchema.safeParse()`. It MUST throw before the server serves any request if any config fails.

Duplicate slugs MUST throw: `"[brand] Duplicate brand slug \"${slug}\" detected."`.

`getDefaultBrand()` MUST return the brand with `isDefault: true`, fall back to the `"enterprise"` slug, and throw if neither exists.

#### Scenario: Duplicate slug in registry throws at startup

- GIVEN two brand config files both with `slug: "enterprise"`
- WHEN the registry module is first imported
- THEN `buildRegistry()` throws with the duplicate slug in the error message
- AND the server does not start

#### Scenario: No registered brands throws on getDefaultBrand

- GIVEN no brand config files and no `isDefault` declared
- WHEN `getDefaultBrand()` is called
- THEN it throws with a message identifying the missing `"enterprise"` brand

#### Scenario: themeRef validated against existing theme JSONs

- GIVEN a brand config with `themeRef: "nonexistent-theme"`
- WHEN the registry is built
- THEN startup throws identifying the invalid `themeRef` before any request is served

### Requirement: Barrel Export in @enterprise/contracts

`packages/contracts/src/index.ts` MUST export all brand schemas and types. Consumers MUST be able to import `brandConfigSchema` and `BrandConfig` from `@enterprise/contracts`.

#### Scenario: Consumer imports BrandConfig from @enterprise/contracts

- GIVEN `import { brandConfigSchema } from "@enterprise/contracts"`
- WHEN TypeScript compiles the import
- THEN no type errors; `brandConfigSchema` is a `ZodObject`

---

## Domain: brand-provider

# Brand Provider Specification

## Purpose

Define the runtime API for brand context: `BrandProvider` (context seeder), `useBrand()` (client hook), `resolveBrand()` (server resolver), presentational components (`BrandLogo`, `BrandFooter`), and `generateBrandMetadata()` (metadata helper). These live in `packages/ui/src/brand/`.

## Requirements

### Requirement: resolveBrand() Resolution Strategy

`resolveBrand(): Promise<BrandConfig>` MUST resolve the active brand via a strict priority chain:

1. `BRAND_SLUG` env var — if set, MUST match a registered slug or throw with available slugs listed
2. Subdomain matching — first segment of `Host` header, only if `host.split(".").length > 2`
3. Path prefix matching — first segment of request pathname (skip if contains `.`)
4. Default brand — `getDefaultBrand()` from registry

On unrecognized subdomain or path prefix: MUST emit `console.warn` and fall through to default. MUST NOT throw.

`resolveBrand()` MUST be server-only (imports `next/headers`). MUST NOT be called in Client Components.

#### Scenario: BRAND_SLUG env var forces single brand

- GIVEN `BRAND_SLUG=enterprise` is set and the `"enterprise"` brand is registered
- WHEN `resolveBrand()` is called from any request context
- THEN returns the `"enterprise"` brand regardless of subdomain or path

#### Scenario: BRAND_SLUG env var with unknown slug throws

- GIVEN `BRAND_SLUG=unknown-brand` and no brand with that slug is registered
- WHEN `resolveBrand()` is called
- THEN throws with message containing `"unknown-brand"` and the list of available slugs

#### Scenario: Subdomain resolves to matching brand

- GIVEN `Host: acme.platform.com` and `"acme"` brand is registered
- WHEN `resolveBrand()` is called
- THEN returns the `"acme"` brand

#### Scenario: Unrecognized subdomain falls back to default

- GIVEN `Host: unknown.platform.com` and no `"unknown"` brand
- WHEN `resolveBrand()` is called
- THEN emits `console.warn` with the slug
- AND returns the default brand (no error page)

#### Scenario: Path prefix resolves to matching brand

- GIVEN request path `/acme/dashboard` and `"acme"` brand is registered
- WHEN `resolveBrand()` is called
- THEN returns the `"acme"` brand

#### Scenario: Static asset paths do not emit spurious brand warnings

- GIVEN request path `/favicon.ico`
- WHEN `resolveBrand()` evaluates path prefix
- THEN does NOT emit `console.warn` (segment contains `.`)
- AND falls through to default brand

### Requirement: BrandProvider and useBrand() Context

`BrandProvider` MUST be a `"use client"` component. It MUST:
- Accept `brand: BrandConfig` and `children: React.ReactNode` as props
- Seed `BrandContext` with `{ brand }`
- Render `ThemeProvider` internally, deriving `defaultMode` from `themeRef` (ends with `"light"` → `"light"`, otherwise `"dark"`)

`useBrand()` MUST return `BrandConfig` from `BrandContext`. MUST throw with a descriptive error if called outside a `BrandProvider`.

`BrandContext` MUST be `createContext<BrandContextValue | null>(null)`.

#### Scenario: useBrand() returns brand config inside provider

- GIVEN a component tree wrapped in `<BrandProvider brand={enterpriseBrand}>`
- WHEN a client component calls `useBrand()`
- THEN returns the `enterpriseBrand` config without errors

#### Scenario: useBrand() throws outside BrandProvider

- GIVEN a client component NOT wrapped in `BrandProvider`
- WHEN it calls `useBrand()`
- THEN throws with message containing `"<BrandProvider>"` and guidance

#### Scenario: BrandProvider renders ThemeProvider with derived mode

- GIVEN `brand.themeRef = "acme-light"`
- WHEN `BrandProvider` renders
- THEN `ThemeProvider` receives `defaultMode="light"`

### Requirement: Root Layout Integration

`ui/app/layout.tsx` MUST be migrated from static `export const metadata` to `export async function generateMetadata()`. It MUST call `resolveBrand()` and pass the result to `generateBrandMetadata()`. The layout MUST wrap children with `BrandProvider`. Font `className` on `<html>` and `Toaster` at body level MUST be preserved.

#### Scenario: generateMetadata uses resolved brand

- GIVEN the enterprise brand with `metadata.titleTemplate = "%s | Enterprise Platform"`
- WHEN Next.js calls `generateMetadata()` for the root layout
- THEN returns `{ title: { template: "%s | Enterprise Platform", default: "Enterprise Platform" }, ... }`

#### Scenario: BrandProvider wraps children at root layout level

- GIVEN `resolveBrand()` returns the enterprise brand
- WHEN the root layout renders
- THEN all pages have access to `BrandContext` via `useBrand()`

### Requirement: BrandLogo Component

`BrandLogo` MUST be a `"use client"` component that:
- Reads `useBrand().logo` and `useTheme().mode`
- Renders `<img>` with the `light` or `dark` variant `src` and `alt` based on mode
- Falls back to `<span>` with `brand.displayName` text when `src` is empty/falsy
- Forwards optional `className` prop to the root element

#### Scenario: Logo renders correct variant for active theme mode

- GIVEN mode is `"dark"` and `brand.logo.dark.src = "/logo-dark.svg"`
- WHEN `BrandLogo` renders
- THEN `<img src="/logo-dark.svg">` is rendered with `alt` from `logo.dark.alt`

#### Scenario: Empty src renders displayName text fallback

- GIVEN `brand.logo.light.src = ""`
- WHEN `BrandLogo` renders in light mode
- THEN a `<span>` containing `brand.displayName` is rendered — no `<img>` tag

### Requirement: BrandFooter Component

`BrandFooter` MUST be a `"use client"` component that:
- Renders `© {year} {brand.displayName}`
- Renders `<a>` links for `legal.privacyUrl` and `legal.termsUrl` — omits links when value is empty string
- Renders social links from `brand.social` when present
- Renders "Powered by Enterprise Platform" when `brand.features?.["showPoweredBy"] === true`

#### Scenario: Footer renders legal links when URLs are non-empty

- GIVEN `brand.legal.privacyUrl = "https://example.com/privacy"`
- WHEN `BrandFooter` renders
- THEN `<a href="https://example.com/privacy">Privacy Policy</a>` is present in the DOM

#### Scenario: Footer omits legal links when URLs are empty string

- GIVEN `brand.legal.privacyUrl = ""`
- WHEN `BrandFooter` renders
- THEN no `<a>` element with `href=""` is rendered for privacy

### Requirement: generateBrandMetadata() Helper

`generateBrandMetadata(brand: BrandConfig): Metadata` MUST return a Next.js `Metadata` object with:
- `title.template` = `brand.metadata.titleTemplate`
- `title.default` = `brand.metadata.defaultTitle`
- `description` = `brand.metadata.description`
- `icons.icon` = `brand.favicon`
- `openGraph.images` = `[brand.metadata.ogImage]` (empty array if `ogImage` is falsy)

#### Scenario: generateBrandMetadata maps all brand metadata fields

- GIVEN a valid `BrandConfig` with all metadata fields populated
- WHEN `generateBrandMetadata(brand)` is called
- THEN returns a `Metadata` object with all fields mapped correctly

### Requirement: Subpath Exports in packages/ui

`packages/ui/package.json` MUST include subpath exports for all brand modules. `packages/ui/src/index.ts` MUST barrel-export `BrandProvider`, `useBrand`, `BrandLogo`, `BrandFooter`, `BrandContext`.

#### Scenario: Consumer imports BrandProvider from subpath

- GIVEN `import { BrandProvider } from "@enterprise/ui/brand/provider"`
- WHEN TypeScript resolves the import
- THEN no type errors; `BrandProvider` is a React component

---

## Domain: backend-ports

# Backend Ports Specification

## Purpose

Define the three provider-agnostic port interfaces in `packages/core/src/services/ports/`: `AuthPort`, `StoragePort`, `SessionPort`. These are plain TypeScript interfaces — no abstract classes, no SDK imports. Any object satisfying the interface is a valid adapter.

## Requirements

### Requirement: AuthPort Interface

`AuthPort` MUST be a plain TypeScript interface at `packages/core/src/services/ports/auth-port.ts` with these 7 methods:

| Method | Signature | Return |
|--------|-----------|--------|
| `signInWithPassword` | `(input: SignInServiceInput)` | `Promise<ServiceResult<SignInServiceData>>` |
| `signUp` | `(input: SignUpServiceInput)` | `Promise<ServiceResult<SignUpServiceData>>` |
| `signOut` | `()` | `Promise<ServiceResult<null>>` |
| `getUser` | `()` | `Promise<ServiceResult<PlatformUser \| null>>` |
| `getUserRole` | `(userId: string)` | `Promise<ServiceResult<UserRoleServiceData>>` |
| `requestPasswordReset` | `(input: PasswordResetServiceInput)` | `Promise<ServiceResult<null>>` |
| `updatePassword` | `(input: UpdatePasswordServiceInput)` | `Promise<ServiceResult<null>>` |

`AuthPort` MUST NOT import any SDK (`@supabase/supabase-js`, `firebase`, etc.). All types MUST come from `@enterprise/contracts` or `../auth-service`.

Adapters MUST return `ServiceResult` (never throw). On failure: `{ success: false, error: string, code: string }`.

#### Scenario: AuthPort mock satisfies the interface without SDK imports

- GIVEN a test file that creates `const mock: AuthPort = { signInWithPassword: vi.fn(), ... }`
- WHEN TypeScript compiles the file
- THEN no errors — no `@supabase/supabase-js` import required
- AND the mock can be passed to any service accepting `AuthPort`

#### Scenario: getUser returns null for anonymous visitor (not an error)

- GIVEN an `AuthPort` implementation where no session exists
- WHEN `getUser()` is called
- THEN returns `{ success: true, data: null }` — NOT `{ success: false }`

### Requirement: StoragePort Interface

`StoragePort` MUST be a plain TypeScript interface at `packages/core/src/services/ports/storage-port.ts` with 6 methods:

| Method | Key Parameters | Return |
|--------|---------------|--------|
| `upload` | `bucket, path, file: Blob\|File\|ArrayBuffer, options?` | `Promise<ServiceResult<StorageUploadResult>>` |
| `download` | `bucket, path` | `Promise<ServiceResult<Blob>>` |
| `delete` | `bucket, paths: string[]` | `Promise<ServiceResult<null>>` |
| `getSignedUrl` | `bucket, path, expiresIn: number` | `Promise<ServiceResult<StorageSignedUrlResult>>` |
| `getPublicUrl` | `bucket, path` | `Promise<ServiceResult<StoragePublicUrlResult>>` |
| `listFiles` | `bucket, prefix?, limit?, offset?` | `Promise<ServiceResult<StorageFileEntry[]>>` |

Supporting types MUST be exported: `StorageUploadOptions`, `StorageUploadResult`, `StorageSignedUrlResult`, `StoragePublicUrlResult`, `StorageFileEntry`.

#### Scenario: StoragePort mock satisfies interface without SDK imports

- GIVEN `const mock: StoragePort = { upload: vi.fn(), download: vi.fn(), ... }`
- WHEN TypeScript compiles
- THEN no errors — no `@supabase/supabase-js` needed

#### Scenario: delete accepts multiple paths

- GIVEN `paths: ["avatars/user-1.webp", "avatars/user-2.webp"]`
- WHEN `storage.delete(bucket, paths)` is called
- THEN both paths are removed in a single operation

### Requirement: SessionPort Interface

`SessionPort` MUST be a plain TypeScript interface at `packages/core/src/services/ports/session-port.ts` with a single method:

`refreshSession(request: NextRequest): Promise<NextResponse>`

`SessionPort` is intentionally Next.js-scoped. The method MUST refresh the session cookie and return a `NextResponse` with updated `Set-Cookie` headers. It MUST return a pass-through response when no session exists.

#### Scenario: refreshSession returns NextResponse with refreshed cookies

- GIVEN an authenticated request with a valid but near-expiry session cookie
- WHEN `sessionPort.refreshSession(request)` is called
- THEN returns a `NextResponse` with updated `Set-Cookie` headers containing the refreshed token

#### Scenario: refreshSession returns pass-through for anonymous request

- GIVEN a request with no session cookie
- WHEN `sessionPort.refreshSession(request)` is called
- THEN returns a `NextResponse` without modifying cookies (no error thrown)

### Requirement: Ports Exported from @enterprise/core Public API

All three port interfaces MUST be exported from the `@enterprise/core` public API (subpath or barrel). Consumers MUST be able to import `AuthPort`, `StoragePort`, `SessionPort` from `@enterprise/core/services`.

#### Scenario: Consumer imports AuthPort from @enterprise/core/services

- GIVEN `import type { AuthPort } from "@enterprise/core/services"`
- WHEN TypeScript resolves the import
- THEN no errors; `AuthPort` is a TypeScript interface with 7 methods

---

## Domain: backend-adapters

# Backend Adapters Specification

## Purpose

Define the Supabase reference adapter implementations, the `createBackendAdapters()` factory, the auth-service migration contract, middleware and Server Action wiring, and the port-mock test pattern.

## Requirements

### Requirement: SupabaseAuthAdapter Implements AuthPort

`SupabaseAuthAdapter` MUST be a class in `packages/core/src/services/adapters/supabase-auth-adapter.ts` implementing `AuthPort`. Constructor: `constructor(private readonly client: SupabaseClient)`.

Each method MUST map 1:1 to the pre-refactor `auth-service.ts` logic with identical `ServiceResult` error codes:

| Method | Error codes |
|--------|-------------|
| `signInWithPassword` | `INVALID_CREDENTIALS`, `USER_NOT_FOUND`, `ROLE_LOOKUP_FAILED` |
| `signUp` | `SIGN_UP_FAILED`, `USER_NOT_CREATED` |
| `signOut` | `SIGN_OUT_FAILED` |
| `getUser` | `AUTH_USER_LOOKUP_FAILED` |
| `getUserRole` | `ROLE_LOOKUP_FAILED`; PGRST116 (row not found) MUST return `{ role: "guest" }`, not an error |
| `requestPasswordReset` | `PASSWORD_RESET_REQUEST_FAILED` |
| `updatePassword` | `PASSWORD_UPDATE_FAILED` |

#### Scenario: SupabaseAuthAdapter.signInWithPassword maps Supabase error to ServiceResult

- GIVEN `client.auth.signInWithPassword()` returns an error
- WHEN `adapter.signInWithPassword(input)` is called
- THEN returns `{ success: false, error: "Invalid credentials", code: "INVALID_CREDENTIALS" }`
- AND does not throw

#### Scenario: getUserRole ignores PGRST116 and defaults to guest

- GIVEN `client.from("profiles").select("role")` returns `error.code = "PGRST116"` (no row)
- WHEN `adapter.getUserRole(userId)` is called
- THEN returns `{ success: true, data: { role: "guest" } }`

### Requirement: SupabaseStorageAdapter Implements StoragePort

`SupabaseStorageAdapter` MUST be a class implementing `StoragePort`. Constructor: `constructor(private readonly client: SupabaseClient)`. It MUST use `STORAGE_BUCKETS` and `STORAGE_PATHS` constants as naming conventions (not embedded in the adapter interface). `getPublicUrl` MUST always return `{ success: true }` — Supabase never errors on public URL construction.

#### Scenario: upload wraps Supabase storage upload

- GIVEN `client.storage.from(bucket).upload(path, file)` succeeds
- WHEN `adapter.upload(bucket, path, file)` is called
- THEN returns `{ success: true, data: { path, fullPath } }`

#### Scenario: getPublicUrl always succeeds

- GIVEN any bucket and path
- WHEN `adapter.getPublicUrl(bucket, path)` is called
- THEN returns `{ success: true, data: { publicUrl: "..." } }` — no error possible

### Requirement: SupabaseSessionAdapter Implements SessionPort

`SupabaseSessionAdapter` MUST be a class implementing `SessionPort`. Constructor: `constructor(supabaseUrl: string, supabaseAnonKey: string)`. It MUST delegate `refreshSession()` to the existing `updateSession()` function from `packages/core/src/supabase/middleware.ts`. No new logic is introduced.

#### Scenario: refreshSession delegates to updateSession

- GIVEN a valid `NextRequest` with session cookies
- WHEN `adapter.refreshSession(request)` is called
- THEN calls `updateSession(request, { supabaseUrl, supabaseAnonKey })`
- AND returns the resulting `NextResponse`

### Requirement: createBackendAdapters() Factory

`createBackendAdapters()` MUST be at `packages/core/src/services/backend-adapters.ts`. Return type:

```
{
  auth: (client: SupabaseClient) => AuthPort;
  storage: (client: SupabaseClient) => StoragePort;
  session: SessionPort;
}
```

Selection env vars:
- `BACKEND_AUTH_PROVIDER`: `"supabase"` (default) | `"custom"` (throws with guidance)
- `BACKEND_STORAGE_PROVIDER`: `"supabase"` (default) | `"custom"` (throws with guidance)

Session adapter: always `SupabaseSessionAdapter`. Requires `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY` — MUST throw if missing.

`auth` and `storage` MUST be factory functions `(client) => Adapter` (NOT fully-constructed instances) because `SupabaseClient` is request-scoped.

#### Scenario: Default factory (no env vars) returns Supabase adapters

- GIVEN no `BACKEND_AUTH_PROVIDER` or `BACKEND_STORAGE_PROVIDER` set
- WHEN `createBackendAdapters()` is called
- THEN returns `{ auth: fn, storage: fn, session: SupabaseSessionAdapter }`
- AND `auth(client)` returns a `SupabaseAuthAdapter`

#### Scenario: Unknown BACKEND_AUTH_PROVIDER throws at call time

- GIVEN `BACKEND_AUTH_PROVIDER=firebase` (unsupported in MVP)
- WHEN `createBackendAdapters()` is called
- THEN throws with message containing `"firebase"` and `"Supported values: \"supabase\""`

#### Scenario: Missing Supabase URL throws descriptive error

- GIVEN `NEXT_PUBLIC_SUPABASE_URL` is not set
- WHEN `createBackendAdapters()` is called
- THEN throws `"Missing NEXT_PUBLIC_SUPABASE_URL or NEXT_PUBLIC_SUPABASE_ANON_KEY"`

### Requirement: auth-service.ts Migration (7 Function Signatures)

All 7 functions in `packages/core/src/services/auth-service.ts` MUST change their first parameter from `SupabaseClient` to `AuthPort`. Function bodies become thin delegations to the adapter:

| Function | Before | After |
|----------|--------|-------|
| `signInWithPasswordService` | `(client: SupabaseClient, input)` | `(auth: AuthPort, input)` |
| `signUpService` | `(client: SupabaseClient, input)` | `(auth: AuthPort, input)` |
| `signOutService` | `(client: SupabaseClient)` | `(auth: AuthPort)` |
| `getCurrentPlatformUserService` | `(client: SupabaseClient)` | `(auth: AuthPort)` |
| `getUserRoleService` | `(client: SupabaseClient, userId)` | `(auth: AuthPort, userId)` |
| `requestPasswordResetService` | `(client: SupabaseClient, input)` | `(auth: AuthPort, input)` |
| `updatePasswordService` | `(client: SupabaseClient, input)` | `(auth: AuthPort, input)` |

Service bodies MUST delegate to the adapter (e.g., `return auth.signInWithPassword(input)`). No Supabase SDK calls remain in service functions.

#### Scenario: signInWithPasswordService delegates to AuthPort

- GIVEN `auth.signInWithPassword` is a `vi.fn()` returning `{ success: true, data: { role: "admin" } }`
- WHEN `signInWithPasswordService(auth, input)` is called
- THEN calls `auth.signInWithPassword(input)` exactly once
- AND returns `{ success: true, data: { role: "admin" } }`

#### Scenario: No @supabase/supabase-js imports remain in service tests

- GIVEN the rewritten `auth-service.test.ts`
- WHEN linting checks imports
- THEN no `@supabase/supabase-js` import exists in the test file

### Requirement: Middleware Migration to SessionPort

`ui/middleware.ts` MUST be updated to:
1. Import `createBackendAdapters` from `@enterprise/core/services/backend-adapters`
2. Call `createBackendAdapters()` at module level: `const { session: sessionPort } = createBackendAdapters()`
3. Replace `updateSession(request, config)` with `sessionPort.refreshSession(request)`
4. RETAIN `createMiddlewareClient` import for role resolution (DB query — not yet covered by a port)
5. Include a comment: `// Role resolution still uses SupabaseClient for DB query. Removed when DatabasePort lands.`

#### Scenario: Middleware uses SessionPort for session refresh

- GIVEN `sessionPort.refreshSession` is a `vi.fn()` returning a `NextResponse`
- WHEN `middleware(request)` is called
- THEN `sessionPort.refreshSession(request)` is called before route guards
- AND the existing role-based redirect logic remains functional

### Requirement: Server Action Adapter Injection

All 6 auth Server Actions in `ui/features/auth/actions.ts` MUST inject the adapter:
1. Call `createBackendAdapters()` at module level: `const { auth: authFactory } = createBackendAdapters()`
2. Per-request: `const client = await getServerClient(); const auth = authFactory(client)`
3. Pass `auth` (not `client`) to each service function

Actions covered: `signInAction`, the `signIn` helper, `signUpAction`, `signOutAction`, `forgotPasswordAction`, `updatePasswordAction`.

#### Scenario: signInAction uses injected AuthPort

- GIVEN `authFactory` returns a mock `AuthPort`
- WHEN `signInAction(input)` is called
- THEN calls `signInWithPasswordService(auth, input)` with the mock port — NOT with `SupabaseClient`

### Requirement: Port-Mock Test Pattern

The canonical port-mock helpers MUST be defined in the test files. No `@supabase/supabase-js` imports in service test files after migration.

`createMockAuthPort()` returns an object with all 7 `AuthPort` methods as `vi.fn()`.
`createMockStoragePort()` returns an object with all 6 `StoragePort` methods as `vi.fn()`.

#### Scenario: createMockAuthPort used in auth-service tests

- GIVEN `const auth = createMockAuthPort()`
- WHEN `auth.signInWithPassword.mockResolvedValue({ success: true, data: { role: "admin" } })`
- THEN `signInWithPasswordService(auth, input)` returns `{ success: true, data: { role: "admin" } }`
- AND no Supabase SDK is imported in the test file

---

## Roadmap Fix

### Requirement: Notifications Marked Done in Roadmap

`docs/features/roadmap.md` MUST have Notifications (#10) status changed from `"Planned"` to `"Done"`.

#### Scenario: Roadmap reflects Notifications as Done

- GIVEN the updated `roadmap.md`
- WHEN the file is read
- THEN the row for feature #10 (Notifications) shows status `"Done"`
