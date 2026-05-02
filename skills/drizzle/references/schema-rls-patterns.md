# Schema & RLS Patterns

Detailed patterns for Drizzle ORM schema definition and Row Level Security policies with Supabase.

---

## Schema Definition

### Basic Table with Conventions

```typescript
// packages/db/src/schema/platform.ts
import { pgTable, pgPolicy, sql, uuid, text, timestamp, boolean, integer, pgEnum } from 'drizzle-orm/pg-core';
import { relations } from 'drizzle-orm';
import { authenticatedRole, anonRole } from 'drizzle-orm/supabase';

// ✅ ALWAYS: Use snake_case in DB, Drizzle maps to camelCase in TS
// ✅ Use explicit column names: uuid("id"), text("email"), etc.
// ✅ Use .primaryKey().defaultRandom() order (matches repo convention)
// ✅ Use .defaultNow().notNull() order for timestamps
export const users = pgTable.withRLS('users', {
  id: uuid('id').primaryKey().defaultRandom(),
  email: text('email').notNull().unique(),
  name: text('name').notNull(),
  avatarUrl: text('avatar_url'),
  isActive: boolean('is_active').default(true).notNull(),
  loginCount: integer('login_count').default(0).notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
}, (table) => [
  pgPolicy('authenticated can read', {
    for: 'select',
    to: authenticatedRole,
    using: sql`true`,
  }),
]);

// ✅ ALWAYS export inferred types for every table
export type UserRow = typeof users.$inferSelect;
export type NewUserRow = typeof users.$inferInsert;
```

### Enums

```typescript
export const userRoleEnum = pgEnum('user_role', ['user', 'admin', 'moderator']);
export const courseLevelEnum = pgEnum('course_level', ['beginner', 'intermediate', 'advanced']);
export const courseStatusEnum = pgEnum('course_status', ['draft', 'published', 'archived']);

export const courses = pgTable('courses', {
  // ...
  status: courseStatusEnum().notNull().default('draft'),
  level: courseLevelEnum(), // nullable enum (use dedicated enum, NOT userRoleEnum)
});
```

### Column Types Reference

| DB Type | Drizzle Type | Notes |
|---------|--------------|-------|
| `uuid` | `uuid()` | Use `.defaultRandom()` for auto-gen |
| `text` | `text()` | Strings, JSON as string |
| `varchar(n)` | `varchar('col', { length: n })` | Use `text()` unless length constraint is required |
| `integer` | `integer()` | Whole numbers |
| `boolean` | `boolean()` | true/false |
| `timestamp with tz` | `timestamp({ withTimezone: true })` | Always use timezone |
| `jsonb` | `jsonb()` | JSON objects |
| `text[]` | `text().array()` | String arrays |
| `numeric` | `numeric()` | Decimal (use `real` for float) |
| `vector(n)` | `vector()` | For pgvector embeddings |

---

## RLS Policies

### Import Supabase Helpers

```typescript
import { pgPolicy, sql } from 'drizzle-orm/pg-core';
import {
  authenticatedRole,
  anonRole,
  authUsers,
  authUid,
} from 'drizzle-orm/supabase';
```

### Policy Patterns

```typescript
// ✅ ALWAYS use pgTable.withRLS() for tables with policies.
export const posts = pgTable.withRLS('posts', {
  id: uuid('id').primaryKey().defaultRandom(),
  title: text('title').notNull(),
  content: text('content').notNull(),
  userId: uuid('user_id').notNull(),
  isPublished: boolean('is_published').default(false).notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
}, (table) => [
  // Public read for published posts
  publishedRead: pgPolicy('published posts are public', {
    for: 'select',
    to: anonRole,
    using: sql`${table.isPublished} = true`,
  }),

  // Authenticated users can create
  authenticatedInsert: pgPolicy('authenticated can create', {
    for: 'insert',
    to: authenticatedRole,
    withCheck: sql`true`,
  }),

  // Users can only update THEIR own posts
  ownerUpdate: pgPolicy('owners can update own posts', {
    for: 'update',
    to: authenticatedRole,
    using: sql`${table.userId} = auth.uid()`,
  }),

  // Owners can delete
  ownerDelete: pgPolicy('owners can delete own posts', {
    for: 'delete',
    to: authenticatedRole,
    using: sql`${table.userId} = auth.uid()`,
  }),
]);
```

### Available Policy Options

```typescript
pgPolicy('policy name', {
  for: 'select',           // 'select' | 'insert' | 'update' | 'delete'
  to: authenticatedRole,    // anonRole, authenticatedRole, serviceRole, or custom
  using: sql`...`,          // SELECT/UPDATE/DELETE — filter accessible rows
  withCheck: sql`...`,      // INSERT/UPDATE — validation on written data
});
```

### Roles Reference

| Role | Use Case |
|------|----------|
| `anonRole` | Public access, no auth required |
| `authenticatedRole` | Logged-in users only |
| `serviceRole` | Bypass RLS (admin operations) |

---

## Supabase Auth Integration

### FK to auth.users

```typescript
import { foreignKey } from 'drizzle-orm/pg-core';
import { authUsers } from 'drizzle-orm/supabase';

export const profiles = pgTable('profiles', {
  id: uuid('id').primaryKey(),
  email: text('email').notNull(),
  fullName: text('full_name'),
  avatarUrl: text('avatar_url'),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
}, (table) => ({
  authFk: foreignKey({
    columns: [table.id],
    foreignColumns: [authUsers.id],
    name: 'profiles_auth_fk',
  }).onDelete('cascade'),
}));
```

### authUid — RLS Policy Context Only

`authUid` resolves to `auth.uid()` and is designed for use **inside `pgPolicy` definitions only**.
Do NOT use it as an application-level query filter.

```typescript
// ✅ CORRECT: authUid in RLS policy definition
import { authUid } from 'drizzle-orm/supabase';

pgPolicy('owners can read own posts', {
  for: 'select',
  to: authenticatedRole,
  using: sql`${table.userId} = ${authUid}`,
});

// ❌ WRONG: authUid as application query filter
// const myPosts = await db.select().from(posts).where(sql`${posts.userId} = ${authUid}`);

// ✅ CORRECT: Pass user ID explicitly from your auth context
const myPosts = await db
  .select()
  .from(posts)
  .where(eq(posts.userId, currentUserId));
```

---

## Indexes

```typescript
import { index, uniqueIndex } from 'drizzle-orm/pg-core';

export const orders = pgTable('orders', {
  // ... columns
}, (table) => ({
  // Single column index
  statusIdx: index('orders_status_idx').on(table.status),

  // Composite index
  userStatusIdx: index('orders_user_status_idx').on(table.userId, table.status),

  // Unique index
  uniqueOrder: uniqueIndex('orders_unique_user').on(table.userId, table.orderNumber),

  // Expression index
  lowerEmailIdx: index('users_lower_email_idx').on(sql`lower(${table.email})`),
}));
```
