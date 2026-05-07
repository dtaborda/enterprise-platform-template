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

## Critical Rules — Non-Negotiable

### React

- ALWAYS: `import { useState, useEffect } from "react"`
- NEVER: `import React`, `import * as React`, `import React as *`
- NEVER: `useMemo`, `useCallback` (React Compiler handles optimization)

### Types

- ALWAYS: `const X = { A: "a", B: "b" } as const; type T = typeof X[keyof typeof X]`
- NEVER: `type T = "a" | "b"` (string union without const object)

### Interfaces

- ALWAYS: One level depth only; nested object property → dedicated interface
- ALWAYS: Reuse via `extends`
- NEVER: Inline nested objects in interface definitions

### Styling

- Single class: `className="bg-background text-foreground"`
- Merge classes: `className={cn(BASE_STYLES, variant && "variant-class")}`
- Dynamic values: `style={{ width: "50%" }}`
- NEVER: `var()` in className, hex colors in className, inline color literals

### Server Actions

- ALWAYS: Validate with Zod → get authenticated client → call service → return `ActionResult<T>`
- NEVER: Business logic inside Server Actions (service layer only)
- NEVER: Direct DB queries in actions (go through `@enterprise/core` services)

---

## Decision Trees

### Component Placement

```
New component needed?
├── Used in 1 feature only? → features/{feature}/components/
├── Used in 2+ features? → components/{domain}/
└── Is it a UI primitive? → belongs in @enterprise/ui, not here
```

### Code Location

```
Server action         → features/{feature}/actions.ts
Server query          → features/{feature}/queries.ts
Types (shared 2+)    → features/{feature}/types.ts or shared types/
Types (local 1)      → colocate in the file that uses them
Hooks (shared 2+)    → lib/hooks/
Hooks (local 1)      → features/{feature}/hooks/
Zod schemas          → @enterprise/contracts (ALWAYS, not local)
```

### Client vs Server

```
Needs interactivity (forms, event handlers, hooks)?
├── Yes → "use client" directive
└── No  → Server Component (no directive needed)
         └── Fetch data → pass to Client Components as props
```

---

## Patterns

### Server Component (data fetching)

```typescript
export default async function Page() {
  const data = await getData();
  return <FeatureView data={data} />;
}
```

### Server Action (thin wrapper)

```typescript
"use server";

import { createResourceSchema } from "@enterprise/contracts";
import { ResourceService } from "@enterprise/core";

export async function createResource(formData: FormData): Promise<ActionResult<Resource>> {
  const validated = createResourceSchema.parse(Object.fromEntries(formData));
  const client = await getAuthenticatedClient();
  return ResourceService.create(client, validated);
}
```

### Form + Zod Validation

```typescript
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { createResourceSchema } from "@enterprise/contracts";

const form = useForm({ resolver: zodResolver(createResourceSchema) });
```

### Playwright E2E Test

```typescript
export class FeaturePage extends BasePage {
  readonly submitBtn = this.page.getByRole("button", { name: "Submit" });
  async goto() { await super.goto("/dashboard/feature"); }
  async submit() { await this.submitBtn.click(); }
}

test("creates resource", { tag: ["@critical"] }, async ({ page }) => {
  const p = new FeaturePage(page);
  await p.goto();
  await p.submit();
  await expect(page).toHaveURL("/dashboard/feature/success");
});
```

---

## Rules

1. **Feature-based structure**: Each feature module lives in `features/{module}/` with `actions.ts`, `queries.ts`, `schemas.ts`, `types.ts`, `components/`, and `hooks/`.
2. **Server Actions are thin wrappers**: Validate with Zod, get authenticated client, call service, return `ActionResult<T>`. No business logic here.
3. **Server Components first**: Use Client Components (`"use client"`) only when interactivity is required (forms, event handlers, hooks).
4. **Path aliases**: Use `@/` to import from within this workspace (e.g., `@/features/auth/actions`).
5. **Package imports**: Use workspace aliases (`@enterprise/ui`, `@enterprise/core`, `@enterprise/contracts`).
6. **No default exports**: Except Next.js pages (`page.tsx`), layouts (`layout.tsx`), and error boundaries (`error.tsx`).
7. **E2E tests**: Every feature with dashboard pages MUST have Playwright E2E tests in `e2e/{feature}/`.

---

## Project Structure

```
ui/
├── app/
│   ├── (auth)/              # Auth pages (login, register, forgot-password)
│   ├── (marketing)/         # Public landing pages (SSR)
│   └── (dashboard)/         # Authenticated app (Server Components + Client)
├── features/                # Feature modules (THE primary code location)
│   └── {feature}/
│       ├── actions.ts       # Server Actions (thin wrappers)
│       ├── queries.ts       # Server-side data fetching
│       ├── types.ts         # Feature-local types
│       ├── components/      # Feature-specific UI
│       └── hooks/           # Feature-specific hooks
├── components/              # Shared app-level components (used by 2+ features)
├── lib/                     # App-level utilities (Sentry helpers, shared hooks)
├── e2e/                     # Playwright E2E test suites
│   └── {feature}/
│       └── {feature}.spec.ts
├── test-utils/              # Shared test utilities and helpers
└── styles/                  # Global CSS overrides (if any)
```

---

## Design Reference

Before implementing ANY UI component or page, follow this workflow:

1. **Check existing UI primitives and tokens** — Inspect `packages/ui/src/components/` and `packages/ui/src/styles/globals.css` before creating new UI.
2. **Check existing screens or generate a reference** — If a Stitch project exists, query its MCP for relevant reference screens. Otherwise, implement using existing component patterns.
3. **Implement following the design** — Use tokens from `globals.css`, follow existing tonal layering and spacing patterns, use `@enterprise/ui` primitives consistently.

Design references are DIRECTION, not pixel-perfect. The source of truth is the existing `@enterprise/ui` package plus the local CSS token definitions.

---

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

---

## Commands

```bash
pnpm dev              # Start dev server
pnpm typecheck        # TypeScript compilation check
pnpm lint             # Biome lint
pnpm test             # Vitest unit tests
pnpm e2e              # Playwright E2E tests
pnpm e2e:ui           # Playwright with UI mode
```

---

## QA Checklist (before commit)

- [ ] `pnpm typecheck` passes
- [ ] `pnpm lint` passes
- [ ] Relevant E2E tests pass
- [ ] All UI states handled (loading, error, empty)
- [ ] No secrets in code (use `.env.local`)
- [ ] Server-side validation present on every action
- [ ] Error messages sanitized (no stack traces to user)
