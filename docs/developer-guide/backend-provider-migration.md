---
title: "Backend provider migration guide"
description: "How the port/adapter pattern works in Enterprise Platform, how to use it with zero changes (default Supabase path), and how to wire a custom auth or storage provider."
owner: "Engineering"
lastUpdated: "2026-05-31"
---

# Backend provider migration guide

## Purpose

This guide explains the port/adapter abstraction layer introduced in `packages/core` for
authentication, storage, and session management. It covers:

- What changed and why
- The default Supabase path (zero changes needed)
- Before/after examples for code that calls auth services
- How to create a custom adapter for a different provider
- How to wire adapters through environment variables
- How to write tests using port mocks
- Common pitfalls to avoid

## Scope

- Included: `AuthPort`, `StoragePort`, `SessionPort` interfaces; `SupabaseAuthAdapter`, `SupabaseStorageAdapter`, `SupabaseSessionAdapter`; `createBackendAdapters()` factory; mock helpers for unit tests
- Excluded: `DatabasePort` (planned for a later phase — see [rfc.md](../features/backend-provider-decoupling/rfc.md)); Realtime abstraction; community adapters for Firebase, Clerk, Auth0 (extension points — not shipped)

---

## Overview — what changed and why

Before this change, `auth-service.ts` accepted `SupabaseClient` directly and called
`client.auth.*` inline. This created a hard coupling between the service layer and the
Supabase SDK. Swapping to a different auth provider (Firebase, Clerk, Auth0) required
rewriting every service function.

The port/adapter pattern solves this by introducing a provider-agnostic interface
(`AuthPort`) that any auth backend can satisfy. The `SupabaseAuthAdapter` implements
`AuthPort` using the Supabase SDK — it is the reference implementation and the default.
All services now accept `AuthPort` instead of `SupabaseClient` for auth operations.

This follows the same pattern already established by the billing feature
(`PaymentProviderPort` + `createPaymentAdapter()`). Adopters familiar with billing have
zero new concepts to learn.

**Key guarantee**: The default Supabase path is behaviorally identical to the pre-refactor
direct calls. All existing tests and E2E flows pass without modification.

---

## Quick start — default Supabase path works with zero changes

If you are using Supabase (the default), no changes are required. The factory
`createBackendAdapters()` returns Supabase adapters automatically when
`BACKEND_AUTH_PROVIDER` and `BACKEND_STORAGE_PROVIDER` are unset (or set to `"supabase"`).

The only required environment variables remain the same:

```bash
NEXT_PUBLIC_SUPABASE_URL=https://<project-ref>.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=<anon-key>
```

You do not need to set `BACKEND_AUTH_PROVIDER` or `BACKEND_STORAGE_PROVIDER` for the
default path.

---

## Before/after: auth service callers

The auth service functions changed their first argument from `SupabaseClient` to `AuthPort`.
The caller site in Server Actions changes to wire the adapter via `createBackendAdapters()`.

### Sign-in action

```typescript
// ✅ After — ui/features/auth/actions.ts
"use server";
import { getServerClient } from "@enterprise/core/supabase/server";
import { createBackendAdapters } from "@enterprise/core/services/backend-adapters";
import { signInWithPasswordService } from "@enterprise/core/services/auth-service";

// Factory called once at module level — safe because it only reads env vars.
// The client (request-scoped) is passed per-invocation below.
const { auth: authFactory } = createBackendAdapters();

export async function signInAction(input: SignInInput): Promise<ActionResult<SignInData>> {
  const client = await getServerClient();
  const auth = authFactory(client);                  // ← per-request adapter
  const result = await signInWithPasswordService(auth, input);
  // ...
}
```

```typescript
// ❌ Before (pre-refactor)
import { signInWithPasswordService } from "@enterprise/core/services/auth-service";

export async function signInAction(input: SignInInput): Promise<ActionResult<SignInData>> {
  const client = await getServerClient();
  const result = await signInWithPasswordService(client, input);  // ← direct client
  // ...
}
```

### Why `authFactory(client)` instead of passing the adapter directly

`SupabaseClient` is request-scoped — it must be created per-request from
`getServerClient()`. The factory returns a function `(client: SupabaseClient) => AuthPort`
so the expensive Supabase environment setup happens once at module level, while the
request-specific client is wired per-invocation.

