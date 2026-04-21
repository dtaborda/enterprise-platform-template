# Enterprise Platform — Agent Instructions

## Project Overview

Enterprise Platform is a multi-tenant SaaS template: full-stack, Supabase-powered, deployed on Vercel.

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Framework | Next.js 15+ (App Router) |
| Language | TypeScript 5.7+ (strict) |
| UI | React 19, Tailwind CSS 4, shadcn/ui |
| Backend | Supabase (PostgreSQL + Auth + Storage + Edge Functions) |
| State | Zustand 5 (client), Server Components (server) |
| Validation | Zod 3 |
| Monorepo | pnpm workspaces + Turborepo |
| Lint/Format | Biome (replaces ESLint + Prettier) |
| Testing | Vitest (unit), Playwright (E2E) |

## Monorepo Structure

```
ui/                 → @enterprise/web — Next.js application
packages/contracts/ → @enterprise/contracts — Zod schemas (single source of truth for DTOs)
packages/core/      → @enterprise/core — Supabase clients, auth helpers, shared utils
packages/db/        → @enterprise/db — Drizzle ORM schema (tables, relations, types)
packages/ui/        → @enterprise/ui — shadcn/ui component library, design tokens
docs/               → Product docs (PRD, RFE)
```

## Dependency Direction (ENFORCED)

```
@enterprise/web → @enterprise/contracts, @enterprise/core, @enterprise/ui, @enterprise/db
@enterprise/core → @enterprise/contracts, @enterprise/db
@enterprise/contracts → zod ONLY
@enterprise/db → drizzle-orm ONLY
@enterprise/ui → clsx, tailwind-merge, CVA, lucide-react, radix-ui ONLY
```

NEVER create circular dependencies. NEVER import from @enterprise/web in any package.

## Architecture Principles

1. **Feature-based structure**: Each module in `ui/features/{module}/` with actions, queries, schemas, types, components, hooks
2. **Server-first**: Landings with SSR. Dashboard with Server Components where possible. Client Components only for interactivity
3. **Service layer**: ALL business logic lives in `packages/core/src/services/`. Server Actions are thin wrappers only (see below)
4. **Adapter pattern**: External integrations behind adapter interfaces for decoupling
5. **RLS everywhere**: ALL queries go through Supabase RLS. No tenant bypass in frontend
6. **Contracts as source of truth**: All DTOs, inputs, and outputs defined as Zod schemas in @enterprise/contracts
7. **Explicit Supabase contracts**: Auth metadata shapes, storage paths, and env vars are typed and centralized (see below)

## Service Layer Pattern (ENFORCED)

ALL business logic MUST live in `packages/core/src/services/`. Server Actions are **thin wrappers only**.

### Server Action Pattern (MANDATORY for all mutations):

```
Server Action (thin wrapper)              Service (business logic)
─────────────────────────                ────────────────────────
"use server"                             NO "use server"
1. Zod validation                        1. Receive typed data + SupabaseClient
2. Get authenticated Supabase client     2. Execute business logic
3. Call service function                 3. Return ServiceResult<T>
4. Return ActionResult<T> on failure
5. revalidatePath on success when needed
6. Return ActionResult<T>
```

### Service Design Rules:
- Services receive `SupabaseClient` as first arg (dependency injection — testable with mocks)
- Services return `ServiceResult<T>` = `{ success: true; data: T } | { success: false; error: string; code?: string }`
- Services have NO `"use server"`, NO `revalidatePath`, NO `redirect`, NO Sentry calls
- Services live in `packages/core/src/services/{module}-service.ts`
- Tests live in `packages/core/src/services/__tests__/{module}-service.test.ts`

### Existing Services:
| Service | API shape | What it covers |
|---------|-----------|---------------|
| `auth-service.ts` | function-based services returning `ServiceResult<T>` | Sign in, sign out, sign up, password reset |
| `services/index.ts` | class-based platform services (`TenantService`, `ProfileService`, `AuditService`, `RoleService`) | Tenant, profile, audit, and role operations |

