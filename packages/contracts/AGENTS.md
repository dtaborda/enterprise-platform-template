# @enterprise/contracts — Agent Instructions

## Purpose

Single source of truth for all data shapes (DTOs). Every Zod schema, input type, and enum lives here.

### Auto-invoke Skills

When performing these actions, ALWAYS invoke the corresponding skill FIRST:

| Action | Skill |
|--------|-------|
| Creating Zod schemas | `zod-4` |
| Implementing feature business logic | `nextjs-15` |
| Making permission or role-based decisions | `typescript` |
| Updating DTO validation | `zod-4` |
| Writing input validation for Server Actions | `zod-4` |

---

## Rules

1. **Zero internal deps**: Only dependency is `zod`. Never import from `@enterprise/core`, `@enterprise/ui`, or `@enterprise/web`
2. **Schema naming**: Always suffix with `Schema` (e.g., `createResourceSchema`)
3. **Type inference**: Derive TypeScript types from schemas using `z.infer<typeof schema>`
4. **File organization**: One file per domain — `auth.ts`, `resources.ts`, `common.ts`, `notifications.ts`
5. **Barrel export**: `index.ts` re-exports everything
6. **Enums**: Define as `const` arrays + `z.enum()` for runtime validation AND type narrowing

## When to Add Here

- Any input/output shape for a Server Action
- Any shared type used across features
- Any enum used in the database or UI
- Any validation schema

## When NOT to Add Here

- UI-only types (component props) → keep in the component file
- Supabase-generated types → keep in `@enterprise/core` or generate separately
