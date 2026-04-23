# Resources Module Reference

The `resources` module is the template’s canonical end-to-end feature that demonstrates contracts, schema, services, actions, UI pages, and tests in one vertical slice.

---

## What this module demonstrates

This module is intentionally generic so teams can clone the pattern for any domain entity.

It shows:

- Tenant-scoped table with RLS policies
- Contract-first DTO and schema definitions
- Service-layer business logic with `ServiceResult<T>`
- Thin Server Actions with Zod validation + revalidation
- Server Component data fetching + role-aware controls
- Unit and E2E coverage

## Vertical slice diagram

```text
packages/db schema + RLS
        │
        ▼
packages/contracts schemas + DTOs
        │
        ▼
packages/core service methods
        │
        ▼
ui/features actions + queries
        │
        ▼
ui/app pages + components
        │
        ▼
unit tests + e2e tests
```

## File map

### Database and contracts

- `packages/db/src/schema/resources.ts` — Drizzle table, enums, indexes, and RLS policies
- `supabase/migrations/20260422000003_resources_schema.sql` — generated SQL for `resources`
- `packages/contracts/src/schemas/resources.ts` — Zod create/update/query schemas
- `packages/contracts/src/dto/resources.ts` — input/output DTOs
- `packages/contracts/src/types/resources.ts` — shared type exports
- `packages/contracts/src/__tests__/resources.test.ts` — contract-level validation tests

### Service layer

- `packages/core/src/services/resource-service.ts` — list/get/create/update/delete functions
- `packages/core/src/services/__tests__/resource-service.test.ts` — service behavior tests

### Feature layer and routes

- `ui/features/resources/actions.ts` — Server Actions for mutations
- `ui/features/resources/queries.ts` — server-only read wrappers
- `ui/features/resources/components/resource-form.tsx` — create/edit form
- `ui/features/resources/components/resource-table.tsx` — list table
- `ui/features/resources/components/resource-filters.tsx` — filtering controls
- `ui/features/resources/components/resource-detail.tsx` — detail card
- `ui/features/resources/components/delete-resource-button.tsx` — archive action UI
- `ui/app/(dashboard)/dashboard/resources/page.tsx` — list page
- `ui/app/(dashboard)/dashboard/resources/new/page.tsx` — create page
- `ui/app/(dashboard)/dashboard/resources/[id]/page.tsx` — detail page
- `ui/app/(dashboard)/dashboard/resources/[id]/edit/page.tsx` — edit page

### E2E coverage

- `ui/e2e/resources/resources.spec.ts` — auth redirects + CRUD happy paths + filters
- `ui/e2e/resources/resources-page.ts` — Page Object model
- `ui/e2e/resources/resources-seed.ts` — E2E setup/cleanup helpers

## Behavior conventions in this module

1. **Reads default to non-archived records** unless status filter is provided.
2. **Delete is soft delete** (`status = "archived"`) rather than hard delete.
3. **Writes are owner/admin only** via RLS and mirrored in UI controls.
4. **Audit log writes are non-blocking** (fire-and-forget) to avoid mutation latency.

## How to use this as a template for a new module

### Step 1: Model the table

- Create schema file in `packages/db/src/schema/{feature}.ts`
- Add `tenant_id` and policy set
- Generate migration and verify incremental SQL

### Step 2: Define contracts

- Add schemas in `packages/contracts/src/schemas/{feature}.ts`
- Add DTO/type exports
- Add validation tests

### Step 3: Build service layer

- Create `packages/core/src/services/{feature}-service.ts`
- Keep business logic and Supabase queries here
- Return `ServiceResult<T>` consistently

### Step 4: Add action/query wrappers

- `ui/features/{feature}/actions.ts` for mutations
- `ui/features/{feature}/queries.ts` for reads

### Step 5: Build route pages and components

- Add list/new/detail/edit pages under `ui/app/(dashboard)/dashboard/{feature}`
- Add reusable UI under `ui/features/{feature}/components`

### Step 6: Add tests

- Unit tests for contracts and services
- Playwright E2E for auth redirect, CRUD, and edge cases

## Checklist before considering a module complete

- [ ] RLS policies implemented and reviewed
- [ ] Contracts exported from `@enterprise/contracts`
- [ ] Service functions tested
- [ ] Actions stay thin (no business logic)
- [ ] E2E covers user-facing happy paths and critical guards

## Related docs

- [Service Layer](./service-layer.md)
- [Request Flow](./request-flow.md)
- [Multi-Tenant Model](./multi-tenant.md)