### Service layer signature changes

| Function | Before | After |
|----------|--------|-------|
| `signInWithPasswordService` | `(client: SupabaseClient, input)` | `(auth: AuthPort, input)` |
| `signUpService` | `(client: SupabaseClient, input)` | `(auth: AuthPort, input)` |
| `signOutService` | `(client: SupabaseClient)` | `(auth: AuthPort)` |
| `getCurrentPlatformUserService` | `(client: SupabaseClient)` | `(auth: AuthPort)` |
| `getUserRoleService` | `(client: SupabaseClient, userId)` | `(auth: AuthPort, userId)` |
| `requestPasswordResetService` | `(client: SupabaseClient, input)` | `(auth: AuthPort, input)` |
| `updatePasswordService` | `(client: SupabaseClient, input)` | `(auth: AuthPort, input)` |

---

## How to create a custom auth adapter

To swap to a different auth provider, implement the `AuthPort` interface. Every method
returns `ServiceResult<T>` — the same discriminated union used across the service layer.

```typescript
// ✅ Correct — custom adapter implementing AuthPort
import type { AuthPort } from "@enterprise/core/services/ports/auth-port";
import type {
  ServiceResult,
  SignInServiceData,
  SignInServiceInput,
  SignUpServiceData,
  SignUpServiceInput,
  PasswordResetServiceInput,
  UpdatePasswordServiceInput,
  UserRoleServiceData,
} from "@enterprise/core/services/auth-service";
import type { PlatformUser } from "@enterprise/contracts";

export class MyCustomAuthAdapter implements AuthPort {
  constructor(private readonly apiKey: string) {}

  async signInWithPassword(input: SignInServiceInput): Promise<ServiceResult<SignInServiceData>> {
    // Call your provider SDK
    // Map the response to ServiceResult<{ role: UserRole }>
    // NEVER throw — return { success: false, error: "...", code: "..." } on failure
    return { success: true, data: { role: "member" } };
  }

  async signUp(input: SignUpServiceInput): Promise<ServiceResult<SignUpServiceData>> {
    return { success: true, data: { userId: "...", needsEmailConfirmation: false } };
  }

  async signOut(): Promise<ServiceResult<null>> {
    return { success: true, data: null };
  }

  async getUser(): Promise<ServiceResult<PlatformUser | null>> {
    return { success: true, data: null };
  }

  async getUserRole(userId: string): Promise<ServiceResult<UserRoleServiceData>> {
    // Role may come from JWT claims (no DB call needed) or from your own DB
    return { success: true, data: { role: "member" } };
  }

  async requestPasswordReset(input: PasswordResetServiceInput): Promise<ServiceResult<null>> {
    return { success: true, data: null };
  }

  async updatePassword(input: UpdatePasswordServiceInput): Promise<ServiceResult<null>> {
    return { success: true, data: null };
  }
}
```

**Rules for adapter implementors:**

