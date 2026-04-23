# Request Flow

This document explains how requests move from browser to database in this template, including where authentication and RLS checks occur.

---

## End-to-end flow

```text
Browser
  │
  ▼
Next.js Route / Server Component / Server Action
  │
  ▼
Feature Action/Query (ui/features/*)
  │
  ▼
Service Layer (@enterprise/core/services/*)
  │
  ▼
Supabase Client (@enterprise/core/supabase/*)
  │
  ▼
PostgreSQL (RLS policies)
```

RLS is the final authority for tenant and role access.

## CREATE operation flow (example: create resource)

```text
User submits form
  │
  ▼
Server Action receives payload
  │
  ├─ Zod parse (createResourceSchema)
  ├─ getServerClient()
  ├─ auth.getUser() + tenant_id from app_metadata
  ▼
createResource(service)
  │
  ├─ insert into resources
  ├─ optional audit log write (fire-and-forget)
  ▼
RLS checks tenant_id + role claim
  │
  ▼
Action maps ServiceResult -> ActionResult
  │
  ▼
revalidatePath("/dashboard/resources")
```

### Key checkpoints

1. **Input validation** happens before DB access.
2. **Auth context** comes from server-side user lookup.
3. **Service** handles business logic and returns typed result.
4. **RLS** decides whether write is actually allowed.

## LIST operation flow (example: list resources)

```text
Browser loads /dashboard/resources
  │
  ▼
Server Component page.tsx
  │
  ├─ requireAuth()
  └─ getResources(query)
        │
        ▼
listResources(service)
        │
        ▼
SELECT from resources
        │
        ▼
RLS filters rows by tenant_id claim
```

The UI receives only rows the current tenant is allowed to read.

## Auth flow: sign-in to dashboard

```text
POST /sign-in
  │
  ▼
signInAction -> signInWithPasswordService
  │
  ▼
Supabase issues session cookies + JWT
  │
  ▼
Next request enters middleware
  │
  ├─ updateSession() calls getUser() (refresh/validate)
  ├─ reads profile.role
  └─ redirects based on route + role
  ▼
Dashboard route renders if authenticated
```

Middleware guards protected pages (`/dashboard/*`) and redirects unauthenticated users to `/sign-in`.

## Where RLS is applied

RLS is evaluated in PostgreSQL for every query against protected tables:

- `profiles`
- `tenants`
- `user_roles`
- `audit_log`
- `resources`

Claim sources:

```sql
auth.jwt()->'app_metadata'->>'tenant_id'
auth.jwt()->'app_metadata'->>'role'
```

Because claims are checked in SQL, tenant isolation remains enforced even if application logic has bugs.

## Error propagation model

| Layer | Error format | Responsibility |
|-------|--------------|----------------|
| Service | `ServiceResult<T>` failure (`error`, `code`) | Domain/business failure semantics |
| Action | `ActionResult<T>` or redirect | UX-friendly response and navigation |
| UI | inline state / route-level handling | User messaging and affordances |

## Implementation guidance for new endpoints

1. Add Zod schema in `@enterprise/contracts`.
2. Implement service function in `@enterprise/core/services`.
3. Create thin action/query wrapper in `ui/features/{feature}`.
4. Use server components for reads when possible.
5. Rely on RLS for final authorization, not UI checks.

## Related docs

- [Service Layer](./service-layer.md)
- [Multi-Tenant Model](./multi-tenant.md)
- [Users and Roles](./users-and-roles.md)
