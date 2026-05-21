---
title: "Backend provider decoupling PRD"
description: "Introduces port/adapter interfaces in @enterprise/core so the template can work with different backend providers (Supabase, Firebase, custom PostgreSQL, etc.) without rewriting business logic."
owner: "Engineering"
lastUpdated: "2026-05-11"
---

# Backend provider decoupling PRD

## Purpose

Define implementation-ready product requirements for introducing a port/adapter abstraction layer in `@enterprise/core` that decouples the template's business logic from Supabase-specific APIs. The goal is to allow template adopters to swap or extend backend providers (Auth, Storage, Session/Middleware) without modifying service logic, changing tests, or rewriting features. Supabase remains the reference implementation and the default; decoupling is additive, not a migration.

## Scope

- Included: `AuthPort` interface (sign-in, sign-up, sign-out, getUser, password reset, updateUser), `StoragePort` interface (upload, download, delete, getSignedUrl, listFiles), `SessionPort` interface (middleware-level cookie session management), Supabase reference adapters for each port, a `createBackendAdapters()` provider factory pattern, env-var-driven adapter selection, and a migration strategy for existing function-based services.
- Excluded: `DatabasePort` abstraction (the PostgREST / Drizzle query layer — this is a P1 follow-up requiring deeper schema coupling analysis), `RealtimePort` abstraction (P2, only relevant for Realtime features), any UI changes, any changes to `@enterprise/contracts` schemas, billing adapter (already covered by `BillingPort` in the billing-and-plans feature), and multi-provider runtime fan-out.

---

## Problem

`@enterprise/core` is structurally coupled to Supabase at every layer: `SupabaseClient` is threaded through every service function, auth flows call `client.auth.*` directly, storage uses Supabase Storage APIs, and middleware imports `@supabase/ssr` unconditionally. This means:

1. **Template adopters who want to use Firebase, Clerk, Auth0, or a custom auth provider** must fork and gut the service layer — a high-effort, error-prone operation that eliminates future template upgrades.
2. **Adopters with existing PostgreSQL backends** (not Supabase) cannot use the template without rewriting every service that touches the database or auth.
3. **Testing the service layer** requires mocking Supabase internals, making tests brittle and provider-specific. Tests should prove business logic, not Supabase SDK behavior.
4. **The billing feature already solved this problem** with `BillingPort` / `createPaymentAdapter()`. The pattern is proven, idiomatic, and consistent with the template's existing conventions — it simply has not been applied to auth and storage yet.

The current state forces a false choice: use Supabase everywhere, or abandon the template entirely.

## Users and stakeholders

| Role | Need |
|------|------|
| Template adopter (default path) | Zero breaking changes — Supabase adapter is the default; existing code continues to work without modification |
| Template adopter (custom auth) | A documented `AuthPort` interface and factory they can implement to plug in Firebase Auth, Clerk, Auth0, or a custom JWT service |
| Template adopter (custom storage) | A documented `StoragePort` interface they can implement to point storage at S3, GCS, Cloudflare R2, or a local filesystem |
| Template adopter (testing) | Services that accept port interfaces instead of `SupabaseClient`, enabling fast, provider-agnostic unit tests with simple mock objects |
| Platform engineering | A consistent, bilateral pattern (port + adapter + factory) applied uniformly to Auth and Storage so the template is architecturally coherent |

## Goals

- Introduce `AuthPort`, `StoragePort`, and `SessionPort` interfaces in `packages/core/src/services/ports/` following the exact same convention as `InvitationEmailPort`.
- Ship Supabase reference adapters for each port that preserve current behavior exactly — no behavior change for adopters using the default path.
- Implement a `createBackendAdapters()` factory that selects adapters based on env vars, NOT `NODE_ENV`.
- Migrate `auth-service.ts` to accept `AuthPort` instead of `SupabaseClient`. Expose a Supabase adapter that wraps `client.auth.*` calls.
- Migrate `storage-paths.ts` usage to a `StoragePort` interface so storage operations are injectable.
- Extract middleware session management into a `SessionPort` so `middleware.ts` can delegate to adapters rather than importing `@supabase/ssr` unconditionally.
- Ensure all existing unit tests and E2E tests pass with zero changes when using the Supabase adapter.

---

## MVP scope

### Core capabilities

**Port interfaces** — defined in `packages/core/src/services/ports/`:

