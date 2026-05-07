# @enterprise/core — Agent Instructions

## Purpose

Shared business infrastructure: Supabase clients, service layer, auth helpers, and environment utilities. ALL business logic for the platform lives here.

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

## Critical Rules — Non-Negotiable

### Supabase Clients

- ALWAYS: Use `getUser()` for auth checks (validates token server-side)
- NEVER: Use `getSession()` for auth checks (trusts JWT without validation)
- NEVER: Expose `SUPABASE_SERVICE_ROLE_KEY` in any client-accessible code
- NEVER: Use the admin client in code paths reachable from the browser

### Service Layer

- ALWAYS: Services receive `SupabaseClient` as first argument (dependency injection)
- ALWAYS: Services return `ServiceResult<T>` (discriminated union: success/failure)
- NEVER: `"use server"` in this package — that belongs in `ui/features/*/actions.ts`
- NEVER: `revalidatePath`, `redirect`, `cookies()` — those are Next.js server-only APIs
- NEVER: Sentry calls in services — error tracking belongs in Server Actions or boundaries
- NEVER: `ActionResult<T>` in services — that's the Server Action return type

### Environment

- ALWAYS: Use `getEnv()` for validated environment variable access
- ALWAYS: Use `getAppUrl()` for the application URL
- NEVER: `process.env.X!` — always go through helpers

---

## Decision Trees

### Where Does New Code Go?

```
Is it business logic (CRUD, validation, workflow)?
├── Yes → src/services/{feature}-service.ts
└── No
    ├── Is it a Supabase client factory or auth helper?
    │   └── Yes → src/supabase/
    ├── Is it an environment/config utility?
    │   └── Yes → src/utils/
    ���── Is it a shared type or constant?
        └── Probably belongs in @enterprise/contracts
```

### Service vs Utility

```
Does it talk to the database or external APIs?
├── Yes → It's a SERVICE (src/services/)
│         - Receives SupabaseClient
│         - Returns ServiceResult<T>
│         - Has unit tests with mocked client
└── No  → It's a UTILITY (src/utils/)
          - Pure function, no side effects
          - Returns value directly
```

---

## Patterns

### Function-Based Service (CURRENT PATTERN — use this for new code)

```typescript
import type { CreateResourceDto, ResourceEntity } from "@enterprise/contracts";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { ServiceResult } from "./auth-service";

export async function createResource(
  client: SupabaseClient,
  tenantId: string,
  userId: string,
  input: CreateResourceDto,
): Promise<ServiceResult<ResourceEntity>> {
  const { data, error } = await client
    .from("resources")
    .insert({
      tenant_id: tenantId,
      created_by: userId,
      title: input.title,
      type: input.type,
      status: input.status,
    })
    .select()
    .single();

  if (error) {
    return { success: false, error: error.message, code: error.code };
  }

  return { success: true, data: mapRow(data) };
}
```

### ServiceResult Type (discriminated union)

```typescript
export interface ServiceSuccess<T> {
  success: true;
  data: T;
}

export interface ServiceFailure {
  success: false;
  error: string;
  code?: string;
}

export type ServiceResult<T> = ServiceSuccess<T> | ServiceFailure;
```

### Service Unit Test (mocked Supabase client)

```typescript
import { describe, expect, it, vi } from "vitest";
import { createResource } from "../resource-service";

const mockClient = {
  from: vi.fn().mockReturnThis(),
  insert: vi.fn().mockReturnThis(),
  select: vi.fn().mockReturnThis(),
  single: vi.fn(),
} as unknown as SupabaseClient;

describe("createResource", () => {
  it("returns success with mapped entity", async () => {
    mockClient.from("resources").insert({}).select().single.mockResolvedValue({
      data: { id: "uuid", tenant_id: "t1", title: "Test", /* ... */ },
      error: null,
    });

    const result = await createResource(mockClient, "t1", "u1", {
      title: "Test",
      type: "product",
      status: "active",
    });

    expect(result.success).toBe(true);
  });
});
```

---

## Rules

1. **Service-first**: ALL business logic lives in `src/services/`. No logic in Server Actions.
2. **Function-based pattern**: New services use exported async functions (NOT classes). Legacy class-based services in `index.ts` will be migrated.
3. **Dependency injection**: Services receive `SupabaseClient` — never create their own client.
4. **Audit logging**: CUD operations call `AuditService.log()` or write to `audit_log` table.
5. **Types from contracts**: Import DTOs and types from `@enterprise/contracts` — don't redefine locally.
6. **Storage paths**: Use `buildStoragePath()` from `src/supabase/storage-paths.ts` — never concatenate strings.

---

## Project Structure

```
packages/core/
├── package.json
├── tsconfig.json
├── AGENTS.md
└── src/
    ├── index.ts                    # Barrel export
    ├── services/
    │   ├── index.ts                # Legacy class-based services (TenantService, ProfileService, AuditService)
    │   ├── auth-service.ts         # Function-based auth (sign in, sign up, password reset)
    │   ├── resource-service.ts     # Function-based CRUD example
    │   └── __tests__/
    │       ├── auth-service.test.ts
    │       ├── resource-service.test.ts
    │       └── platform-services.test.ts
    ├── supabase/
    │   ├── client.ts               # Browser client (createBrowserClient)
    │   ├── server.ts               # Server client (createServerClient + cookies)
    │   ├── middleware.ts           # Middleware client (session refresh)
    │   ├── admin.ts                # Admin client (service role — server-only)
    │   ├── contracts.ts            # Auth metadata re-exports from @enterprise/contracts
    │   └── storage-paths.ts        # buildStoragePath() utility
    └── utils/
        └── env.ts                  # getEnv(), getAppUrl() — validated env access
```

---

## What Goes Here vs What Does NOT

| ✅ Goes Here | ❌ Does NOT Go Here |
|-------------|-------------------|
| Service layer (business logic) | UI components → `@enterprise/ui` |
| Supabase client factories | Zod schemas → `@enterprise/contracts` |
| Auth session helpers | `"use server"` directives → `ui/features/*/actions.ts` |
| Storage path builder | `revalidatePath` / `redirect` ��� `ui/features/*/actions.ts` |
| Environment config | Database schema → `@enterprise/db` |

---

## Commands

```bash
pnpm --filter @enterprise/core typecheck    # TypeScript compilation
pnpm --filter @enterprise/core test         # Vitest unit tests
pnpm --filter @enterprise/core test:watch   # Watch mode for TDD
```

---

## QA Checklist (before commit)

- [ ] New service uses function-based pattern (not class-based)
- [ ] Services receive `SupabaseClient` as first arg
- [ ] Services return `ServiceResult<T>`, not `ActionResult<T>`
- [ ] No `"use server"`, `revalidatePath`, `redirect`, or `cookies()` in this package
- [ ] No Sentry calls in services (belongs in actions/boundaries)
- [ ] Unit tests exist with mocked Supabase client
- [ ] CUD operations write to audit log
- [ ] Types imported from `@enterprise/contracts`, not redefined locally
