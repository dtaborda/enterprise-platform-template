# @enterprise/core — Agent Instructions

## Purpose

Shared business infrastructure: Supabase clients, service layer, auth helpers, environment utilities, observability.

### Auto-invoke Skills

When performing these actions, ALWAYS invoke the corresponding skill FIRST:

| Action | Skill |
|--------|-------|
| Adding RLS policies | `drizzle` |
| Creating database relations | `drizzle` |
| Creating database schemas | `drizzle` |
| Defining table columns and types | `drizzle` |
| Implementing feature business logic | `nextjs-15` |
| Implementing pgvector/embeddings | `drizzle` |
| Making permission or role-based decisions | `typescript` |
| Running migrations | `drizzle` |
| Working with Supabase auth | `drizzle` |
| Working with Supabase clients, SSR, storage, CLI | `supabase` |
| Writing database queries | `drizzle` |

---

## Supabase Client Rules

- **Browser client** (`supabase/client.ts`): For Client Components. Uses `createBrowserClient`
- **Server client** (`supabase/server.ts`): For Server Components and Server Actions. Uses `createServerClient` with cookie handling
- **Middleware client** (`supabase/middleware.ts`): For Next.js middleware. Refreshes sessions
- ALWAYS use `getUser()` not `getSession()` for auth checks — `getUser()` validates the token server-side
- NEVER expose `SUPABASE_SERVICE_ROLE_KEY` in any client-accessible code

## Service Layer (MANDATORY)

ALL business logic lives here in `src/services/`. This is the core of the application.

### Structure
```
src/services/
├── types.ts                  # ServiceResult<T>, ServiceSuccess, ServiceFailure
├── auth-service.ts           # Login, logout, accept invitation
├── team-service.ts           # Invite member (dual-client pattern)
├── audit-service.ts          # writeAuditLog (fire-and-forget)
├── index.ts                  # Barrel export
└── __tests__/                # Unit tests with mocked Supabase client
```

### Rules
- Services receive `SupabaseClient` as first arg (dependency injection)
- Services return `ServiceResult<T>` — NEVER `ActionResult<T>`
- Services have NO `"use server"`, NO `revalidatePath`, NO `redirect`
- Services do NOT call Sentry — that stays in the action wrapper
- New features MUST create a service before creating actions

### Adding a New Service
1. Create `src/services/{feature}-service.ts`
2. Import `ServiceResult` from `./types`
3. Write unit tests in `src/services/__tests__/{feature}-service.test.ts`
4. Export from `src/services/index.ts`
5. Call `writeAuditLog()` for CUD operations

## Supabase Contracts

### Auth Metadata
- `src/supabase/contracts.ts` — re-exports typed metadata schemas from `@enterprise/contracts`
- Use `RegistrationMetadata` and `InvitationMetadata` for all auth flows

### Storage Paths
- `src/supabase/storage-paths.ts` — `buildStoragePath(type, { tenantId, entityId, filename })`
- NEVER construct storage paths with string concatenation

### Observability
- `src/observability/sentry-tags.ts` — `buildSentryTags({ tenantId, userRole, actionName })`
- All tags use `enterprise.*` prefix

## Environment Variables

- Use `getRequiredEnv()` for vars that MUST exist (crashes early if missing)
- Use `getOptionalEnv()` for vars with sensible defaults
- Use `getAppUrl()` for the application URL (handles `NEXT_PUBLIC_APP_URL` → `NEXT_PUBLIC_SITE_URL` fallback)
- NEVER use `process.env.X!` — always go through the helpers

## What Goes Here

- **Service layer** (business logic for all features)
- Supabase client factories
- Supabase behavioral contracts (metadata, storage paths)
- Auth session helpers
- Observability utilities (Sentry tags)
- Environment config

## What Does NOT Go Here

- UI components → `@enterprise/ui`
- Zod schemas → `@enterprise/contracts`
- `"use server"` directives → `ui/features/*/actions.ts`
- `revalidatePath` / `redirect` → `ui/features/*/actions.ts`