- `AuthPort` — covers `signInWithPassword`, `signUp`, `signOut`, `getUser`, `requestPasswordReset`, `updatePassword`. Returns `ServiceResult<T>` from `auth-service.ts` — same discriminated union the services already use.
- `StoragePort` — covers `upload`, `download`, `delete`, `getSignedUrl`, `getPublicUrl`, `listFiles`. Operates on typed bucket/path tuples derived from `storage-paths.ts` constants.
- `SessionPort` — covers `refreshSession(request, response)` for use in Next.js middleware. Returns a `NextResponse` with refreshed cookies. Replaces the direct `@supabase/ssr` dependency in `middleware.ts`.

**Supabase reference adapters** — defined in `packages/core/src/services/adapters/`:

- `SupabaseAuthAdapter` — wraps `client.auth.*` calls from `auth-service.ts`. Constructed with a `SupabaseClient`. This IS the current `auth-service.ts` logic, re-expressed as an adapter class.
- `SupabaseStorageAdapter` — wraps Supabase Storage API calls. Uses `STORAGE_BUCKETS` and `STORAGE_PATHS` constants from `storage-paths.ts` internally.
- `SupabaseSessionAdapter` — wraps `updateSession()` from `middleware.ts`. Constructed with Supabase URL and anon key.

**Provider factory** — `createBackendAdapters()` in `packages/core/src/services/backend-adapters.ts`:

- Returns `{ auth: AuthPort, storage: StoragePort, session: SessionPort }`.
- Reads `BACKEND_AUTH_PROVIDER`, `BACKEND_STORAGE_PROVIDER` env vars.
- Defaults to `supabase` for all ports when env vars are absent.
- Supabase factory path reads `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY` — same env vars already in use, no new variables required for the default path.

**Service migration** — existing function-based services are updated to accept port interfaces:

- `auth-service.ts` functions that currently accept `SupabaseClient` are updated to accept `AuthPort`. The Supabase adapter is injected by the factory at the action layer.
- Storage-touching services accept `StoragePort` instead of `SupabaseClient` for storage operations. They may still accept `SupabaseClient` for DB operations (the Database port is P1; this change only decouples the storage concern).
- `middleware.ts` `updateSession()` delegates to `SessionPort.refreshSession()` instead of directly calling `@supabase/ssr`.

**Consistency with billing pattern** — the `PaymentProviderPort` in billing is the reference. This feature applies the same pattern (port interface → adapter class → factory function → env-var selection) to auth and storage. Adopters who have already learned the billing adapter pattern have zero new concepts to learn.

### Out of scope (MVP)

- `DatabasePort` abstraction for PostgREST / Drizzle queries. This requires analysis of schema coupling and RLS delegation — P1 follow-up.
- `RealtimePort` for subscription channels. Only relevant when Realtime features are implemented — P2.
- Any UI changes or new pages. This is pure infrastructure.
- Multi-provider fan-out (e.g., writing to both Supabase Storage and S3 simultaneously). Single active provider per service.
- Automatic migration tooling for adopters. The migration guide (docs) is sufficient for MVP.
- Firebase, Clerk, or Auth0 adapter implementations. The template ships the Supabase reference adapter; community adapters are documented as an extension point.
- Runtime hot-swap of providers without restart. Provider selection is resolved at startup from env vars.

---

## User stories and acceptance criteria (from the template ADOPTER perspective)

### US-1: Default path is zero-change

**As** a template adopter using Supabase, **I want** the decoupling changes to be completely transparent so that my existing application continues to work without any code changes on my side.

Acceptance criteria:
1. After the port/adapter refactor is merged, `pnpm typecheck` passes with no new errors on a project that has not modified any service files.
2. All existing unit tests in `packages/core/src/services/__tests__/` pass without modification.
3. All existing E2E tests in `ui/e2e/` pass without modification.
4. The `createBackendAdapters()` factory returns Supabase adapters by default when `BACKEND_AUTH_PROVIDER` and `BACKEND_STORAGE_PROVIDER` are not set.
5. No new required environment variables are introduced. The Supabase adapter continues to use `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY`.

### US-2: Adopter swaps auth provider via env var

**As** a template adopter who wants to use a custom auth provider (e.g., Clerk or Firebase Auth), **I want** to implement `AuthPort` and register my adapter via an env var so I can replace Supabase Auth without touching any service or action files.

