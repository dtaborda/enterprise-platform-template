# @enterprise/core — Agent Instructions

## Purpose

Shared business infrastructure: Supabase clients, service layer, auth helpers, and environment utilities.

### Auto-invoke Skills

When performing these actions, ALWAYS invoke the corresponding skill FIRST:

| Action | Skill |
|--------|-------|
| Adding RLS policies | `drizzle` |
| Configuring RLS at client level | `supabase` |
| Configuring database connections | `supabase-postgres-best-practices` |
| Creating database relations | `drizzle` |
| Creating database schemas | `drizzle` |
| Defining auth-related database schemas or RLS policies | `drizzle` |
| Defining table columns and types | `drizzle` |
| Implementing auth flows | `supabase` |
| Implementing pgvector/embeddings | `drizzle` |
| Optimizing Postgres queries | `supabase-postgres-best-practices` |
| Reviewing schema performance | `supabase-postgres-best-practices` |
| Running migrations | `drizzle` |
| Setting up Supabase SSR cookies | `supabase` |
| Using getUser or getSession | `supabase` |
| Working with Supabase clients | `supabase` |
| Writing database queries | `drizzle` |

---

## Supabase Client Rules

- **Browser client** (`supabase/client.ts`): For Client Components. Uses `createBrowserClient`
- **Server client** (`supabase/server.ts`): For Server Components and Server Actions. Uses `createServerClient` with cookie handling
- **Middleware client** (`supabase/middleware.ts`): For Next.js middleware. Refreshes sessions
- ALWAYS use `getUser()` not `getSession()` for auth checks — `getUser()` validates the token server-side
- NEVER expose `SUPABASE_SERVICE_ROLE_KEY` in any client-accessible code

## Service Layer (MANDATORY)

ALL business logic lives here in `src/services/`.

### Structure
```
src/services/
├── auth-service.ts           # Function-based auth flows returning ServiceResult<T>
├── index.ts                  # Platform services: TenantService, ProfileService, AuditService, RoleService
└── __tests__/                # Unit tests with mocked Supabase client
```

### Rules
- **New services MUST use the function-based pattern** (like `auth-service.ts`). The class-based services in `index.ts` are legacy and will be migrated
- Services receive `SupabaseClient` as first arg (dependency injection — testable with mocks)
- Services return `ServiceResult<T>` — NEVER `ActionResult<T>`
- Services have NO `"use server"`, NO `revalidatePath`, NO `redirect`, NO Sentry calls (services must be testable without observability infrastructure — Sentry calls belong in Server Actions or error boundaries)
- New features MUST create a service before creating actions

### Adding a New Service
1. Create `src/services/{feature}-service.ts`
2. Reuse `ServiceResult` from `auth-service.ts` or colocate the equivalent result type with the new service
3. Write unit tests in `src/services/__tests__/{feature}-service.test.ts`
4. Export from `src/services/index.ts` when the service is part of the platform surface
5. Use `AuditService.log()` or an equivalent logging abstraction for CUD operations

## Supabase Contracts

### Auth Metadata
- `src/supabase/contracts.ts` re-exports typed metadata schemas from `@enterprise/contracts`
- Use `RegistrationMetadata` and `InvitationMetadata` for all auth flows

### Storage Paths
- `src/supabase/storage-paths.ts` exports `buildStoragePath(type, { tenantId, entityId, filename })`
- NEVER construct storage paths with string concatenation

## Environment Variables

- Use `getEnv()` for validated environment access
- Use `getAppUrl()` for the application URL
- NEVER use `process.env.X!` — always go through the helpers in shared code

## What Goes Here

- **Service layer** (business logic for all features)
- Supabase client factories
- Supabase behavioral contracts (metadata, storage paths)
- Auth session helpers
- Environment config

## What Does NOT Go Here

- UI components → `@enterprise/ui`
- Zod schemas → `@enterprise/contracts`
- `"use server"` directives → `ui/features/*/actions.ts`
- `revalidatePath` / `redirect` → `ui/features/*/actions.ts`
