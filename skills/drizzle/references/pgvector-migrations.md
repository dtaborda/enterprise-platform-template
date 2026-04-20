# pgvector & Migrations

Patterns for AI embeddings with pgvector and migration workflows with Supabase.

---

## pgvector (AI/Embeddings)

### Prerequisites

The `vector` extension must be enabled in your Supabase project before using pgvector columns.

```sql
-- Run once in Supabase SQL Editor or in a migration
CREATE EXTENSION IF NOT EXISTS vector;
```

### Schema with Vector Column

```typescript
import { pgTable, uuid, text, timestamp, vector, index } from 'drizzle-orm/pg-core';

export const documents = pgTable('documents', {
  id: uuid('id').primaryKey().defaultRandom(),
  title: text('title').notNull(),
  content: text('content').notNull(),
  embedding: vector('embedding', { dimensions: 1536 }),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
}, (table) => ({
  // HNSW index for cosine similarity search
  embeddingIndex: index('doc_embedding_idx')
    .using('hnsw', table.embedding.op('vector_cosine_ops')),
}));

export type Document = typeof documents.$inferSelect;
export type NewDocument = typeof documents.$inferInsert;
```

### Index Types for Vectors

| Index | Use Case | Speed | Accuracy |
|-------|----------|-------|----------|
| **HNSW** | Default choice, fast ANN | Fast | High |
| **IVFFlat** | Large datasets, lower memory | Medium | Medium |

```typescript
// HNSW indexes for different distance metrics
(table) => ({
  l2: index('l2_idx').using('hnsw', table.embedding.op('vector_l2_ops')),
  ip: index('ip_idx').using('hnsw', table.embedding.op('vector_ip_ops')),
  cosine: index('cosine_idx').using('hnsw', table.embedding.op('vector_cosine_ops')),
})
```

### Similarity Search

```typescript
import { cosineDistance, desc, gt, sql } from 'drizzle-orm';

const findSimilarDocuments = async (query: string) => {
  const queryEmbedding = await generateEmbedding(query);

  const similarity = sql<number>`1 - (${cosineDistance(documents.embedding, queryEmbedding)})`;

  return await db
    .select({
      id: documents.id,
      title: documents.title,
      similarity,
    })
    .from(documents)
    .where(gt(similarity, 0.7)) // ✅ Use gt() instead of raw SQL interpolation
    .orderBy(desc(similarity))  // ✅ Use desc() directly on the expression
    .limit(5);
};
```

### RAG Pattern (Retrieval-Augmented Generation)

```typescript
// 1. Store documents with embeddings
async function indexDocument(title: string, content: string) {
  const embedding = await generateEmbedding(content);
  await db.insert(documents).values({ title, content, embedding });
}

// 2. Retrieve relevant context
async function getContext(query: string, limit = 5) {
  const docs = await findSimilarDocuments(query);
  return docs.map(d => d.title + ': ' + d.content).join('\n\n');
}

// 3. Use context in AI prompt
async function chat(userMessage: string) {
  const context = await getContext(userMessage);
  return callLLM(`Context:\n${context}\n\nQuestion: ${userMessage}`);
}
```

---

## Migrations

### drizzle.config.ts

```typescript
// packages/db/drizzle.config.ts
import { defineConfig } from 'drizzle-kit';

export default defineConfig({
  dialect: 'postgresql',
  schema: './src/schema.ts',
  out: './migrations',
  migrations: {
    prefix: 'supabase', // Supabase-compatible timestamps
  },
  // NOTE: This project does NOT use dbCredentials here.
  // Migrations are applied via `supabase db push`, not drizzle-kit migrate.
  // If you need dbCredentials for local dev tooling (e.g. drizzle-kit studio),
  // add it as an optional override — but it is NOT part of the standard workflow.
});
```

### Commands

```bash
# Generate migration SQL from schema changes
pnpm db:generate          # drizzle-kit generate

# Apply migration to Supabase (after generate)
supabase db push          # Pushes generated SQL to hosted Supabase

# Open Drizzle Studio (run from packages/db/, requires dbCredentials)
pnpm --filter @sala/db db:studio
```

> **Blocked commands**: `pnpm db:push` is intentionally blocked in this repo
> (destructive — can drop columns). `pnpm db:migrate` and `pnpm db:pull` do not exist.
> Always use `pnpm db:generate` then `supabase db push`.

### Supabase Workflow

```bash
# The ONLY supported workflow in this project:
# 1. Modify schema in packages/db/src/schema.ts
# 2. Generate migration SQL
pnpm db:generate              # Creates SQL in ./migrations/
# 3. Review the generated SQL
# 4. Apply to Supabase
supabase db push              # Applies to hosted Supabase
```

### Migration Best Practices

1. **Always generate before push** — review the SQL before applying
2. **Commit migration files** — they are your schema history
3. **Never edit generated SQL** — re-generate from schema instead
4. **Use `supabase` prefix** — compatible with Supabase migration numbering
5. **Test locally first** — use `supabase start` for local development

---

## Drizzle Client Setup

> **Important**: `packages/db/` is a schema-only package. Client setup and query logic
> belong in `packages/core/` or directly in Server Actions / Route Handlers in `ui/`.
> Do NOT place a `client.ts` file in `packages/db/`.

### Where to Create the Client

> **NOTE**: The `postgres` package is NOT currently installed in this project.
> The project uses `@supabase/ssr` for database access. The pattern below is for
> direct Drizzle access if you choose to bypass the Supabase client. Install first:
> `pnpm --filter @sala/core add postgres`

```typescript
// packages/core/src/db/client.ts (example location — NOT in packages/db/)
import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import * as schema from '@sala/db';

const connectionString = process.env.DATABASE_URL!;

// For queries (transaction pooler)
const queryClient = postgres(connectionString);
export const db = drizzle(queryClient, { schema });
```

> For Supabase RLS enforcement in Server Actions, use the Supabase client's built-in
> RLS passthrough (via the user's JWT) rather than manually setting `request.jwt.claims`
> with raw SQL interpolation, which is unsafe and error-prone.