Acceptance criteria:
1. `AuthPort` is a documented TypeScript interface exported from `@enterprise/core/services`.
2. The interface covers: `signInWithPassword`, `signUp`, `signOut`, `getUser`, `requestPasswordReset`, `updatePassword` — all returning `ServiceResult<T>`.
3. An adopter can set `BACKEND_AUTH_PROVIDER=custom` and provide a custom adapter path in `createBackendAdapters()` without modifying any service file.
4. Auth-related Server Actions (`signInAction`, `signUpAction`, `signOutAction`, `requestPasswordResetAction`, `updatePasswordAction`) continue to work correctly via the injected adapter.
5. The Supabase reference adapter (`SupabaseAuthAdapter`) is fully documented in the developer guide as the canonical example of how to implement `AuthPort`.

### US-3: Adopter swaps storage provider via env var

**As** a template adopter who wants to use S3 or Cloudflare R2 instead of Supabase Storage, **I want** to implement `StoragePort` and register my adapter via an env var so I can replace storage without changing any business logic.

Acceptance criteria:
1. `StoragePort` is a documented TypeScript interface exported from `@enterprise/core/services`.
2. The interface covers: `upload`, `download`, `delete`, `getSignedUrl`, `getPublicUrl`, `listFiles`.
3. `upload` accepts a `Blob | File | ArrayBuffer`, a bucket name, a path string, and optional content-type metadata.
4. `getSignedUrl` accepts a bucket name, a path string, and an expiry in seconds.
5. Setting `BACKEND_STORAGE_PROVIDER=custom` routes all storage operations through the custom adapter without any change to services or Server Actions.
6. The `STORAGE_BUCKETS` and `STORAGE_PATHS` constants remain usable by any adapter as naming conventions — they are not Supabase-specific.

### US-4: Adopter swaps session/middleware provider

**As** a template adopter who uses a non-Supabase auth system, **I want** the Next.js middleware to delegate session refresh to an injected `SessionPort` so I can replace Supabase SSR cookie handling with my own session logic.

Acceptance criteria:
1. `SessionPort` is a documented TypeScript interface with a single `refreshSession(request: NextRequest): Promise<NextResponse>` method.
2. `middleware.ts` imports `SessionPort` and calls `sessionPort.refreshSession(request)` — it does not import `@supabase/ssr` directly.
3. `SupabaseSessionAdapter` wraps the existing `updateSession()` logic and is the default.
4. An adopter can provide a custom `SessionPort` implementation to handle cookie-based sessions for their own auth provider.
5. The Next.js middleware file (`ui/middleware.ts`) requires no changes to swap the session adapter — it reads the adapter from the factory.

### US-5: Adopter writes provider-agnostic unit tests

**As** a template adopter writing unit tests for a custom service, **I want** to mock `AuthPort` and `StoragePort` with simple objects instead of mocking the Supabase client internals so my tests are stable and fast.

Acceptance criteria:
1. `AuthPort` and `StoragePort` are plain TypeScript interfaces — no abstract classes, no SDK dependencies. Any object satisfying the interface is a valid adapter.
2. A test can construct a mock auth adapter with `vi.fn()` stubs without importing `@supabase/supabase-js`.
3. The `packages/core/src/services/__tests__/` directory includes at least one test file demonstrating port-based mocking as the canonical test pattern.
4. Existing Supabase-mocked tests are updated to use port mocks, and the test suite passes.

### US-6: Adopter reads migration guide

**As** a template adopter who already has a running Supabase-based project and wants to adopt the port pattern, **I want** a step-by-step migration guide so I can understand what changed and what I need to update in my fork.

Acceptance criteria:
1. A migration guide exists in `docs/developer-guide/` explaining: (a) what changed in each service, (b) how to inject adapters via the factory, (c) how to write a custom adapter, and (d) how to update existing tests to use port mocks.
2. The guide references the billing `BillingPort` / `createPaymentAdapter()` pattern as a prior art example.
3. The guide includes a before/after code diff for at least one service function (`signInWithPasswordService` is the canonical example).
4. The guide documents every new env var and its accepted values.

---

## Success metrics

- Zero breaking changes for existing Supabase adopters: `pnpm typecheck`, `pnpm test`, and `pnpm e2e` all pass without modification after the refactor is merged.
- Test isolation quality: the `@enterprise/core` test suite no longer requires `@supabase/supabase-js` imports in any test file — all service tests mock via port interfaces.
- Interface coverage: `AuthPort`, `StoragePort`, and `SessionPort` each have 100% operation coverage by their Supabase reference adapters (no unimplemented methods).
- Developer friction: an adopter can implement a custom `AuthPort` and have it running in under 2 hours, measured by internal dry-run with a Firebase Auth prototype.
- Pattern consistency: the `createBackendAdapters()` factory follows the same factory shape as `createPaymentAdapter()` from billing — verified by code review checklist.

