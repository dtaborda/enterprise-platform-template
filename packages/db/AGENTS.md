# @enterprise/db — Agent Instructions

## Purpose

Database schema definition using Drizzle ORM. This package is **SCHEMA-ONLY** — it defines the structure, not the queries.

### Auto-invoke Skills

When performing these actions, ALWAYS invoke the corresponding skill FIRST:

| Action | Skill |
|--------|-------|
| Adding RLS policies | `drizzle` |
| Committing changes | `enterprise-commit` |
| Configuring database connections | `supabase-postgres-best-practices` |
| Creating SDD proposals for features | `feature-readiness` |
| Creating a git commit | `enterprise-commit` |
| Creating database relations | `drizzle` |
| Creating database schemas | `drizzle` |
| Defining auth-related database schemas or RLS policies | `drizzle` |
| Defining table columns and types | `drizzle` |
| Implementing pgvector/embeddings | `drizzle` |
| Optimizing Postgres queries | `supabase-postgres-best-practices` |
| Reviewing a feature PRD or RFC | `feature-readiness` |
| Reviewing schema performance | `supabase-postgres-best-practices` |
| Running migrations | `drizzle` |
| Starting feature implementation | `feature-readiness` |
| Writing a feature PRD or RFC | `feature-readiness` |
| Writing database queries | `drizzle` |

---

## Critical Rules — Non-Negotiable

### Scope

- ✅ Define tables, columns, enums, indexes, and RLS policies here
- ✅ Export schema types (`$inferSelect`, `$inferInsert`) for use by other packages
- ❌ NEVER include query logic, repositories, or feature business logic here
- ❌ NEVER include seed data or test fixtures here
- ❌ NEVER import from `@enterprise/core`, `@enterprise/ui`, or `@enterprise/web`

### Migrations

- ALWAYS: Use `pnpm --filter @enterprise/db db:generate` to create migrations
- ALWAYS: Review generated SQL before committing
- ALWAYS: Verify migrations are incremental (only new changes, not full dumps)
- NEVER: Use `db:push` (intentionally blocked)
- NEVER: Edit migration files after they've been applied

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

---

## Decision Trees

### Where Does This Schema Change Go?

```
Is it a new table, column, enum, or index?
├── Yes → Modify src/schema/{domain}.ts
│         └── Run db:generate → review SQL → commit
└── No
    ├── Is it a trigger or function?
    │   └── Write a custom SQL file in supabase/migrations/
    ├── Is it an extension activation?
    │   └── Write a custom SQL file in supabase/migrations/
    └── Is it query logic or a repository?
        └── Does NOT belong here → goes to @enterprise/core
```

### New Table: Which Schema File?

```
Is it a platform concern (tenants, profiles, roles, audit)?
├── Yes → src/schema/platform.ts
└── No  → src/schema/{domain}.ts (create new file for new domain)
```

---

## Patterns

### Table with RLS (multi-tenant)

```typescript
import { sql } from "drizzle-orm";
import { index, pgPolicy, pgTable, text, timestamp, uuid } from "drizzle-orm/pg-core";
import { authenticatedRole } from "drizzle-orm/supabase";

const tenantClaimMatchesColumn = sql`((auth.jwt()->'app_metadata'->>'tenant_id')::uuid = tenant_id)`;

export const resources = pgTable(
  "resources",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    tenantId: uuid("tenant_id").notNull(),
    title: text("title").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    index("resources_tenant_idx").on(table.tenantId),
    pgPolicy("resources_select", {
      as: "permissive",
      for: "select",
      to: authenticatedRole,
      using: tenantClaimMatchesColumn,
    }),
  ],
).enableRLS();
```

### Enum Definition

```typescript
import { pgEnum } from "drizzle-orm/pg-core";

export const resourceStatusEnum = pgEnum("resource_status", [
  "active",
  "draft",
  "archived",
  "suspended",
]);
```

### Type Exports (for consumers)

```typescript
import type { InferInsertModel, InferSelectModel } from "drizzle-orm";

export type Resource = InferSelectModel<typeof resources>;
export type NewResource = InferInsertModel<typeof resources>;
// OR using Drizzle's shorthand:
export type Resource = typeof resources.$inferSelect;
export type NewResource = typeof resources.$inferInsert;
```

### Foreign Key Reference

```typescript
export const profiles = pgTable("profiles", {
  id: uuid("id").defaultRandom().primaryKey(),
  tenantId: uuid("tenant_id")
    .notNull()
    .references(() => tenants.id, { onDelete: "cascade" }),
  userId: uuid("user_id").notNull(),
  // ...
});
```

---

## Rules

1. **Schema-only**: No queries, no business logic, no seed data
2. **UUID primary keys**: Always use `uuid("id").defaultRandom().primaryKey()`
3. **Timestamps**: Every table has `createdAt` and `updatedAt` with timezone
4. **Column naming**: snake_case for DB columns, camelCase for TypeScript fields
5. **RLS required**: Every tenant-scoped table MUST have RLS policies and call `.enableRLS()`
6. **Type exports**: Export `$inferSelect` and `$inferInsert` for each table
7. **Domain files**: One schema file per domain — don't put everything in `platform.ts`

---

## Migration Workflow

```bash
# 1. Modify schema files in src/schema/
# 2. Generate migration
pnpm --filter @enterprise/db db:generate

# 3. Review the generated SQL in supabase/migrations/
# 4. If you need triggers/functions/extensions → add custom SQL file

# 5. Apply locally
supabase db reset
```

### Migration Review Rule (MANDATORY)

After running `db:generate`, ALWAYS open the generated SQL and verify:

- ✅ Good: Contains only the new changes (`ALTER TABLE`, `CREATE POLICY`, etc.)
- ❌ Bad: Contains a full schema dump for objects that already exist

If drizzle generates a full dump, discard it and create a targeted SQL migration manually.

---

## Project Structure

```
packages/db/
├── package.json
├── tsconfig.json
├── drizzle.config.ts          # Drizzle Kit configuration
├── AGENTS.md
└── src/
    ├── index.ts               # Barrel export (all schemas + types)
    └── schema/
        ├── platform.ts        # Platform tables (tenants, profiles, roles, audit)
        └── resources.ts       # Domain tables (new domains get their own file)
```

Migrations output to `supabase/migrations/` (configured in `drizzle.config.ts`).

---

## Dependency Direction

```
@enterprise/db → drizzle-orm ONLY
```

No other workspace packages. Keep this package fully isolated.

---

## Commands

```bash
pnpm --filter @enterprise/db db:generate    # Generate migration from schema changes
pnpm --filter @enterprise/db typecheck      # TypeScript compilation
supabase db reset                           # Apply all migrations locally
```

---

## QA Checklist (before commit)

- [ ] Every table has UUID primary key with `defaultRandom()`
- [ ] Every table has `createdAt` and `updatedAt` timestamps
- [ ] Tenant-scoped tables have RLS policies and `.enableRLS()`
- [ ] Generated migration is incremental (not a full dump)
- [ ] Type exports (`$inferSelect`, `$inferInsert`) present for new tables
- [ ] No query logic or business logic in this package
- [ ] No imports from other `@enterprise/*` packages
- [ ] Schema file named by domain (not generic names like `schema.ts`)
