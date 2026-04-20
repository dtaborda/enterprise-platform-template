# Code Conventions

## TypeScript

### Always Use Const Types

```typescript
// ✅ Correct - const object first, then extract type
const STATUS = {
  ACTIVE: "active",
  INACTIVE: "inactive",
} as const;

type Status = (typeof STATUS)[keyof typeof STATUS];

// ❌ Wrong - direct union types
type Status = "active" | "inactive";
```

### Flat Interfaces

```typescript
// ✅ Correct - one level depth, nested objects → dedicated interface
interface UserAddress {
  street: string;
  city: string;
}

interface User {
  id: string;
  name: string;
  address: UserAddress;
}

// ❌ Wrong - inline nested objects
interface User {
  address: { street: string; city: string };
}
```

### Never Use `any`

```typescript
// ✅ Use unknown for truly unknown types
function parse(input: unknown): User {
  if (isUser(input)) return input;
  throw new Error("Invalid input");
}

// ✅ Use generics for flexible types
function first<T>(arr: T[]): T | undefined {
  return arr[0];
}

// ❌ Never
function parse(input: any): any { }
```

## Zod (Validation)

### Use Zod 4 Syntax

```typescript
// ✅ Zod 4
z.email()
z.uuid()
z.string().min(1)

// ❌ Zod 3
z.string().email()
z.string().uuid()
z.string().nonempty()
```

### Schema Organization

```typescript
// packages/contracts/src/schemas/entity.ts
import { z } from "zod";

export const entitySchema = z.object({
  id: z.uuid(),
  createdAt: z.date(),
  updatedAt: z.date(),
});

export const createEntitySchema = z.object({
  name: z.string().min(1).max(255),
});

export type CreateEntityInput = z.infer<typeof createEntitySchema>;
export type Entity = z.infer<typeof entitySchema>;
```

## Drizzle (Database)

### Schema Conventions

```typescript
// ✅ Always use UUID for primary keys
id: uuid("id").primaryKey().defaultRandom()

// ✅ Use snake_case in DB, Drizzle converts to camelCase
avatar_url: text("avatar_url")

// ✅ Both timestamps with timezone
createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull()

// ✅ Export inferred types
export type User = typeof users.$inferSelect;
export type NewUser = typeof users.$inferInsert;
```

### RLS Policies

```typescript
// ✅ Enable RLS on every table
export const users = pgTable.withRLS("users", { ... });

// ✅ Use helper functions for tenant isolation
pgPolicy("users_select", users, {
  for: "select",
  using: isTenantMember,
});
```

## React / Next.js

### Server Actions

```typescript
// ✅ Thin wrapper - validate → call service → return result
"use server";

import { validateInput } from "./schema";
import { createEntityService } from "@enterprise/core";

export async function createEntity(prev: unknown, formData: FormData) {
  const input = validateInput(formData);
  const result = await createEntityService(input);
  
  if (!result.success) {
    return { success: false, error: result.error };
  }
  
  revalidatePath("/entities");
  return { success: true, data: result.data };
}
```

### Client Components

```typescript
// ✅ Use 'use client' only when needed
"use client";

import { useState } from "react";

export function MyComponent() {
  const [state, setState] = useState("");
  
  return <div>{state}</div>;
}
```

## Testing

### Unit Tests (Vitest)

```typescript
import { describe, it, expect, vi } from "vitest";

describe("myService", () => {
  it("should do something", async () => {
    const result = await myService(mockClient, input);
    expect(result.success).toBe(true);
  });
});
```

### E2E Tests (Playwright)

```typescript
import { test, expect } from "@playwright/test";

test("user can login", async ({ page }) => {
  await page.goto("/login");
  await page.fill('[name="email"]', "test@example.com");
  await page.click('button[type="submit"]');
  await expect(page).toHaveURL("/dashboard");
});
```

## Git Commits

Use Conventional Commits:

```
feat: add new feature
fix: fix a bug
refactor: code refactoring
docs: documentation changes
test: add tests
chore: maintenance
```

## File Organization

```
packages/
├── contracts/     # Types, Zod schemas, DTOs
│   └── src/
│       ├── types/
│       ├── schemas/
│       └── dto/
├── db/            # Drizzle schema, migrations
│   └── src/
│       └── schema/
├── core/          # Supabase clients, services
│   └── src/
│       ├── supabase/
│       └── services/
└── ui/            # Design tokens, components
    └── src/
        ├── tokens/
        └── components/
```