# Architecture Overview

This template is a multi-tenant enterprise starter that enforces separation of concerns through package boundaries, a service layer, and database-first authorization with RLS.

---

## What this template is

Enterprise Platform Template is a **foundation repository** for teams that want to start with strong defaults:

- Monorepo boundaries already in place
- Multi-tenant data model with tenant-scoped access
- Auth + role model integrated with Supabase
- Service layer pattern for business logic
- Shared contracts as source of truth for inputs/outputs

It is intentionally a template, not a complete product. You extend it with domain modules.

## Package graph

```text
@enterprise/web (ui/)
 ├─ depends on @enterprise/contracts
 ├─ depends on @enterprise/core
 ├─ depends on @enterprise/db
 └─ depends on @enterprise/ui

@enterprise/core
 ├─ depends on @enterprise/contracts
 └─ depends on @enterprise/db

@enterprise/contracts
 └─ depends on zod only

@enterprise/db
 └─ depends on drizzle-orm only

@enterprise/ui
 └─ UI-only dependencies (no business logic)
```

## Dependency direction rules

```text
Allowed:
web -> contracts/core/db/ui
core -> contracts/db
contracts -> zod
db -> drizzle-orm
ui -> UI libs

Forbidden:
core -> web
contracts -> core/db/web
db -> core/contracts/web
ui -> core/db/web
```

Why this matters:

1. Keeps contracts reusable and framework-agnostic.
2. Prevents hidden coupling between UI and database internals.
3. Makes testing and refactoring easier because boundaries are explicit.

## Layer ownership

| Layer | Owns | Does not own |
|-------|------|--------------|
| `@enterprise/contracts` | DTO schemas, Zod validation, shared types | Database queries, UI components |
| `@enterprise/db` | Table schemas, enums, indexes, RLS declarations | Feature business logic |
| `@enterprise/core` | Business services, auth helpers, Supabase clients | Page components, route rendering |
| `@enterprise/web` | Routes, Server Components, Server Actions, feature composition | Core business rules |
| `@enterprise/ui` | Primitive components, styling tokens, UI utilities | Authentication, persistence logic |

## Core conventions

### 1) Service layer first

Business logic lives in `packages/core/src/services/*`.

- Services receive `SupabaseClient` as an argument.
- Services return `ServiceResult<T>`.
- Services do not call Next.js APIs such as `revalidatePath` or `redirect`.

Server Actions in `ui/features/*/actions.ts` are thin wrappers around services.

### 2) Contracts are the source of truth

Every shared input/output schema should be defined in `@enterprise/contracts` and imported by:

- Services
- Actions
- Forms
- Tests

This reduces shape drift between UI, server, and persistence layers.

### 3) RLS everywhere

Every tenant-scoped table uses `tenant_id` + RLS policies based on JWT claims.

Policy pattern:

```sql
auth.jwt()->'app_metadata'->>'tenant_id'
auth.jwt()->'app_metadata'->>'role'
```

This means authorization is enforced in PostgreSQL, not only in application code.

## Reference module: resources

`resources` is the canonical example feature and demonstrates the full vertical slice:

1. DB schema + policies
2. Contracts
3. Service methods
4. Server Actions
5. App routes and components
6. Unit + E2E tests

See [Resources Module](./resources-module.md) for a complete map.

## Related docs

- [Users and Roles](./users-and-roles.md)
- [Multi-Tenant Model](./multi-tenant.md)
- [Service Layer](./service-layer.md)
- [Request Flow](./request-flow.md)