## Risks

| Risk | Mitigation |
|------|------------|
| Services that accept both `AuthPort` and `SupabaseClient` (for DB) have a split dependency that confuses adopters | Keep DB operations using `SupabaseClient` explicitly until `DatabasePort` is introduced (P1 follow-up). Document this split clearly in the migration guide and in code comments. |
| Port interfaces diverge from Supabase capabilities, making the Supabase adapter impossible to implement cleanly | Design port methods around the LOWEST COMMON DENOMINATOR of auth/storage providers. Methods that are Supabase-only (e.g., Magic Link) are excluded from `AuthPort` MVP scope and documented as extension points. |
| Adopters bypass the port and import `SupabaseClient` directly in new services (defeating the pattern) | The `packages/core/AGENTS.md` QA checklist is updated to include: "New services accept port interfaces, not `SupabaseClient` directly (after decoupling is merged)". Code review enforces this. |
| The `createBackendAdapters()` factory creates Supabase clients eagerly at startup, causing failures in non-Supabase environments | The factory is lazy: Supabase clients are only constructed when `BACKEND_AUTH_PROVIDER=supabase` (the default). Custom adapter paths never touch Supabase env vars. |
| SessionPort abstraction is thin enough to be a leaky abstraction (Next.js middleware is inherently Next.js-specific) | `SessionPort` is scoped to cookie-based session refresh — it does NOT abstract Next.js primitives. The interface returns `NextResponse`, which is intentionally Next.js-typed. Adopters who leave Next.js must re-implement middleware anyway. |
| Renaming service signatures breaks existing Server Actions in adopter forks | The Supabase adapter is injected at the call site in Server Actions. Service function signatures change from `(client: SupabaseClient, ...)` to `(auth: AuthPort, ...)`. The migration guide documents this with before/after diffs. |

---

## Traceability

### Audit events (if applicable)

Backend provider decoupling is infrastructure-only with no user-visible mutations. No new audit events are introduced by this feature. The existing audit log writes in services (e.g., `writeAuditLog()` in `resource-service.ts`) are unaffected — they continue to write via `SupabaseClient` for DB operations, which are not decoupled in MVP.

### Sentry

- Area: `core/adapters`
- This is infrastructure code with no new Server Actions. Sentry instrumentation is the responsibility of the Server Actions that call the services — no change required.
- Supabase adapter errors bubble up as `ServiceResult<T>` failures with `success: false`. The existing pattern of capturing these in Server Actions via `captureActionError` is unchanged.
- If a custom adapter is implemented by an adopter, they are responsible for ensuring adapter errors are surfaced as `ServiceResult` failures and not thrown as uncaught exceptions.

### Seed data

No new seed data is required. The port/adapter layer is transparent to the DB schema — it wraps existing Supabase calls without changing the data model.

### E2E flows

No new E2E flows are required. The acceptance criterion for this feature is that ALL existing E2E flows continue to pass with zero changes after the refactor. The E2E suite implicitly validates that the Supabase adapter is functionally equivalent to the pre-refactor direct calls.

| Scenario | Actor | Expected outcome |
|----------|-------|-----------------|
| Sign in with email and password | Authenticated user | Auth succeeds via `SupabaseAuthAdapter`; session cookie is set; redirect to dashboard |
| Sign up new account | Anonymous user | Account created via `SupabaseAuthAdapter`; email confirmation flow initiated |
| Sign out | Authenticated user | Session cleared via `SupabaseAuthAdapter`; redirect to sign-in |
| Request password reset | Unauthenticated user | Reset email sent via `SupabaseAuthAdapter`; success message shown |
| Upload file (avatar) | Authenticated user | File uploaded via `SupabaseStorageAdapter`; signed URL returned |
| Middleware refreshes session | Any user | `SupabaseSessionAdapter.refreshSession()` called; session cookie refreshed transparently |

### External adapters

| Port | Interface | Default adapter | Env var | Example custom adapter |
|------|-----------|-----------------|---------|------------------------|
| Auth | `AuthPort` | `SupabaseAuthAdapter` | `BACKEND_AUTH_PROVIDER=supabase` (default) | Firebase Auth adapter, Clerk adapter, Auth0 adapter |
| Storage | `StoragePort` | `SupabaseStorageAdapter` | `BACKEND_STORAGE_PROVIDER=supabase` (default) | S3 adapter, Cloudflare R2 adapter, local filesystem adapter |
| Session | `SessionPort` | `SupabaseSessionAdapter` | No env var needed — always instantiated by `createBackendAdapters()` alongside `AuthPort` | Custom JWT cookie adapter |