### When adding a new feature:
1. Create `packages/core/src/services/{feature}-service.ts`
2. Write unit tests in `packages/core/src/services/__tests__/{feature}-service.test.ts`
3. Create thin Server Actions in `ui/features/{feature}/actions.ts`
4. Use `AuditService.log()` or an equivalent platform logging abstraction for create/update/delete operations

## Supabase Contracts (ENFORCED)

### Auth Metadata
- Registration metadata: use `RegistrationMetadata` type from `@enterprise/contracts`
- Invitation metadata: use `InvitationMetadata` type from `@enterprise/contracts`
- NEVER send raw untyped metadata to `supabase.auth.signUp()` — always use the typed schemas

### Storage Paths
- ALWAYS use `buildStoragePath(type, { tenantId, entityId, filename })` from `@enterprise/core/supabase/storage-paths`
- NEVER construct storage paths with string concatenation
- Path format `{tenantId}/{entityId}/{filename}` is enforced by RLS — changing it breaks authorization

### Environment Variables
- ALWAYS use `getAppUrl()` from `@enterprise/core/utils/env` for the application URL
- Use `getEnv()` and the typed helpers in `@enterprise/core/utils/env` instead of ad-hoc `process.env` access in shared code

### Audit Logging
- Use `AuditService.log()` (or a thin wrapper around it) for CUD operations that need audit entries
- Audit logging is fire-and-forget — it MUST NOT block the main operation
- NEVER log PII (email, name, phone) in audit metadata

## Skill Auto-Invoke Table

Load these skills BEFORE writing any code when the context matches:

| Context | Skill |
|---------|-------|
| React components, hooks, patterns | react-19 |
| Next.js routing, Server Actions, data fetching | nextjs-15 |
| TypeScript types, interfaces, generics | typescript |
| Tailwind styling, cn(), theme variables | tailwind-4 |
| Zod schemas, validation | typescript |
| Zustand stores, state management | zustand-5 |
| E2E tests, Page Objects | playwright |
| Creating GitHub issues | issue-creation |
| Creating pull requests | branch-pr |
| Reviewing PRs | pr-review |
| Drizzle schemas, migrations, DB queries | drizzle |
| CSS tokens, theme variables, colors | design-tokens |
| UI layout composition, visual hierarchy | design-rules |
| Feature components, shadcn theming | design-components |
| Sentry, error tracking, error boundaries, monitoring, observability | sentry |
| Supabase auth, SSR, RLS, storage, CLI, MCP, Edge Functions | supabase |
| Postgres query optimization, schema performance, connection management | supabase-postgres-best-practices |
| Creating new AI agent skills, documenting patterns for AI | skill-creator |

Repo-local skills require runtime wiring. Run `pnpm skills:setup` (or `./skills/setup.sh --opencode`) so OpenCode can discover `.agents/skills` before relying on local skills such as `drizzle`, `supabase`, `sentry`, and the design-system skills.

## Design Reference

Before implementing ANY UI component or page, follow this workflow:

### Step 1: Check existing UI primitives and tokens
Inspect `packages/ui/src/components/` and `packages/ui/src/styles/globals.css` before creating new UI.

### Step 2: Check existing screens or generate a reference
If a Stitch project exists for this application, query its MCP to find relevant reference screens.
If no Stitch project is configured, implement using the existing component patterns in the codebase.

### Step 3: Implement following the design
When writing the component code:
- Use the **tokens** from `globals.css` (surface-container-*, primary-fixed-dim, etc.)
- Follow the existing tonal layering and spacing patterns already used in `packages/ui` and `ui/`
- Match the **layout and hierarchy** from any available reference screen
- Use `@enterprise/ui` primitives and compose them consistently

### Key principle
Design references are DIRECTION, not pixel-perfect. The source of truth is the existing `@enterprise/ui` package plus the local CSS token definitions.

## Language Policy (ENFORCED)

**ALL generated artifacts MUST be in English.** No exceptions.

