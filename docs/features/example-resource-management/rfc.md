# RFC — Resource Management Platform Architecture (Example)

> **Note:** This is an example RFC included with the template. Replace the content with your own technical architecture when starting a new project. The structure and sections below illustrate what a good RFC looks like.

## 1. Summary

This document defines how the Resource Management Platform will be built from a technical perspective.

The system uses a modern, modular architecture focused on:

- Multi-tenant data isolation
- Server-side rendering with selective client interactivity
- Type-safe contracts shared across the stack
- Row Level Security at the database level

## 2. Technical Objective

Design an architecture that enables:

- Managing resources with full CRUD operations
- Isolating data per tenant using RLS
- Enforcing role-based access (owner, admin, member)
- Scaling to multiple organizations without code changes

## 3. General Architecture

### Main Flow

```
Browser → Next.js (Server Components / Actions) → Service Layer → Supabase (RLS) → PostgreSQL
```

```
┌──────────┐    ┌──────────────┐    ┌──────────────┐    ┌──────────────────────────┐
│ Browser  │───▶│ Next.js App  │───▶│ Service      │───▶│   Supabase (PostgreSQL)  │
│          │    │ Server/Client│    │ Layer        │    │   Multi-tenant + RLS     │
└──────────┘    └──────────────┘    └──────────────┘    └──────────────────────────┘
```

## 4. Components

### Frontend

- **Next.js 15+** (App Router)
- Server Components by default, Client Components for interactivity
- **shadcn/ui** component library
- **Tailwind CSS 4** for styling

### Service Layer

- Function-based services in `packages/core/src/services/`
- Receives `SupabaseClient` as first argument (dependency injection)
- Returns `ServiceResult<T>` — never throws for expected failures
- No framework-specific code (no `"use server"`, no `revalidatePath`)

### Server Actions

- Thin wrappers in `ui/features/{module}/actions.ts`
- Pattern: Zod validate → get auth client → call service → revalidate → return `ActionResult<T>`

### Database

- **Supabase** (PostgreSQL)
- Multi-tenant via `tenant_id` column + RLS policies
- Auth via Supabase Auth with JWT claims in `app_metadata`
- Schema defined with **Drizzle ORM**

### Contracts

- **Zod schemas** in `packages/contracts/`
- Single source of truth for all DTOs and validation
- TypeScript types derived from schemas via `z.infer<>`

## 5. Data Model

### Core Entities

| Entity | Description |
|--------|-------------|
| `tenants` | Organization isolation unit |
| `profiles` | User profiles linked to Supabase Auth |
| `user_roles` | Role assignments per tenant |
| `resources` | Domain entities managed by the platform |
| `audit_log` | CUD operation audit trail |

### Entity Relationships

```
tenants
  ├── profiles (users belong to a tenant)
  ├── user_roles (role assignments)
  ├── resources (domain data, tenant-scoped)
  └── audit_log (action history)
```

## 6. Multi-Tenant Strategy

- Each organization has its own **tenant**
- All data is isolated by `tenant_id`
- `tenant_id` and `role` are stored in JWT `app_metadata`
- RLS policies enforce isolation at the database level
- No tenant bypass in frontend code

## 7. Security Model

### Authentication

- Supabase Auth with email/password
- JWT tokens with `tenant_id` and `role` in `app_metadata`
- `getUser()` (not `getSession()`) for server-side auth checks

### Authorization

- RLS policies on every table
- SELECT: all authenticated tenant members
- INSERT/UPDATE/DELETE: restricted to `owner` and `admin` roles
- UI guards hide mutation controls from unauthorized roles

### Audit

- CUD operations logged via `AuditService.log()` (fire-and-forget)
- No PII in audit metadata

## 8. Technical Decisions

| Decision | Rationale |
|----------|-----------|
| Monorepo (pnpm + Turborepo) | Shared types, contracts, and UI across packages |
| Supabase | PostgreSQL + Auth + RLS + Realtime in one platform |
| Drizzle ORM | Type-safe schema definition, migration generation |
| Function-based services | Testable, composable, no class overhead |
| Server Components default | Minimal client JS, better performance |
| Zod contracts package | Single source of truth for validation and types |

## 9. Trade-offs

### Prioritized

- Simplicity and clarity
- Type safety across the stack
- Convention over configuration

### Sacrificed

- Advanced features in MVP (deferred to V2+)
- Complex state management (Zustand only where needed)
- Realtime subscriptions (not needed for resource CRUD)

## 10. Risks

| Risk | Mitigation |
|------|------------|
| RLS misconfiguration | Use `app_metadata` claims (not user-editable), test policies |
| Drizzle migration drift | Review generated SQL, use `db:generate` workflow |
| Over-engineering | Strict MVP scope, defer features explicitly |
| Multi-tenant data leak | RLS enforced at DB level, never bypass in app code |

## 11. Implementation Plan

### Phase 1 — MVP

- [x] Multi-tenant foundation (tenants, profiles, RLS)
- [x] Auth flows (sign-in, sign-up, password reset)
- [x] Resource CRUD (create, list, detail, edit, archive)
- [x] Role-based access control
- [x] Unit and E2E test coverage

### Phase 2

- [ ] File attachments (Supabase Storage)
- [ ] Activity feed (Supabase Realtime)
- [ ] Dashboard with metrics

### Phase 3

- [ ] API integrations
- [ ] Notification system
- [ ] Advanced search and reporting

## 12. In One Sentence

> The RFC defines a multi-tenant, RLS-secured platform architecture using Next.js, Supabase, and Drizzle ORM — designed to be cloned and adapted for any domain.