- NEVER throw from an adapter method — always return `{ success: false, error, code }` on failure
- Use `ServiceResult<T>` from `@enterprise/core/services/auth-service` as the return type
- `getUser()` MUST validate the token server-side (equivalent to Supabase's `getUser()`, NOT `getSession()`)
- `getUserRole()` may read from JWT claims if your provider embeds the role, or query your own DB

---

## How to create a custom storage adapter

Implement `StoragePort` from `packages/core/src/services/ports/storage-port.ts`:

```typescript
// ✅ Correct — S3-based storage adapter
import type { StoragePort, StorageUploadOptions, StorageUploadResult,
  StorageSignedUrlResult, StoragePublicUrlResult, StorageFileEntry } from
  "@enterprise/core/services/ports/storage-port";
import type { ServiceResult } from "@enterprise/core/services/auth-service";

export class S3StorageAdapter implements StoragePort {
  constructor(private readonly s3Client: S3Client, private readonly region: string) {}

  async upload(
    bucket: string,
    path: string,
    file: Blob | File | ArrayBuffer,
    options?: StorageUploadOptions,
  ): Promise<ServiceResult<StorageUploadResult>> {
    // Map to PutObjectCommand
    return { success: true, data: { path, fullPath: `${bucket}/${path}` } };
  }

  // ... implement remaining methods
}
```

The `bucket` and `path` values always follow `STORAGE_BUCKETS` and `STORAGE_PATHS` from
`packages/core/src/supabase/storage-paths.ts`. These constants are provider-agnostic naming
conventions — they work with any adapter.

---

## How to wire a custom adapter via environment variables

Update `packages/core/src/services/backend-adapters.ts` to instantiate your adapter when
the custom provider is selected:

```typescript
// ✅ Correct — wiring a custom auth adapter in backend-adapters.ts
import { MyCustomAuthAdapter } from "./adapters/my-custom-auth-adapter";

// Inside createBackendAdapters():
if (authProvider === "supabase") {
  authFactory = (client) => new SupabaseAuthAdapter(client);
} else if (authProvider === "custom") {
  const apiKey = process.env["CUSTOM_AUTH_API_KEY"];
  if (!apiKey) throw new Error("[createBackendAdapters] Missing CUSTOM_AUTH_API_KEY");
  authFactory = (_client) => new MyCustomAuthAdapter(apiKey);
} else {
  throw new Error(`[createBackendAdapters] Unknown BACKEND_AUTH_PROVIDER: "${authProvider}"`);
}
```

Then set the environment variable:

```bash
# .env.local
BACKEND_AUTH_PROVIDER=custom
CUSTOM_AUTH_API_KEY=<your-api-key>
```

> **Note**: When `BACKEND_AUTH_PROVIDER=custom` and you do not use Supabase for session
> management, you must also provide a custom `SessionPort` implementation and wire it in
> `createBackendAdapters()`. The `SupabaseSessionAdapter` requires
> `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY` — if you set both
> `BACKEND_AUTH_PROVIDER=custom` and `BACKEND_STORAGE_PROVIDER=custom` with no Supabase
> connection, replace the session adapter too.

---

## Testing with port mocks

Use the pre-built mock helpers from `packages/core/src/services/__tests__/mocks/` in your
service unit tests. These helpers return fully-typed port implementations where every method
is a `vi.fn()` stub — no Supabase SDK import needed.

### Auth service test

```typescript
// ✅ Correct — testing a service that accepts AuthPort
import { describe, expect, it, vi } from "vitest";
import { createMockAuthPort } from "../mocks";
import { signInWithPasswordService } from "../../auth-service";

describe("signInWithPasswordService", () => {
  it("returns success with role on valid credentials", async () => {
    const auth = createMockAuthPort();
    vi.mocked(auth.signInWithPassword).mockResolvedValue({
      success: true,
      data: { role: "member" },
    });

    const result = await signInWithPasswordService(auth, {
      email: "user@example.com",
      password: "Password123",
    });

    expect(result).toEqual({ success: true, data: { role: "member" } });
  });

  it("propagates INVALID_CREDENTIALS from adapter", async () => {
    const auth = createMockAuthPort();
    vi.mocked(auth.signInWithPassword).mockResolvedValue({
      success: false,
      error: "Invalid credentials",
      code: "INVALID_CREDENTIALS",
    });

    const result = await signInWithPasswordService(auth, {
      email: "user@example.com",
      password: "wrong",
    });

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.code).toBe("INVALID_CREDENTIALS");
    }
  });
});
```

### Storage service test

```typescript
// ✅ Correct — testing a service that accepts StoragePort
import { createMockStoragePort } from "../mocks";

describe("uploadAvatarService", () => {
  it("returns public URL on successful upload", async () => {
    const storage = createMockStoragePort();
    vi.mocked(storage.upload).mockResolvedValue({
      success: true,
      data: { path: "avatars/tenant-1/user-1.webp", fullPath: "avatars/tenant-1/user-1.webp" },
    });
    vi.mocked(storage.getPublicUrl).mockResolvedValue({
      success: true,
      data: { publicUrl: "https://example.supabase.co/storage/v1/object/public/avatars/tenant-1/user-1.webp" },
    });

    // const result = await uploadAvatarService(storage, client, "tenant-1", "user-1", file);
    // expect(result.success).toBe(true);
  });
});
```

### Available mock factories

| Factory | Port | Import |
|---------|------|--------|
| `createMockAuthPort()` | `AuthPort` | `from "./__tests__/mocks"` |
| `createMockStoragePort()` | `StoragePort` | `from "./__tests__/mocks"` |
| `createMockSessionPort()` | `SessionPort` | `from "./__tests__/mocks"` |

Each factory:
- Returns a fresh instance per call (no shared state between tests)
- Wires all interface methods as `vi.fn()` stubs with zero calls on creation
- Is fully typed — TypeScript catches drift between mock and live interface at compile time

---

## Common pitfalls

### Module-level `createBackendAdapters()` calls fail in tests

`createBackendAdapters()` reads `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY`
at call time. In test environments these env vars are not set, causing the factory to throw.

```typescript
// ❌ Wrong — factory called at module level without a test mock
import { createBackendAdapters } from "@enterprise/core/services/backend-adapters";
const { auth: authFactory } = createBackendAdapters();  // throws in vitest
```

```typescript
// ✅ Correct — mock the module in tests that import it
vi.mock("@enterprise/core/services/backend-adapters", () => ({
  createBackendAdapters: vi.fn().mockReturnValue({
    auth: vi.fn().mockReturnValue(createMockAuthPort()),
    storage: vi.fn().mockReturnValue(createMockStoragePort()),
    session: createMockSessionPort(),
  }),
}));
```

This is already handled in `ui/features/auth/actions.test.ts` and
`ui/features/auth/queries.test.ts` — use those files as reference.

### Passing `SupabaseClient` to auth services (new code after decoupling)

After this change merges, new services that touch auth operations MUST accept `AuthPort`,
not `SupabaseClient`. The QA checklist in `packages/core/AGENTS.md` enforces this.

```typescript
// ❌ Wrong — new service accepts SupabaseClient for auth operations
export async function myNewService(client: SupabaseClient, input: MyInput) {
  const { data: { user } } = await client.auth.getUser();  // direct SDK call
  // ...
}

// ✅ Correct — new service accepts AuthPort
export async function myNewService(auth: AuthPort, input: MyInput) {
  const userResult = await auth.getUser();                  // via port
  // ...
}
```

### Request-scoped adapter creation in middleware

Do not call `authFactory(client)` outside of a request handler in middleware. The
`SupabaseClient` created by `createMiddlewareClient()` is scoped to the current request's
cookies. Capturing it at module level would reuse stale cookies across requests.

```typescript
// ❌ Wrong — adapter captured at module level
const supabase = createMiddlewareClient(request, config);
const auth = authFactory(supabase);  // stale after first request

// ✅ Correct — adapter created fresh per request inside the handler
export async function middleware(request: NextRequest) {
  const supabase = createMiddlewareClient(request, middlewareConfig);
  const auth = authFactory(supabase);
  // ...
}
```

### Split dependency: auth port vs. database client

`middleware.ts` currently uses `SessionPort` for session refresh but retains a direct
`SupabaseClient` for the role lookup DB query. This is a documented, temporary state until
`DatabasePort` ships. Do not remove the `createMiddlewareClient()` call — it is needed for
the DB query.

```typescript
// ✅ Correct — documented split dependency in middleware
const { session: sessionPort, auth: authFactory } = createBackendAdapters();

export async function middleware(request: NextRequest) {
  // Session refresh via SessionPort (provider-agnostic)
  const response = await sessionPort.refreshSession(request);

  // Role lookup via Supabase middleware client (DB query — until DatabasePort lands)
  const supabase = createMiddlewareClient(request, middlewareSupabaseConfig);
  // ...
}
```

---

## Reference

- Port interfaces: `packages/core/src/services/ports/`
- Supabase reference adapters: `packages/core/src/services/adapters/`
- Factory: `packages/core/src/services/backend-adapters.ts`
- Mock helpers: `packages/core/src/services/__tests__/mocks/`
- Full RFC and architecture decisions: [docs/features/backend-provider-decoupling/rfc.md](../features/backend-provider-decoupling/rfc.md)
- QA checklist and agent rules: [`packages/core/AGENTS.md`](../../packages/core/AGENTS.md)

---

*Last updated: 2026-05-31*
