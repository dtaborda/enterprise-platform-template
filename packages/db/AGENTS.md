# @enterprise/db — Agent Instructions

> **Scope**: `@enterprise/db` — Drizzle ORM schema and migration generation

### Auto-invoke Skills

When performing these actions, ALWAYS invoke the corresponding skill FIRST:

| Action | Skill |
|--------|-------|
| Adding RLS policies | `drizzle` |
| Creating database relations | `drizzle` |
| Creating database schemas | `drizzle` |
| Defining table columns and types | `drizzle` |
| Implementing pgvector/embeddings | `drizzle` |
| Running migrations | `drizzle` |
| Working with Supabase auth | `drizzle` |
| Writing database queries | `drizzle` |

---

## CRITICAL RULES — NON-NEGOTIABLE

### Schema-Only Package

This package is **SCHEMA-ONLY**. It defines the database structure using Drizzle ORM.

- ✅ Define tables, columns, relations, enums, indexes, and **RLS policies** here
- ✅ Use `pgTable.withRLS()` on every table
- ✅ Use `pgPolicy()` with Supabase helpers (`authenticatedRole`, `anonRole`, `authUid`)
- ✅ Use `foreignKey()` with `authUsers` for profiles FK to `auth.users`
- ✅ Export schema types (`$inferSelect`, `$inferInsert`) for use by other packages
- ❌ NEVER include query logic, repositories, or database client setup here
- ❌ NEVER include seed data or test fixtures here
- ❌ NEVER import from `@enterprise/core`, `@enterprise/ui`, or `@enterprise/web`

### What Drizzle CAN and CANNOT Generate

| Artifact | In Drizzle schema? | How |
|----------|-------------------|-----|
| Tables, columns, indexes | ✅ | `pgTable.withRLS()` |
| Enums | ✅ | `pgEnum()` |
| Foreign keys (including to `auth.users`) | ✅ | `foreignKey()` + `authUsers` |
| RLS policies | ✅ | `pgPolicy()` in table callback |
| Relations (ORM-level joins) | ✅ | `relations()` |
| Triggers | ❌ | Custom migration (`db:generate --custom`) |
| Custom SQL functions | ❌ | Custom migration (`db:generate --custom`) |
| Extensions (`uuid-ossp`, etc.) | ❌ | Custom migration (`db:generate --custom`) |

### Migration Workflow

**⛔ NEVER use `db:push`** — it is intentionally blocked.

The correct workflow:

```bash
# 1. Modify schema in src/schema.ts
# 2. Generate migration from schema (tables, RLS, indexes)
pnpm db:generate
# → Output goes to supabase/migrations/ (configured in drizzle.config.ts)

# 3. For triggers/functions/extensions, generate a custom migration:
pnpm --filter @enterprise/db drizzle-kit generate --custom
# Then write the SQL manually in the generated file

# 4. Review ALL generated SQL in supabase/migrations/
# 5. Locally: supabase db reset (applies all migrations + seed)
# 6. In CI: supabase db push (applies only pending migrations)
```

**CRITICAL**: Drizzle outputs to `supabase/migrations/` (NOT `packages/db/migrations/`).
This is the SINGLE source of truth for migrations. Supabase CLI reads from this directory
for both `db reset` (local) and `db push` (CI/production).

**Why not `db:push`?** It's destructive — it can drop columns and lose data. Always use `db:generate` to create a reviewable migration file.

### Migration Review Rule (MANDATORY)

After running `db:generate`, **ALWAYS open the generated SQL file and verify it is incremental**:

- ✅ **Good**: Contains only the new changes (e.g., `CREATE POLICY`, `ALTER TABLE ADD COLUMN`)
- ❌ **Bad**: Contains `CREATE TABLE` or `CREATE TYPE` for objects that already exist

**When does this go wrong?** After any schema file reorganization (splitting, renaming, moving files), drizzle-kit can lose its snapshot reference and generate a **full schema dump** instead of an incremental diff. This causes CI failures because existing objects can't be re-created.

**If you see a full dump:**
1. Delete the generated migration directory
2. Use `pnpm --filter @enterprise/db drizzle-kit generate --custom` instead
3. Write the SQL manually with only the specific change needed

### Migration File Format (MANDATORY)

Supabase CLI expects migrations as **flat `.sql` files** directly in `supabase/migrations/`:

- ✅ `supabase/migrations/20260416012146_add_resource_delete_policy.sql`
- ❌ `supabase/migrations/20260416012146_shallow_zaran/migration.sql`

Drizzle-kit generates migrations as **directories** containing `migration.sql` + `snapshot.json`. After running `db:generate`, you MUST flatten the output:

```bash
# After db:generate, flatten the directory:
mv supabase/migrations/<timestamp>_<name>/migration.sql supabase/migrations/<timestamp>_<descriptive_name>.sql
rm -rf supabase/migrations/<timestamp>_<name>/
```

If you skip this step, `supabase start` and `supabase db reset` will **silently ignore the migration** and it won't be applied in CI.

### Drizzle Schema Conventions

- ✅ Use `pgTable.withRLS()` — every table has RLS enabled
- ✅ Use `uuid` for primary keys with `defaultRandom()`
- ✅ Include `createdAt` and `updatedAt` on every table
- ✅ Use snake_case for column names (Postgres convention)
- ✅ Use camelCase for TypeScript field names (Drizzle handles mapping)
- ✅ Export `$inferSelect` and `$inferInsert` types for every table
- ✅ CASCADE on foreign keys (`.references(() => parent.id, { onDelete: 'cascade' })`)
- ✅ Define RLS policies using `pgPolicy()` with `authenticatedRole`, `anonRole`, `authUid`
- ✅ Use `foreignKey()` with `authUsers` from `drizzle-orm/supabase` for auth FK
- ❌ NEVER use serial IDs — use UUIDs
- ❌ NEVER edit generated migration SQL — re-generate from schema
- ❌ NEVER use `authUid` in application queries — only in `pgPolicy` definitions

## Package Structure

```
packages/db/
├── drizzle.config.ts     # Drizzle Kit configuration
├── package.json
├── tsconfig.json
├── AGENTS.md
└── src/
    ├── index.ts           # Barrel re-export (backward compatible)
    ├── helpers.ts         # RLS SQL fragments (isTenantMember, isAdminOrAbove, etc.)
    ├── platform.ts        # Platform tables: tenants, profiles, userRoleEnum
    ├── domain.ts          # Domain tables (feature-specific tables, enums)
    └── relations.ts       # All Drizzle relations() (cross-boundary, imports both platform + domain)
```

**Dependency direction**: `helpers` ← `platform` ← `domain`, `relations` imports both. No circular imports.

## Dependency Direction

```
@enterprise/db → drizzle-orm ONLY
```

No other workspace packages. This is the most isolated package in the monorepo.