| Artifact | Language | Example |
|----------|----------|---------|
| Variable/function names | English | `createResource`, `itemCount`, `buyerEmail` |
| Type/interface names | English | `ActionResult`, `ResourceStatus`, `CheckInInput` |
| Component names | English | `ResourceCard`, `TenantForm`, `CheckInPanel` |
| File/folder names | English | `resource-card.tsx`, `check-in/`, `use-resource-form.ts` |
| Code comments | English | `// Verify token hasn't been used before` |
| Commit messages | English | `feat: add check-in scanner` |
| PR titles and descriptions | English | Clear, concise English |
| JSDoc / TSDoc | English | `@param resourceId - The UUID of the resource` |
| Error messages (developer-facing) | English | `"Missing required environment variable"` |
| Log messages | English | `console.error("Webhook signature verification failed")` |
| README and technical docs | English | Architecture docs, setup guides |
| AGENTS.md files | English | All agent instructions |
| Test descriptions | English | `it("should reject already-used token")` |

**Documentation is NOT an exception.** PRD, RFE, README, ADRs, and any future docs MUST be written and maintained in English.

## Code Conventions

- **Naming**: kebab-case for files, PascalCase for components, camelCase for functions/variables
- **Exports**: Named exports only. No default exports except Next.js pages/layouts
- **Imports**: Use workspace aliases (`@enterprise/ui`, `@enterprise/core`, `@enterprise/contracts`), path aliases (`@/` in ui)
- **Actions**: Return `ActionResult<T>` type from `@enterprise/contracts`
- **Schemas**: Suffix with `Schema` (e.g., `createResourceSchema`). Colocate in `@enterprise/contracts`
- **DB Schema**: Drizzle tables in `@enterprise/db`, types exported via `$inferSelect`/`$inferInsert`
- **Components**: shadcn/ui base from `@enterprise/ui`, feature components in `ui/features/`

## Testing Policy (ENFORCED)

Every feature module MUST include tests. This is NOT optional.

| Test Type | Tool | When | Location |
|-----------|------|------|----------|
| Unit tests | Vitest | Contracts, utilities, pure logic | `*.test.ts` colocated with source |
| E2E tests | Playwright | Every feature with UI pages | `ui/e2e/{feature}/` |

### E2E Test Rules
- Every feature that adds dashboard pages MUST include Playwright E2E tests
- Tests cover: CRUD happy paths + critical edge cases (auth, validation, error states)
- Use Page Object Model pattern (see `playwright` skill)
- Auth helper in `ui/e2e/helpers/auth.ts` for login flow reuse
- Test files: `ui/e2e/{feature}/{feature}.spec.ts`

### SDD Task Generation Rule
When `sdd-tasks` generates a task breakdown for a feature with UI pages, it MUST include:
- A testing phase with E2E test tasks for every user-facing flow
- Unit test tasks for contracts, utilities, and business logic

## QA Checklist (before every PR)

- [ ] `pnpm typecheck` passes
- [ ] `pnpm lint` passes
- [ ] `pnpm test` passes (unit tests)
- [ ] `pnpm e2e` passes (E2E tests, if feature has UI pages)
- [ ] No `any` types (warn level, but aim for zero)
- [ ] New Zod schemas go in `@enterprise/contracts`
- [ ] Supabase queries use RLS (never bypass with service role in client code)
- [ ] Server Actions validate input with Zod before DB access
- [ ] No secrets in client-side code (`NEXT_PUBLIC_` only for public vars)
- [ ] All code, comments, and commit messages in English
- [ ] Business logic lives in service layer, NOT in Server Actions
- [ ] Storage paths use `buildStoragePath()`, NOT string concatenation
- [ ] Auth metadata uses typed schemas from `@enterprise/contracts`
- [ ] CUD operations use `AuditService.log()` or an equivalent audit abstraction
- [ ] App URL uses `getAppUrl()`, NOT direct env var access

## Commit Conventions

Use conventional commits: `feat:`, `fix:`, `refactor:`, `docs:`, `chore:`, `test:`
Never add AI attribution or Co-Authored-By headers.
