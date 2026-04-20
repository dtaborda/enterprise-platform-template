# Query Patterns

Detailed Drizzle ORM query patterns — select, insert, update, delete, joins, pagination.

> **Where does query code live?** `packages/db/` is schema-only. All query logic belongs
> in `packages/core/` (business logic / repositories) or Server Actions / Route Handlers
> in `ui/`. Import schemas from `@sala/db` and the Drizzle client from your core package.

---

## Select

```typescript
import { eq, desc, and, or, like, sql } from 'drizzle-orm';

// Basic select
const allUsers = await db.select().from(users);

// Select with filter
const activeUsers = await db
  .select()
  .from(users)
  .where(eq(users.isActive, true));

// Select with relations (join)
const postsWithAuthors = await db
  .select({
    id: posts.id,
    title: posts.title,
    authorName: users.name,
  })
  .from(posts)
  .innerJoin(users, eq(posts.userId, users.id))
  .where(eq(posts.isPublished, true))
  .orderBy(desc(posts.createdAt))
  .limit(10)
  .offset(0);

// Complex where clauses
const filtered = await db
  .select()
  .from(courses)
  .where(and(
    eq(courses.status, 'published'),
    or(
      eq(courses.level, 'beginner'),
      eq(courses.level, 'intermediate'),
    ),
    like(courses.title, '%React%'),
  ));
```

---

## Insert

```typescript
// Insert with returning
const [newPost] = await db
  .insert(posts)
  .values({
    title: 'My Post',
    content: 'Content here',
    userId: 'uuid-here',
  })
  .returning();

// Batch insert
await db.insert(posts).values([
  { title: 'Post 1', content: '...', userId: '...' },
  { title: 'Post 2', content: '...', userId: '...' },
]);

// Upsert (insert or update on conflict)
await db
  .insert(users)
  .values({ id: userId, email, name })
  .onConflictDoUpdate({
    target: users.email,
    set: { name, updatedAt: new Date() },
  });
```

---

## Update

```typescript
const [updated] = await db
  .update(posts)
  .set({
    title: 'New Title',
    updatedAt: new Date(),
  })
  .where(and(
    eq(posts.id, postId),
    eq(posts.userId, userId), // Only owner can update
  ))
  .returning();
```

---

## Delete

```typescript
await db
  .delete(posts)
  .where(and(
    eq(posts.id, postId),
    eq(posts.userId, userId),
  ));
// CASCADE handles related records automatically
```

---

## Relations

### One-to-Many

```typescript
import { relations } from 'drizzle-orm';

// Define relations on the "one" side
export const usersRelations = relations(users, ({ many }) => ({
  posts: many(posts),
  comments: many(comments),
}));

// Define relations on the "many" side
export const postsRelations = relations(posts, ({ one, many }) => ({
  author: one(users, {
    fields: [posts.userId],
    references: [users.id],
  }),
  comments: many(comments),
}));
```

### Many-to-Many (Join Table)

```typescript
export const courseEnrollments = pgTable('course_enrollments', {
  id: uuid('id').primaryKey().defaultRandom(),
  courseId: uuid('course_id').notNull().references(() => courses.id, { onDelete: 'cascade' }),
  userId: uuid('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  progress: integer('progress').default(0).notNull(),
  enrolledAt: timestamp('enrolled_at', { withTimezone: true }).defaultNow().notNull(),
}, (table) => ({
  uniqueEnrollment: uniqueIndex('enrollment_unique').on(table.courseId, table.userId),
}));

export const enrollmentRelations = relations(courseEnrollments, ({ one }) => ({
  course: one(courses, { fields: [courseEnrollments.courseId], references: [courses.id] }),
  user: one(users, { fields: [courseEnrollments.userId], references: [users.id] }),
}));
```

### Query with Relations (Relational API)

```typescript
// Using Drizzle's relational query API
// NOTE: Nested `where` uses a callback form: (fields, operators) => condition
const usersWithPosts = await db.query.users.findMany({
  with: {
    posts: {
      where: (fields, { eq }) => eq(fields.isPublished, true),
      orderBy: (fields, { desc }) => desc(fields.createdAt),
      limit: 5,
    },
  },
});
```

---

## Pagination

```typescript
// Offset-based pagination
const page = 1;
const pageSize = 20;

const results = await db
  .select()
  .from(courses)
  .where(eq(courses.status, 'published'))
  .orderBy(desc(courses.createdAt))
  .limit(pageSize)
  .offset((page - 1) * pageSize);

// Count total for pagination metadata
const [{ count }] = await db
  .select({ count: sql<number>`count(*)` })
  .from(courses)
  .where(eq(courses.status, 'published'));
```

---

## Transactions

```typescript
await db.transaction(async (tx) => {
  const [course] = await tx
    .insert(courses)
    .values({ title: 'New Course', /* ... */ })
    .returning();

  await tx.insert(courseEnrollments).values({
    courseId: course.id,
    userId: currentUserId,
  });
});
```
