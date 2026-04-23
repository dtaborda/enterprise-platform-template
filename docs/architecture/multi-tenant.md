# Multi-Tenant Architecture

This template implements shared-database multi-tenancy where every domain row is tenant-scoped and enforced through PostgreSQL RLS.

---

## What multi-tenant means here

All tenants live in the same database, but each tenant sees only its own data.

Isolation is achieved through:

- `tenant_id` column on tenant-scoped tables
- JWT claims (`tenant_id`, `role`) in `app_metadata`
- RLS policies that compare row tenant with claim tenant

This avoids per-tenant databases while still enforcing strict boundaries.

## Tenant creation flow

```text
auth.users INSERT (sign-up)
        │
        ▼
handle_new_user() trigger
  ├─ INSERT public.tenants
  └─ INSERT public.profiles (role = owner)
        │
        ▼
Application uses tenant_id from JWT claims
```

The trigger function runs as `SECURITY DEFINER`, which is necessary because target tables are RLS-protected.

## Data isolation pattern

Every tenant-scoped table follows the same model:

1. Include `tenant_id UUID NOT NULL`.
2. Enable row level security.
3. Add `SELECT` policy for same-tenant users.
4. Add mutation policies based on both tenant and role.

Example from `resources`:

- `SELECT`: any authenticated user in same tenant
- `INSERT/UPDATE/DELETE`: only `owner` or `admin` in same tenant

## JWT claim structure

RLS relies on claims in `auth.users.raw_app_meta_data`:

```json
{
  "provider": "email",
  "providers": ["email"],
  "tenant_id": "<uuid>",
  "role": "owner"
}
```

Policy expressions reference these fields directly.

## RLS policy patterns

### Tenant membership (read)

```sql
(auth.jwt()->'app_metadata'->>'tenant_id')::uuid = tenant_id
```

### Tenant membership + elevated role (mutations)

```sql
(
  (auth.jwt()->'app_metadata'->>'tenant_id')::uuid = tenant_id
  AND auth.jwt()->'app_metadata'->>'role' IN ('owner', 'admin')
)
```

Use this baseline unless a module explicitly requires broader write access.

## Tenant data flow diagram

```text
Browser request with Supabase session
        │
        ▼
Next.js server/action obtains user (JWT)
        │
        ▼
Supabase executes SQL against tenant table
        │
        ▼
RLS reads JWT app_metadata claims
  ├─ tenant_id must match row tenant_id
  └─ role must satisfy mutation policy
        │
        ▼
Rows returned (or write denied)
```

## How to add a new tenant-scoped table

1. **Schema** (`packages/db/src/schema/*.ts`)
   - Add `tenantId` column (maps to `tenant_id`)
   - Add indexes including `tenant_id`

2. **Policies**
   - Add select policy with tenant claim
   - Add insert/update/delete policies with tenant + role checks

3. **Migration**
   - Generate SQL and verify only incremental changes are present

4. **Contracts + services**
   - Define DTOs in `@enterprise/contracts`
   - Implement business logic in `@enterprise/core` service

5. **Actions + UI**
   - Keep actions thin
   - Add role-aware controls in UI

6. **Tests**
   - Unit tests for service behavior
   - E2E tests for tenant-safe CRUD flows

## Common mistakes to avoid

- Missing `tenant_id` on a domain table
- Using app-level checks without RLS policies
- Assuming UI guards are enough for security
- Using service role credentials in request-driven user flows

## Related docs

- [Users and Roles](./users-and-roles.md)
- [Request Flow](./request-flow.md)
- [Service Layer](./service-layer.md)