### Production readiness

- [ ] `AuthPort` interface is complete: all methods in `auth-service.ts` are covered
- [ ] `StoragePort` interface is complete: upload, download, delete, getSignedUrl, getPublicUrl, listFiles
- [ ] `SessionPort` interface is complete: `refreshSession(request)` returning `NextResponse`
- [ ] `SupabaseAuthAdapter` implements `AuthPort` — all methods tested with port-mock pattern
- [ ] `SupabaseStorageAdapter` implements `StoragePort` — all methods tested with port-mock pattern
- [ ] `SupabaseSessionAdapter` implements `SessionPort` — behavior verified against existing middleware E2E
- [ ] `createBackendAdapters()` factory defaults to Supabase when env vars are absent
- [ ] `createBackendAdapters()` throws a descriptive error when an unsupported provider name is set
- [ ] `pnpm typecheck` passes across all packages
- [ ] `pnpm test` passes with zero changes to existing test files
- [ ] `pnpm e2e` passes with zero changes to existing E2E test files
- [ ] Port interfaces are exported from `@enterprise/core/services` public API
- [ ] Migration guide written in `docs/developer-guide/backend-provider-migration.md`
- [ ] `packages/core/AGENTS.md` QA checklist updated to enforce port-based injection for new services
- [ ] No `@supabase/supabase-js` imports remain in `packages/core/src/services/__tests__/` files
- [ ] `BACKEND_AUTH_PROVIDER` and `BACKEND_STORAGE_PROVIDER` documented in `.env.example` with inline comments explaining accepted values

---

## Decisions log

| Decision | Outcome | Rationale |
|----------|---------|-----------|
| Use the `PaymentProviderPort` / `createPaymentAdapter()` billing pattern as the reference? | Yes — same structure: port interface → adapter class → factory function → env-var selection | Pattern is already in the codebase, proven, and understood by anyone who has read the billing feature. Zero new conventions introduced. |
| Include `DatabasePort` in MVP? | No — P1 follow-up | DB operations are the most complex decoupling surface (RLS policies, PostgREST vs Drizzle, schema coupling). Attempting this in MVP would delay Auth and Storage decoupling, which are the highest-value swaps for adopters. |
| Include `RealtimePort` in MVP? | No — P2 | Realtime features are not yet implemented in the template. The port can be designed when the feature is built. |
| Env-var selection vs. `NODE_ENV`? | Env vars (`BACKEND_AUTH_PROVIDER`, `BACKEND_STORAGE_PROVIDER`) — NOT `NODE_ENV` | `NODE_ENV` conflates deployment environment with provider choice. An adopter may want to run Supabase in production and Firebase in staging. Explicit env vars give full control. This mirrors the billing adapter decision. |
| Service function signatures: change `SupabaseClient` to `AuthPort`? | Yes — for auth operations only | Services that also do DB queries still accept `SupabaseClient` for the DB part (until `DatabasePort` lands). The auth parameter type changes from `SupabaseClient` to `AuthPort`. This is a source-level breaking change documented in the migration guide. |
| Ship community adapters (Firebase, Clerk) in this PR? | No — Supabase adapter only | Shipping unvalidated community adapters adds maintenance burden without production proof. The `AuthPort` interface is the deliverable; community adapters are examples in the migration guide and can be contributed as separate packages. |
| Keep `STORAGE_BUCKETS` and `STORAGE_PATHS` constants as-is? | Yes — they are naming conventions, not Supabase-specific | Any `StoragePort` implementation can use these constants to derive paths. Moving them would be a needless breaking change. The Supabase adapter uses them internally. |
| `SessionPort` returns `NextResponse` (Next.js type)? | Yes — this port is intentionally Next.js-scoped | The middleware is a Next.js primitive. Abstracting away `NextResponse` would require a custom response wrapper that adds complexity without benefit. Adopters who switch frameworks rewrite middleware regardless. |
| Where do adapters live in the package tree? | `packages/core/src/services/adapters/` — same directory as `ConsoleInvitationEmailAdapter` and `ResendInvitationEmailAdapter` | Consistent location, consistent naming convention. No new directory structures introduced. |

---

*Last updated: 2026-05-11*
