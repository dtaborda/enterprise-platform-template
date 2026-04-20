# ADR 001: Platform Architecture - Multi-Tenant Template

## Status
Accepted

## Context
We need to create a reusable enterprise platform template that can be instantiated for new multi-tenant applications. The template should extract and generalize the patterns from `sala-tickets-app`.

## Decision

### Package Structure
The template will consist of 4 core packages:

| Package | Responsibility |
|---------|---------------|
| `@enterprise/contracts` | Generic DTOs, types, Zod schemas for platform entities |
| `@enterprise/db` | Drizzle ORM schema with RLS policies (tenants, profiles, audit) |
| `@enterprise/core` | Supabase clients (server, browser, middleware, admin) + platform services |
| `@enterprise/ui` | Abstract design tokens (CSS variables) for theming |

### Service Layer Pattern
Following the pattern from SAL-32:
- Services receive `SupabaseClient` as first argument (dependency injection)
- Services return `ServiceResult<T>` = `ServiceSuccess<T>` | `ServiceFailure`
- Services are pure business logic — no `"use server"`, no `revalidatePath`
- Server Actions are thin wrappers: validate → get client → call service → return result

### RLS Strategy
- All tables use `.enableRLS()` with inline `pgPolicy()`
- Helper functions (`isTenantMember`, `isAdminOrAbove`) require custom Postgres functions
- Policies scoped to `tenant_id` from auth context

### Skills & Testing
- Reuse skills from sala-tickets: drizzle, supabase, zod-4, nextjs-15
- Vitest configured with projects: contracts, core, ui
- Playwright for E2E with production build

## Consequences
- New apps can instantiate from this template
- Domain-specific code goes in separate packages (not in platform)
- Testing patterns are consistent across all apps
- RLS patterns are battle-tested from sala-tickets

## References
- SAL-32 (Service Layer) — https://linear.app/sala-tickets/issue/SAL-32
- SAL-39 (Platform Architecture Epic) — https://linear.app/sala-tickets/issue/SAL-39
- Source: `/Users/damiantaborda/ws/gallo/sala-tickets-app`