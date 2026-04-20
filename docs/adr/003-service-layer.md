# ADR 003: Service Layer Architecture

## Status
Accepted

## Context
Following the successful pattern from SAL-32 in sala-tickets, we establish service layer as the standard for business logic in the platform.

## Decision

### Service Pattern
All business logic lives in services, not in Server Actions:

```typescript
// ❌ Wrong - business logic in Server Action
export async function createEntity(formData: FormData) {
  // Validation logic
  // Query logic  
  // Business rules
  // All mixed together
}

// ✅ Correct - thin Server Action wrapper
export async function createEntity(prev: unknown, formData: FormData) {
  const input = validateInput(formData);  // Validation
  const result = await createEntityService(client, input);  // Service
  return result;  // Return typed result
}
```

### Service Result Type
Services return `ServiceResult<T>`:

```typescript
export type ServiceSuccess<T> = { success: true; data: T };
export type ServiceFailure = { success: false; error: string; code?: string };
export type ServiceResult<T> = ServiceSuccess<T> | ServiceFailure;
```

### Dependency Injection
Services receive Supabase client as first argument:

```typescript
export async function createEntityService(
  client: SupabaseClient,
  data: CreateEntityInput
): Promise<ServiceResult<Entity>> {
  // Service doesn't know about auth context - caller provides client
}
```

### What Goes Where

| Layer | Responsibility |
|-------|---------------|
| Server Actions | Validate input, call service, handle redirects/revalidation |
| Services | Business logic, queries, validation |
| Supabase Client | Database operations (injected) |

## Consequences
- Services are testable with mocked Supabase client
- Server Actions remain thin (~20 lines each)
- Business logic is reusable across different entry points
- Clear separation of concerns

## References
- SAL-32: https://linear.app/sala-tickets/issue/SAL-32