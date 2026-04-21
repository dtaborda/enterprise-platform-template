# @enterprise/db — Agent Instructions

> **Scope**: `@enterprise/db` — Drizzle ORM schema and migration generation

### Auto-invoke Skills

Use the repo-local `drizzle` skill for schema and migration work after running `pnpm skills:setup` (or `./skills/setup.sh --opencode`) so the runtime can see `.agents/skills`.

---

## CRITICAL RULES — NON-NEGOTIABLE

### Schema-Only Package

This package is **SCHEMA-ONLY**. It defines the database structure using Drizzle ORM.

- ✅ Define tables, columns, enums, indexes, and RLS policies here
- ✅ Export schema types (`$inferSelect`, `$inferInsert`) for use by other packages
- ❌ NEVER include query logic, repositories, or feature business logic here
- ❌ NEVER include seed data or test fixtures here
- ❌ NEVER import from `@enterprise/core`, `@enterprise/ui`, or `@enterprise/web`

### What Drizzle CAN and CANNOT Generate

| Artifact | In Drizzle schema? | How |
|----------|-------------------|-----|
| Tables, columns, indexes | ✅ | `pgTable` |
| Enums | ✅ | `pgEnum()` |
| Foreign keys | ✅ | `.references()` / `foreignKey()` |
| RLS policies | ✅ | schema-level policy declarations |
| Triggers | ❌ | Custom SQL migration |
| Custom SQL functions | ❌ | Custom SQL migration |
| Extensions (`uuid-ossp`, `pgcrypto`) | ❌ | Custom SQL migration |

## Migration Workflow

**⛔ NEVER use `db:push` from this package** — the script is intentionally blocked.

The correct workflow:

```bash
# 1. Modify schema in src/schema/platform.ts

# 2. Generate a migration from the schema
pnpm --filter @enterprise/db db:generate

# 3. Review the generated SQL in supabase/migrations/

# 4. If you need triggers/functions/extensions, add a custom SQL migration file

# 5. Apply locally with Supabase CLI
supabase db reset
```

Drizzle outputs to `supabase/migrations/` (configured in `drizzle.config.ts`). Supabase CLI reads from that directory for local resets and CI pushes.

### Migration Review Rule (MANDATORY)

After running `db:generate`, ALWAYS open the generated SQL file and verify it is incremental:

- ✅ Good: contains only the new changes (`ALTER TABLE`, `CREATE POLICY`, etc.)
- ❌ Bad: contains a full schema dump for objects that already exist

If drizzle loses track of the previous snapshot and generates a full dump, discard it and create a targeted SQL migration manually.

### Migration File Format

Supabase CLI expects flat `.sql` files directly in `supabase/migrations/`.

Examples:
- ✅ `supabase/migrations/20260420000001_initial_schema.sql`
- ✅ `supabase/migrations/20260420000002_custom_triggers.sql`

## Drizzle Schema Conventions

- Use UUID primary keys with `defaultRandom()`
- Include `createdAt` and `updatedAt` on every table
- Use snake_case for database columns and camelCase for TypeScript fields
- Export `$inferSelect` and `$inferInsert` types
- Review generated SQL before committing

## Package Structure

```
packages/db/
├── drizzle.config.ts     # Drizzle Kit configuration
├── package.json
├── tsconfig.json
├── AGENTS.md
└── src/
    ├── index.ts               # Barrel export
    └── schema/
        └── platform.ts        # Tables, enums, and exported schema types
```

## Dependency Direction

```
@enterprise/db → drizzle-orm ONLY
```

No other workspace packages. Keep this package isolated.
