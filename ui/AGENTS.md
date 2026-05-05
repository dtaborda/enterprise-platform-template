# @enterprise/web — Agent Instructions

## Purpose

Next.js 15 App Router application. This is the deployable frontend workspace that consumes all `@enterprise/*` packages.

### Auto-invoke Skills

When performing these actions, ALWAYS invoke the corresponding skill FIRST:

| Action | Skill |
|--------|-------|
| Adding RLS policies | `drizzle` |
| Adding error tracking to Server Actions | `sentry` |
| Adding hover states or transitions | `design-rules` |
| App Router / Server Actions | `nextjs-15` |
| Building dashboard cards or panels | `design-components` |
| Building mobile-first UI | `design-components` |
| Choosing between border and tonal shift | `design-rules` |
| Choosing colors for components | `design-tokens` |
| Composing layout structure | `design-rules` |
| Composing shadcn components for a screen | `design-components` |
| Configuring RLS at client level | `supabase` |
| Creating cards, panels, or containers | `design-rules` |
| Creating database relations | `drizzle` |
| Creating database schemas | `drizzle` |
| Creating feature components | `design-components` |
| Creating navigation or layout components | `design-components` |
| Defining auth-related database schemas or RLS policies | `drizzle` |
| Defining spacing or border radius values | `design-tokens` |
| Defining table columns and types | `drizzle` |
| Implementing auth flows | `supabase` |
| Implementing pgvector/embeddings | `drizzle` |
| Modifying globals.css or @theme tokens | `design-tokens` |
| Running migrations | `drizzle` |
| Setting typography font families or weights | `design-tokens` |
| Setting up Supabase SSR cookies | `supabase` |
| Styling component visual hierarchy | `design-rules` |
| Using Zustand stores | `zustand-5` |
| Using captureException or captureActionError | `sentry` |
| Using getUser or getSession | `supabase` |
| Working with Supabase clients | `supabase` |
| Working with Tailwind classes | `tailwind-4` |
| Working with error boundaries | `sentry` |
| Writing Playwright E2E tests | `playwright` |
| Writing React components | `react-19` |
| Writing TypeScript types/interfaces | `typescript` |
| Writing database queries | `drizzle` |

---

## Rules

1. **Feature-based structure**: Each feature module lives in `features/{module}/` with `actions.ts`, `queries.ts`, `schemas.ts`, `types.ts`, `components/`, and `hooks/`.
2. **Server Actions are thin wrappers**: Validate with Zod, get authenticated client, call service, return `ActionResult<T>`. No business logic here.
3. **Server Components first**: Use Client Components (`"use client"`) only when interactivity is required (forms, event handlers, hooks).
4. **Path aliases**: Use `@/` to import from within this workspace (e.g., `@/features/auth/actions`).
5. **Package imports**: Use workspace aliases (`@enterprise/ui`, `@enterprise/core`, `@enterprise/contracts`).
6. **No default exports**: Except Next.js pages (`page.tsx`), layouts (`layout.tsx`), and error boundaries (`error.tsx`).
7. **E2E tests**: Every feature with dashboard pages MUST have Playwright E2E tests in `e2e/{feature}/`.

## Key Directories

| Directory | Purpose |
|-----------|---------|
| `app/` | Next.js App Router pages, layouts, and route handlers |
| `features/` | Feature modules (actions, queries, components, hooks) |
| `components/` | Shared app-level components (not feature-specific) |
| `lib/` | App-level utilities (Sentry helpers, shared hooks) |
| `e2e/` | Playwright E2E test suites |
| `test-utils/` | Shared test utilities and helpers |

## Design Reference

Before implementing ANY UI component or page, follow this workflow:

1. **Check existing UI primitives and tokens** — Inspect `packages/ui/src/components/` and `packages/ui/src/styles/globals.css` before creating new UI.
2. **Check existing screens or generate a reference** — If a Stitch project exists, query its MCP for relevant reference screens. Otherwise, implement using existing component patterns.
3. **Implement following the design** — Use tokens from `globals.css`, follow existing tonal layering and spacing patterns, use `@enterprise/ui` primitives consistently.

Design references are DIRECTION, not pixel-perfect. The source of truth is the existing `@enterprise/ui` package plus the local CSS token definitions.

## E2E Test Rules

- Every feature that adds dashboard pages MUST include Playwright E2E tests
- Tests cover: CRUD happy paths + critical edge cases (auth, validation, error states)
- Use Page Object Model pattern (see `playwright` skill)
- Auth helper in `e2e/helpers/auth.ts` for login flow reuse
- Test files: `e2e/{feature}/{feature}.spec.ts`

### SDD Task Generation Rule
When `sdd-tasks` generates a task breakdown for a feature with UI pages, it MUST include:
- A testing phase with E2E test tasks for every user-facing flow
- Unit test tasks for contracts, utilities, and business logic
