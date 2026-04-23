# Service Layer Pattern

This template places all business logic in `@enterprise/core` services so Server Actions remain thin, testable orchestration wrappers.

---

## Why services exist

Without a service layer, logic gets duplicated across actions, route handlers, and components.

The service pattern solves this by centralizing:

- Validation-adjacent business rules
- Persistence logic orchestration
- Error code conventions
- Audit logging calls for CUD operations

Benefits:

1. **Separation of concerns** — UI orchestration is separate from domain logic.
2. **Testability** — services accept injected Supabase clients and can be mocked.
3. **Reusability** — one service can be called by actions, jobs, or future APIs.

## Service contract

Services use the `ServiceResult<T>` union:

```ts
export interface ServiceSuccess<T> {
  success: true;
  data: T;
}

export interface ServiceFailure {
  success: false;
  error: string;
  code?: string;
}

export type ServiceResult<T> = ServiceSuccess<T> | ServiceFailure;
```

Rules:

- First argument is always a `SupabaseClient`.
- Return `ServiceResult<T>` (never Next.js response types).
- No `"use server"`, `redirect`, or `revalidatePath` in services.

## Server Action contract

Server Actions are thin wrappers with this flow:

```text
validate input (Zod)
   -> get authenticated server client
   -> call service
   -> map ServiceResult to ActionResult / redirect
   -> revalidatePath if needed
```

## Example: service function

```ts
export async function createResource(
  client: SupabaseClient,
  tenantId: string,
  userId: string,
  input: CreateResourceDto,
): Promise<ServiceResult<ResourceEntity>> {
  const { data, error } = await client
    .from("resources")
    .insert({
      tenant_id: tenantId,
      created_by: userId,
      title: input.title,
      type: input.type,
    })
    .select()
    .single();

  if (error) {
    return { success: false, error: error.message, code: "CREATE_FAILED" };
  }

  return { success: true, data: mapRow(data) };
}
```

## Example: action wrapper

```ts
"use server";

export async function createResourceAction(input: Record<string, unknown>) {
  const parsed = createResourceSchema.safeParse(input);
  if (!parsed.success) {
    return { success: false, error: { code: "VALIDATION_ERROR", message: "Invalid input" } };
  }

  const supabase = await getServerClient();
  const auth = await getAuthContext(supabase);
  if (!auth?.tenantId) {
    return { success: false, error: { code: "UNAUTHORIZED", message: "Authentication required" } };
  }

  const result = await createResource(supabase, auth.tenantId, auth.userId, parsed.data);
  if (!result.success) {
    return { success: false, error: { code: result.code ?? "CREATE_FAILED", message: result.error } };
  }

  revalidatePath("/dashboard/resources");
  return { success: true, data: result.data };
}
```

## Testing strategy

Service tests live in:

- `packages/core/src/services/__tests__/*.test.ts`

Test approach:

1. Mock Supabase client methods (`from`, `select`, `insert`, etc.).
2. Assert success and failure result shapes.
3. Assert error code mapping (`CREATE_FAILED`, `LIST_FAILED`, etc.).
4. Keep Next.js concerns out of service tests.

## Naming and location conventions

- File path: `packages/core/src/services/{feature}-service.ts`
- Test path: `packages/core/src/services/__tests__/{feature}-service.test.ts`
- Exporting: through local service index when part of platform surface

## What goes where (quick checklist)

| Concern | Put it in |
|---------|-----------|
| Zod schema | `@enterprise/contracts` |
| DB table and RLS | `@enterprise/db` |
| Business rule and query orchestration | `@enterprise/core/services/*` |
| Input parsing, auth context, revalidation | `ui/features/*/actions.ts` |
| UI rendering and interaction | `ui/app/*` + `ui/features/*/components` |

## Related docs

- [Request Flow](./request-flow.md)
- [Resources Module](./resources-module.md)
- [Architecture Overview](./overview.md)
