# Extension Patterns

## Overview

The enterprise platform template is designed to be extended with domain-specific functionality. This guide shows how to add new features while maintaining the platform boundaries.

## Adding a New Package

### 1. Create the Package Structure

```
packages/
├── my-domain/           # New package directory
│   ├── package.json
│   ├── src/
│   │   ├── index.ts
│   │   ├── schema.ts    # Drizzle schema (if DB needed)
│   │   ├── services/     # Business logic
│   │   └── contracts/    # DTOs and Zod schemas
```

### 2. Configure package.json

```json
{
  "name": "@enterprise/my-domain",
  "dependencies": {
    "@enterprise/contracts": "workspace:*",
    "@enterprise/core": "workspace:*",
    "@enterprise/db": "workspace:*"
  }
}
```

### 3. Add to turbo.json

```json
{
  "tasks": {
    "build": {
      "dependsOn": ["^build"],
      "outputs": ["dist/**"]
    }
  }
}
```

## Adding Domain Entities

### Database Schema

In `packages/my-domain/src/schema.ts`:

```typescript
import { pgTable, uuid, text, timestamp } from "drizzle-orm/pg-core";
import { isTenantMember } from "@enterprise/db/helpers";

export const myEntities = pgTable.withRLS(
  "my_entities",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    tenantId: uuid("tenant_id").notNull(),
    name: text("name").notNull(),
    createdAt: timestamp("created_at").defaultNow().notNull(),
  },
  (t) => ({
    // Add RLS policies
    selectPolicy: {
      for: "select",
      using: isTenantMember,
    },
  })
);

export type MyEntity = typeof myEntities.$inferSelect;
```

### Services

In `packages/my-domain/src/services/my-entity-service.ts`:

```typescript
import type { ServiceResult } from "@enterprise/core/services/types";

export async function createMyEntity(
  client: SupabaseClient,
  data: CreateMyEntityInput
): Promise<ServiceResult<MyEntity>> {
  const { data: entity, error } = await client
    .from("my_entities")
    .insert(data)
    .select()
    .single();

  if (error) {
    return { success: false, error: error.message };
  }

  return { success: true, data: entity };
}
```

## Adding UI Components

In `packages/ui/src/components/`:

```typescript
// Export design tokens
export { colors, typography, spacing } from "@enterprise/ui/tokens";

// Add domain-specific components
export { MyEntityCard } from "./my-entity-card";
```

## Extension Checklist

When adding new functionality:

- [ ] Follow package naming convention (`@enterprise/[domain]`)
- [ ] Use platform packages for shared functionality
- [ ] Implement RLS policies for all tables
- [ ] Add service layer (don't put logic in Server Actions)
- [ ] Write tests using Vitest
- [ ] Add E2E tests with Playwright
- [ ] Update documentation