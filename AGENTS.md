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

## Workspace AGENTS.md

Each workspace has its own AGENTS.md with specific rules. The runtime reads them by directory proximity — when editing a file, the nearest AGENTS.md in the path applies.

| Workspace | AGENTS.md | Focus |
|-----------|-----------|-------|
| `ui/` | `ui/AGENTS.md` | Server Actions, features, E2E tests |
| `packages/core/` | `packages/core/AGENTS.md` | Service layer, Supabase clients |
| `packages/db/` | `packages/db/AGENTS.md` | Schema definition, migrations |
| `packages/ui/` | `packages/ui/AGENTS.md` | Components, design tokens |
| `packages/contracts/` | `packages/contracts/AGENTS.md` | Zod schemas, DTOs |

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
3. **Service layer**: ALL business logic lives in `packages/core/src/services/`. Server Actions are thin wrappers only
4. **Adapter pattern**: External integrations behind adapter interfaces for decoupling
5. **RLS everywhere**: ALL queries go through Supabase RLS. No tenant bypass in frontend
6. **Contracts as source of truth**: All DTOs, inputs, and outputs defined as Zod schemas in @enterprise/contracts
7. **Explicit Supabase contracts**: Auth metadata shapes, storage paths, and env vars are typed and centralized

## Service Layer Pattern (ENFORCED)

ALL business logic MUST live in `packages/core/src/services/`. Server Actions are **thin wrappers only**.

**New services MUST use the function-based pattern** (like `auth-service.ts`). The class-based services in `index.ts` are legacy and will be migrated. See `packages/core/AGENTS.md` for the full service layer rules.

### When adding a new feature:
1. Create `packages/core/src/services/{feature}-service.ts`
2. Write unit tests in `packages/core/src/services/__tests__/{feature}-service.test.ts`
3. Create thin Server Actions in `ui/features/{feature}/actions.ts`
4. Use `AuditService.log()` or an equivalent platform logging abstraction for create/update/delete operations

## Skills

Repo-local skills require runtime wiring. Run `pnpm skills:setup` (or `./skills/setup.sh --opencode`) so OpenCode can discover `.agents/skills` before relying on local skills such as `drizzle`, `supabase`, `sentry`, and the design-system skills.

Skills not yet auto-synced (available globally or without metadata): `issue-creation`, `branch-pr`, `pr-review`. These are invoked by context from each workspace's own AGENTS.md auto-invoke table.

### Auto-invoke Skills

When performing these actions, ALWAYS invoke the corresponding skill FIRST:

| Action | Skill |
|--------|-------|
| Adding error tracking to Server Actions | `sentry` |
| After creating/modifying a skill | `skill-sync` |
| App Router / Server Actions | `nextjs-15` |
| Configuring RLS at client level | `supabase` |
| Configuring database connections | `supabase-postgres-best-practices` |
| Creating new skills | `skill-creator` |
| Implementing auth flows | `supabase` |
| Optimizing Postgres queries | `supabase-postgres-best-practices` |
| Regenerate AGENTS.md Auto-invoke tables (sync.sh) | `skill-sync` |
| Reviewing schema performance | `supabase-postgres-best-practices` |
| Setting up Supabase SSR cookies | `supabase` |
| Troubleshoot why a skill is missing from AGENTS.md auto-invoke | `skill-sync` |
| Using Zustand stores | `zustand-5` |
| Using captureException or captureActionError | `sentry` |
| Using getUser or getSession | `supabase` |
| Working with Supabase clients | `supabase` |
| Working with Tailwind classes | `tailwind-4` |
| Working with error boundaries | `sentry` |
| Writing Playwright E2E tests | `playwright` |
| Writing React components | `react-19` |
| Writing TypeScript types/interfaces | `typescript` |

## Language Policy (ENFORCED)

**ALL generated artifacts MUST be in English.** No exceptions — code, comments, commits, docs, types, file names, error messages, test descriptions.

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

See `ui/AGENTS.md` for E2E test rules and conventions.

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
