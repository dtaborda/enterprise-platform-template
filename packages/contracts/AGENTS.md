# @enterprise/contracts — Agent Instructions

## Purpose

Single source of truth for all data shapes (DTOs). Every Zod schema, input type, and enum lives here.

### Auto-invoke Skills

When performing these actions, invoke the corresponding installed skill FIRST:

| Action | Skill |
|--------|-------|
| TypeScript types, DTO exports, strict-mode fixes | `typescript` |
| Making permission or role-based decisions | `typescript` |

There is currently **no installed Zod 3 skill** in this repo. Follow the local rules below for schema work.

---

## Rules

1. **Zero internal deps**: Only dependency is `zod`. Never import from `@enterprise/core`, `@enterprise/ui`, or `@enterprise/web`
2. **Schema naming**: Always suffix with `Schema` (e.g., `createResourceSchema`)
3. **Type inference**: Derive TypeScript types from schemas using `z.infer<typeof schema>`
4. **File organization**: Keep shared contracts in the current structure — `src/dto/platform.ts`, `src/schemas/platform.ts`, and `src/types/platform.ts`
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
