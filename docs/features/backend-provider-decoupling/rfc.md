---
title: "Backend provider decoupling RFC"
description: "Defines the implementation-ready technical architecture for introducing AuthPort, StoragePort, and SessionPort abstractions in @enterprise/core so the template can work with different backend providers without rewriting business logic."
owner: "Engineering"
lastUpdated: "2026-05-11"
---

# Backend provider decoupling RFC

## Purpose

Define an implementation-ready technical approach for introducing a port/adapter abstraction layer in `@enterprise/core` that decouples the template's business logic from Supabase-specific APIs. Supabase remains the reference implementation and the default — decoupling is additive, not a migration. All existing behavior is preserved exactly. The billing feature already established this pattern with `PaymentProviderPort` + `createPaymentAdapter()`; this RFC extends the same pattern to Auth, Storage, and Session.

## Scope

- Included: `AuthPort` interface, `StoragePort` interface, `SessionPort` interface, Supabase reference adapters for all three ports, a `createBackendAdapters()` provider factory, env-var-driven adapter selection, migration strategy for existing function-based services, and middleware integration for `SessionPort`.
- Excluded: `DatabasePort` abstraction (P1 follow-up — requires deeper analysis of RLS delegation and PostgREST vs Drizzle coupling), `RealtimePort` (P2 — no Realtime features implemented yet), any UI changes, any `@enterprise/contracts` schema changes, community adapters for Firebase / Clerk / Auth0 (extension point — not shipped), and multi-provider runtime fan-out.

---

## Summary

Introduce `AuthPort`, `StoragePort`, and `SessionPort` interfaces in `packages/core/src/services/ports/`, implement Supabase reference adapters for each in `packages/core/src/services/adapters/`, and wire them through a `createBackendAdapters()` factory that selects adapters from env vars. Migrate `auth-service.ts` to accept `AuthPort` instead of `SupabaseClient` for auth operations. Migrate `middleware.ts` to delegate session refresh to `SessionPort` instead of importing `@supabase/ssr` directly. All existing unit tests and E2E tests pass without modification when using the default Supabase adapter path.

## Technical objectives

- `AuthPort`, `StoragePort`, and `SessionPort` are plain TypeScript interfaces — no abstract classes, no SDK imports. Any object satisfying the interface is a valid adapter.
- The Supabase adapter is functionally equivalent to the pre-refactor direct calls — zero behavior change for adopters on the default path.
- `createBackendAdapters()` follows the exact same factory shape as `createPaymentAdapter()` from the billing feature — adopters who understand billing have zero new concepts to learn.
- Adapter selection uses explicit env vars (`BACKEND_AUTH_PROVIDER`, `BACKEND_STORAGE_PROVIDER`), NOT `NODE_ENV`.
- No new required environment variables for the default path. The Supabase adapter continues using `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY`.
- After the refactor, no `@supabase/supabase-js` imports remain in `packages/core/src/services/__tests__/` — all service tests mock via port interfaces.

---

## Port interfaces

### AuthPort

Location: `packages/core/src/services/ports/auth-port.ts`

```typescript
import type {
  RegistrationMetadata,
  UserRole,
} from "@enterprise/contracts";
import type {
  ServiceResult,
  SignInServiceData,
  SignInServiceInput,
  SignUpServiceData,
  SignUpServiceInput,
  PasswordResetServiceInput,
  UpdatePasswordServiceInput,
  UserRoleServiceData,
} from "../auth-service";
import type { PlatformUser } from "@enterprise/contracts";

/**
 * AuthPort — provider-agnostic authentication interface.
 *
 * Implement this interface to swap the auth backend without modifying any
 * service or Server Action. The Supabase reference implementation is
 * `SupabaseAuthAdapter`. Community adapters (Firebase, Clerk, Auth0) implement
 * the same interface.
 *
 * All methods return `ServiceResult<T>` — the same discriminated union used
 * throughout the service layer. Adapters MUST NOT throw; they must return
 * `{ success: false, error: string, code: string }` on failure.
 */
export interface AuthPort {
  /**
   * Authenticates a user with email and password.
   * Returns the user's role on success so the caller can resolve the redirect path.
   */
  signInWithPassword(input: SignInServiceInput): Promise<ServiceResult<SignInServiceData>>;

  /**
   * Registers a new user account.
   * Returns the new userId and whether email confirmation is required before login.
   */
  signUp(input: SignUpServiceInput): Promise<ServiceResult<SignUpServiceData>>;

  /**
   * Terminates the current user session.
   */
  signOut(): Promise<ServiceResult<null>>;

  /**
   * Returns the currently authenticated user, or null if no session is active.
   * Implementors MUST validate the token server-side (equivalent to Supabase's getUser(),
   * NOT getSession() which only decodes the JWT without server-side validation).
   */
  getUser(): Promise<ServiceResult<PlatformUser | null>>;

  /**
   * Returns the platform role for a given userId from the profiles table.
   * This method exists separately because role resolution requires a DB query
   * that may not be part of every auth provider's token claims.
   * Implementors that embed the role in the JWT may resolve it without a DB call.
   */
  getUserRole(userId: string): Promise<ServiceResult<UserRoleServiceData>>;

  /**
   * Sends a password reset email to the specified address.
   * The redirectTo URL is where the provider redirects after the user clicks the link.
   */
  requestPasswordReset(input: PasswordResetServiceInput): Promise<ServiceResult<null>>;

  /**
   * Updates the password for the currently authenticated user.
   * Requires an active session (the user clicked the reset link and is in a password-update flow).
   */
  updatePassword(input: UpdatePasswordServiceInput): Promise<ServiceResult<null>>;
}
```

### StoragePort

Location: `packages/core/src/services/ports/storage-port.ts`

```typescript
/**
 * Metadata passed when uploading a file.
 */
export interface StorageUploadOptions {
  /** MIME type of the file, e.g. "image/png". */
  contentType?: string;
  /** Whether to overwrite an existing file at the same path. Default: true. */
  upsert?: boolean;
}

/**
 * Result of a successful upload.
 */
export interface StorageUploadResult {
  /** Full storage path (bucket-relative) of the uploaded file. */
  path: string;
  /** Full URL of the uploaded file (public or signed depending on bucket config). */
  fullPath: string;
}

/**
 * Result of a signed URL generation.
 */
export interface StorageSignedUrlResult {
  /** Signed URL valid for the requested duration. */
  signedUrl: string;
  /** Expiry time in seconds from now. */
  expiresIn: number;
}

/**
 * Result of a public URL lookup (no expiry, no signature).
 */
export interface StoragePublicUrlResult {
  /** Public URL for the file. Only valid if the bucket is configured as public. */
  publicUrl: string;
}

/**
 * A file entry returned by listFiles.
 */
export interface StorageFileEntry {
  name: string;
  id: string | null;
  updatedAt: Date | null;
  createdAt: Date | null;
  /** File size in bytes. null for folders. */
  size: number | null;
  mimeType: string | null;
}

/**
 * StoragePort — provider-agnostic file storage interface.
 *
 * Implement this interface to swap the storage backend (Supabase Storage, S3,
 * Cloudflare R2, local filesystem) without modifying any service or Server Action.
 *
 * The `bucket` parameter always corresponds to a value from `STORAGE_BUCKETS` in
 * `packages/core/src/supabase/storage-paths.ts`. The path parameters follow the
 * conventions defined by `STORAGE_PATHS`. These constants are provider-agnostic
 * naming conventions — they remain unchanged regardless of which adapter is active.
 *
 * All methods return `ServiceResult<T>`. Adapters MUST NOT throw; they return
 * `{ success: false, error: string, code: string }` on failure.
 */
export interface StoragePort {
  /**
   * Uploads a file to the specified bucket at the given path.
   * @param bucket - The target bucket name (from STORAGE_BUCKETS).
   * @param path - The bucket-relative path (from STORAGE_PATHS helpers).
   * @param file - The file content as Blob, File, or ArrayBuffer.
   * @param options - Optional content-type and upsert flag.
   */
  upload(
    bucket: string,
    path: string,
    file: Blob | File | ArrayBuffer,
    options?: StorageUploadOptions,
  ): Promise<ServiceResult<StorageUploadResult>>;

  /**
   * Downloads a file from the specified bucket.
   * @param bucket - The source bucket name.
   * @param path - The bucket-relative path.
   * @returns The file as a Blob.
   */
  download(bucket: string, path: string): Promise<ServiceResult<Blob>>;

  /**
   * Deletes one or more files from the specified bucket.
   * @param bucket - The source bucket name.
   * @param paths - One or more bucket-relative paths.
   */
  delete(bucket: string, paths: string[]): Promise<ServiceResult<null>>;

  /**
   * Generates a time-limited signed URL for a private file.
   * @param bucket - The source bucket name.
   * @param path - The bucket-relative path.
   * @param expiresIn - URL validity duration in seconds.
   */
  getSignedUrl(
    bucket: string,
    path: string,
    expiresIn: number,
  ): Promise<ServiceResult<StorageSignedUrlResult>>;

  /**
   * Returns the public URL for a file in a public bucket.
   * This does not make a network call — it constructs the URL from the provider's
   * base URL and the bucket/path. Only valid for publicly accessible buckets.
   * @param bucket - The source bucket name.
   * @param path - The bucket-relative path.
   */
  getPublicUrl(bucket: string, path: string): Promise<ServiceResult<StoragePublicUrlResult>>;

  /**
   * Lists files in the specified bucket at the given prefix path.
   * @param bucket - The source bucket name.
   * @param prefix - The path prefix to list under. Defaults to root ("").
   * @param limit - Maximum number of entries to return. Defaults to 100.
   * @param offset - Pagination offset. Defaults to 0.
   */
  listFiles(
    bucket: string,
    prefix?: string,
    limit?: number,
    offset?: number,
  ): Promise<ServiceResult<StorageFileEntry[]>>;
}
```

### SessionPort

Location: `packages/core/src/services/ports/session-port.ts`

```typescript
import type { NextRequest, NextResponse } from "next/server";

/**
 * SessionPort — Next.js middleware-level session management interface.
 *
 * This port is intentionally Next.js-scoped. It returns `NextResponse` because
 * middleware is a Next.js primitive — abstracting this away would require a custom
 * response wrapper that adds complexity without benefit. Adopters who switch
 * frameworks must rewrite middleware regardless.
 *
 * `refreshSession` is the single responsibility: given an incoming request,
 * refresh the session cookie and return a response with updated Set-Cookie headers.
 * The middleware delegates all session refresh logic to this port — it does NOT
 * import `@supabase/ssr` directly.
 *
 * The Supabase reference implementation is `SupabaseSessionAdapter`, which wraps
 * the existing `updateSession()` logic from `packages/core/src/supabase/middleware.ts`.
 */
export interface SessionPort {
  /**
   * Refreshes the authentication session for an incoming middleware request.
   *
   * The implementation is responsible for:
   * 1. Reading the session token from the request cookies.
   * 2. Validating and refreshing the token with the auth provider (server-side).
   * 3. Returning a NextResponse with updated Set-Cookie headers so the refreshed
   *    token is written to the browser.
   *
   * @param request - The incoming Next.js middleware request.
   * @returns A NextResponse with refreshed session cookies, or a pass-through response
   *          if no session exists or no refresh was needed.
   */
  refreshSession(request: NextRequest): Promise<NextResponse>;
}
```

---

## Supabase reference adapters

### SupabaseAuthAdapter

Location: `packages/core/src/services/adapters/supabase-auth-adapter.ts`

The `SupabaseAuthAdapter` is a direct re-expression of the current `auth-service.ts` logic as an adapter class. It wraps `client.auth.*` calls and the `profiles` table lookup. There is NO behavior change — the same Supabase SDK calls, the same error codes, the same `ServiceResult<T>` shapes.

```typescript
import type { SupabaseClient } from "@supabase/supabase-js";
import type { PlatformUser, UserRole } from "@enterprise/contracts";
import type { AuthPort } from "../ports/auth-port";
import type {
  ServiceResult,
  SignInServiceData,
  SignInServiceInput,
  SignUpServiceData,
  SignUpServiceInput,
  PasswordResetServiceInput,
  UpdatePasswordServiceInput,
  UserRoleServiceData,
} from "../auth-service";

/**
 * SupabaseAuthAdapter — implements AuthPort using the Supabase JS client.
 *
 * This is the reference implementation and the canonical example for building
 * custom AuthPort adapters. Each method maps 1:1 to a function in the
 * pre-refactor auth-service.ts.
 *
 * Construction requires a SupabaseClient scoped to the current request
 * (server or middleware client). It is the caller's responsibility to provide
 * the correctly-scoped client — server client for Server Actions, middleware
 * client for middleware flows.
 */
export class SupabaseAuthAdapter implements AuthPort {
  constructor(private readonly client: SupabaseClient) {}

  async signInWithPassword(
    input: SignInServiceInput,
  ): Promise<ServiceResult<SignInServiceData>> {
    // Maps to: client.auth.signInWithPassword() + client.auth.getUser() + getUserRole()
    // Error codes: INVALID_CREDENTIALS, USER_NOT_FOUND, ROLE_LOOKUP_FAILED
    const { error } = await this.client.auth.signInWithPassword({
      email: input.email,
      password: input.password,
    });

    if (error) {
      return { success: false, error: "Invalid credentials", code: "INVALID_CREDENTIALS" };
    }

    const { data: { user } } = await this.client.auth.getUser();

    if (!user) {
      return { success: false, error: "User not found after sign-in", code: "USER_NOT_FOUND" };
    }

    const roleResult = await this.getUserRole(user.id);

    if (!roleResult.success) {
      return roleResult;
    }

    return { success: true, data: { role: roleResult.data.role } };
  }

  async signUp(input: SignUpServiceInput): Promise<ServiceResult<SignUpServiceData>> {
    // Maps to: client.auth.signUp()
    // Error codes: SIGN_UP_FAILED, USER_NOT_CREATED
    const { data, error } = await this.client.auth.signUp({
      email: input.email,
      password: input.password,
      options: {
        data: input.metadata,
        emailRedirectTo: input.emailRedirectTo,
      },
    });

    if (error) {
      return { success: false, error: "Could not create account", code: "SIGN_UP_FAILED" };
    }

    if (!data.user) {
      return { success: false, error: "User was not created", code: "USER_NOT_CREATED" };
    }

    return {
      success: true,
      data: {
        userId: data.user.id,
        needsEmailConfirmation: data.session === null,
      },
    };
  }

  async signOut(): Promise<ServiceResult<null>> {
    // Maps to: client.auth.signOut()
    // Error codes: SIGN_OUT_FAILED
    const { error } = await this.client.auth.signOut();

    if (error) {
      return { success: false, error: "Could not sign out", code: "SIGN_OUT_FAILED" };
    }

    return { success: true, data: null };
  }

  async getUser(): Promise<ServiceResult<PlatformUser | null>> {
    // Maps to: client.auth.getUser() + profiles table lookup
    // Error codes: AUTH_USER_LOOKUP_FAILED
    const { data: { user }, error } = await this.client.auth.getUser();

    if (error) {
      return {
        success: false,
        error: "Could not resolve authenticated user",
        code: "AUTH_USER_LOOKUP_FAILED",
      };
    }

    if (!user) {
      return { success: true, data: null };
    }

    const { data: profile } = await this.client
      .from("profiles")
      .select("tenant_id, role, name, avatar_url")
      .eq("id", user.id)
      .single();

    return {
      success: true,
      data: {
        id: user.id,
        createdAt: new Date(user.created_at),
        updatedAt: new Date(user.updated_at ?? user.created_at),
        email: user.email ?? "",
        name: profile?.name ?? null,
        avatarUrl: profile?.avatar_url ?? null,
        role: (profile?.role as UserRole | undefined) ?? "guest",
        tenantId: profile?.tenant_id ?? "",
      },
    };
  }

  async getUserRole(userId: string): Promise<ServiceResult<UserRoleServiceData>> {
    // Maps to: profiles table lookup for role column
    // Error codes: ROLE_LOOKUP_FAILED
    const { data: profile, error } = await this.client
      .from("profiles")
      .select("role")
      .eq("id", userId)
      .single();

    if (error && error.code !== "PGRST116") {
      return {
        success: false,
        error: "Could not load user role",
        code: "ROLE_LOOKUP_FAILED",
      };
    }

    return {
      success: true,
      data: {
        role: (profile?.role as UserRole | null | undefined) ?? "guest",
      },
    };
  }

  async requestPasswordReset(
    input: PasswordResetServiceInput,
  ): Promise<ServiceResult<null>> {
    // Maps to: client.auth.resetPasswordForEmail()
    // Error codes: PASSWORD_RESET_REQUEST_FAILED
    const { error } = await this.client.auth.resetPasswordForEmail(input.email, {
      redirectTo: input.redirectTo,
    });

    if (error) {
      return {
        success: false,
        error: "Could not send password reset email",
        code: "PASSWORD_RESET_REQUEST_FAILED",
      };
    }

    return { success: true, data: null };
  }

  async updatePassword(
    input: UpdatePasswordServiceInput,
  ): Promise<ServiceResult<null>> {
    // Maps to: client.auth.updateUser({ password })
    // Error codes: PASSWORD_UPDATE_FAILED
    const { error } = await this.client.auth.updateUser({
      password: input.password,
    });

    if (error) {
      return {
        success: false,
        error: "Could not update password",
        code: "PASSWORD_UPDATE_FAILED",
      };
    }

    return { success: true, data: null };
  }
}
```

### SupabaseStorageAdapter

Location: `packages/core/src/services/adapters/supabase-storage-adapter.ts`

The `SupabaseStorageAdapter` wraps the Supabase Storage API. It uses the same `STORAGE_BUCKETS` and `STORAGE_PATHS` constants from `storage-paths.ts` as naming conventions — the constants are not Supabase-specific. Any other adapter can use them too.

```typescript
import type { SupabaseClient } from "@supabase/supabase-js";
import type { StoragePort, StorageUploadOptions, StorageUploadResult,
  StorageSignedUrlResult, StoragePublicUrlResult, StorageFileEntry } from "../ports/storage-port";
import type { ServiceResult } from "../auth-service";

/**
 * SupabaseStorageAdapter — implements StoragePort using the Supabase Storage API.
 *
 * Construction requires a SupabaseClient. In practice this is the server client
 * from `getServerClient()` (authenticated user context) or the admin client for
 * service-role operations.
 *
 * Bucket and path naming conventions follow `STORAGE_BUCKETS` and `STORAGE_PATHS`
 * from `packages/core/src/supabase/storage-paths.ts`. These constants are
 * provider-agnostic — they are just naming conventions that any adapter can use.
 */
export class SupabaseStorageAdapter implements StoragePort {
  constructor(private readonly client: SupabaseClient) {}

  async upload(
    bucket: string,
    path: string,
    file: Blob | File | ArrayBuffer,
    options?: StorageUploadOptions,
  ): Promise<ServiceResult<StorageUploadResult>> {
    // Maps to: client.storage.from(bucket).upload(path, file, { contentType, upsert })
    // Supabase Storage returns { data: { path, fullPath }, error }
    const { data, error } = await this.client.storage
      .from(bucket)
      .upload(path, file, {
        contentType: options?.contentType,
        upsert: options?.upsert ?? true,
      });

    if (error) {
      return {
        success: false,
        error: `Upload failed: ${error.message}`,
        code: "STORAGE_UPLOAD_FAILED",
      };
    }

    return {
      success: true,
      data: { path: data.path, fullPath: data.fullPath },
    };
  }

  async download(bucket: string, path: string): Promise<ServiceResult<Blob>> {
    // Maps to: client.storage.from(bucket).download(path)
    // Returns a Blob; error is a StorageError
    const { data, error } = await this.client.storage.from(bucket).download(path);

    if (error || !data) {
      return {
        success: false,
        error: `Download failed: ${error?.message ?? "no data"}`,
        code: "STORAGE_DOWNLOAD_FAILED",
      };
    }

    return { success: true, data };
  }

  async delete(bucket: string, paths: string[]): Promise<ServiceResult<null>> {
    // Maps to: client.storage.from(bucket).remove(paths)
    const { error } = await this.client.storage.from(bucket).remove(paths);

    if (error) {
      return {
        success: false,
        error: `Delete failed: ${error.message}`,
        code: "STORAGE_DELETE_FAILED",
      };
    }

    return { success: true, data: null };
  }

  async getSignedUrl(
    bucket: string,
    path: string,
    expiresIn: number,
  ): Promise<ServiceResult<StorageSignedUrlResult>> {
    // Maps to: client.storage.from(bucket).createSignedUrl(path, expiresIn)
    const { data, error } = await this.client.storage
      .from(bucket)
      .createSignedUrl(path, expiresIn);

    if (error || !data) {
      return {
        success: false,
        error: `Signed URL failed: ${error?.message ?? "no data"}`,
        code: "STORAGE_SIGNED_URL_FAILED",
      };
    }

    return {
      success: true,
      data: { signedUrl: data.signedUrl, expiresIn },
    };
  }

  async getPublicUrl(
    bucket: string,
    path: string,
  ): Promise<ServiceResult<StoragePublicUrlResult>> {
    // Maps to: client.storage.from(bucket).getPublicUrl(path)
    // Note: Supabase getPublicUrl() never returns an error — it constructs the URL
    // from the project URL without making a network call.
    const { data } = this.client.storage.from(bucket).getPublicUrl(path);

    return {
      success: true,
      data: { publicUrl: data.publicUrl },
    };
  }

  async listFiles(
    bucket: string,
    prefix = "",
    limit = 100,
    offset = 0,
  ): Promise<ServiceResult<StorageFileEntry[]>> {
    // Maps to: client.storage.from(bucket).list(prefix, { limit, offset })
    const { data, error } = await this.client.storage
      .from(bucket)
      .list(prefix, { limit, offset });

    if (error) {
      return {
        success: false,
        error: `List files failed: ${error.message}`,
        code: "STORAGE_LIST_FAILED",
      };
    }

    const entries: StorageFileEntry[] = (data ?? []).map((item) => ({
      name: item.name,
      id: item.id ?? null,
      updatedAt: item.updated_at ? new Date(item.updated_at) : null,
      createdAt: item.created_at ? new Date(item.created_at) : null,
      size: item.metadata?.size ?? null,
      mimeType: item.metadata?.mimetype ?? null,
    }));

    return { success: true, data: entries };
  }
}
```

### SupabaseSessionAdapter

Location: `packages/core/src/services/adapters/supabase-session-adapter.ts`

The `SupabaseSessionAdapter` wraps the existing `updateSession()` function from `packages/core/src/supabase/middleware.ts`. This is a thin wrapper — no new logic is introduced.

```typescript
import type { NextRequest, NextResponse } from "next/server";
import type { SessionPort } from "../ports/session-port";
import { updateSession, type MiddlewareSupabaseConfig } from "../../supabase/middleware";

/**
 * SupabaseSessionAdapter — implements SessionPort using @supabase/ssr.
 *
 * This adapter wraps the existing updateSession() function from
 * packages/core/src/supabase/middleware.ts. The function reads the session
 * token from request cookies, validates it with the Supabase Auth server
 * (via getUser()), and returns a NextResponse with refreshed Set-Cookie headers.
 *
 * Construction requires the Supabase project URL and anon key. These are the
 * same env vars already in use: NEXT_PUBLIC_SUPABASE_URL and
 * NEXT_PUBLIC_SUPABASE_ANON_KEY. No new env vars are introduced.
 */
export class SupabaseSessionAdapter implements SessionPort {
  private readonly config: MiddlewareSupabaseConfig;

  constructor(supabaseUrl: string, supabaseAnonKey: string) {
    this.config = { supabaseUrl, supabaseAnonKey };
  }

  async refreshSession(request: NextRequest): Promise<NextResponse> {
    // Delegates directly to updateSession() — same behavior as pre-refactor middleware.
    // The function creates a server client, calls getUser() to validate and refresh
    // the session, then returns a response with updated cookies.
    return updateSession(request, this.config);
  }
}
```

---

## Adapter factory

### createBackendAdapters()

Location: `packages/core/src/services/backend-adapters.ts`

This factory follows the exact same pattern as `createPaymentAdapter()` from the billing feature. Selection is based on explicit env vars, NOT `NODE_ENV`. Supabase clients are constructed lazily — only when the Supabase provider is selected. Custom adapter paths never touch Supabase env vars.

```typescript
import type { AuthPort } from "./ports/auth-port";
import type { StoragePort } from "./ports/storage-port";
import type { SessionPort } from "./ports/session-port";
import { SupabaseAuthAdapter } from "./adapters/supabase-auth-adapter";
import { SupabaseStorageAdapter } from "./adapters/supabase-storage-adapter";
import { SupabaseSessionAdapter } from "./adapters/supabase-session-adapter";

/**
 * The resolved set of backend adapters.
 * All three ports are returned together so the factory call site has a
 * single, stable dependency to inject.
 */
export interface BackendAdapters {
  /** Auth operations: sign in, sign up, sign out, get user, password reset. */
  auth: AuthPort;
  /** File storage operations: upload, download, delete, signed URL, list. */
  storage: StoragePort;
  /** Middleware-level session refresh — used by ui/middleware.ts. */
  session: SessionPort;
}

/**
 * createBackendAdapters — selects and instantiates the active backend adapters.
 *
 * Selection is driven by env vars:
 *   BACKEND_AUTH_PROVIDER    — "supabase" (default) | "custom"
 *   BACKEND_STORAGE_PROVIDER — "supabase" (default) | "custom"
 *
 * The session adapter has no selection env var: it is always instantiated
 * alongside the auth adapter because session management is tightly coupled
 * to the auth provider in practice.
 *
 * For custom providers, adopters replace the Supabase instantiation block
 * with their own adapter class. The returned interface shape is identical.
 *
 * Throws a descriptive error if an unsupported provider name is set, so
 * misconfiguration fails loudly at startup rather than silently at runtime.
 *
 * @example
 * // Default Supabase path — no env vars needed
 * const adapters = createBackendAdapters();
 *
 * @example
 * // In a Server Action (auth):
 * const { auth } = createBackendAdapters();
 * const client = await getServerClient();
 * return signInWithPasswordService(auth(client), input);
 *
 * @example
 * // In middleware (session):
 * const { session } = createBackendAdapters();
 * const response = await session.refreshSession(request);
 */
export function createBackendAdapters(): {
  auth: (client: import("@supabase/supabase-js").SupabaseClient) => AuthPort;
  storage: (client: import("@supabase/supabase-js").SupabaseClient) => StoragePort;
  session: SessionPort;
} {
  const authProvider = process.env["BACKEND_AUTH_PROVIDER"] ?? "supabase";
  const storageProvider = process.env["BACKEND_STORAGE_PROVIDER"] ?? "supabase";

  // --- Auth adapter factory ---
  let authFactory: (client: import("@supabase/supabase-js").SupabaseClient) => AuthPort;

  if (authProvider === "supabase") {
    authFactory = (client) => new SupabaseAuthAdapter(client);
  } else {
    throw new Error(
      `[createBackendAdapters] Unknown BACKEND_AUTH_PROVIDER: "${authProvider}". ` +
        `Supported values: "supabase". Custom adapters: implement AuthPort and ` +
        `return a new instance in this factory.`,
    );
  }

  // --- Storage adapter factory ---
  let storageFactory: (client: import("@supabase/supabase-js").SupabaseClient) => StoragePort;

  if (storageProvider === "supabase") {
    storageFactory = (client) => new SupabaseStorageAdapter(client);
  } else {
    throw new Error(
      `[createBackendAdapters] Unknown BACKEND_STORAGE_PROVIDER: "${storageProvider}". ` +
        `Supported values: "supabase". Custom adapters: implement StoragePort and ` +
        `return a new instance in this factory.`,
    );
  }

  // --- Session adapter (always Supabase in MVP; no selection env var) ---
  const supabaseUrl = process.env["NEXT_PUBLIC_SUPABASE_URL"];
  const supabaseAnonKey = process.env["NEXT_PUBLIC_SUPABASE_ANON_KEY"];

  if (!supabaseUrl || !supabaseAnonKey) {
    throw new Error(
      "[createBackendAdapters] Missing NEXT_PUBLIC_SUPABASE_URL or " +
        "NEXT_PUBLIC_SUPABASE_ANON_KEY. These are required for the session adapter.",
    );
  }

  const session: SessionPort = new SupabaseSessionAdapter(supabaseUrl, supabaseAnonKey);

  return {
    auth: authFactory,
    storage: storageFactory,
    session,
  };
}
```

> **Note on client threading**: Unlike `createPaymentAdapter()` (which returns a fully-constructed adapter), the auth and storage factories return a function `(client) => Adapter`. This is because `SupabaseClient` is request-scoped — it must be created per-request from `getServerClient()`. The factory itself is safely called once at module level in Server Actions; the client is passed per-invocation.

---

## Migration strategy

### Phase approach for existing services

The migration from direct `SupabaseClient` auth calls to `AuthPort` is a source-level breaking change for any adopter fork that calls the service functions directly. The migration guide in `docs/developer-guide/backend-provider-migration.md` documents every change. This section covers the mechanics.

#### Before/after: `signInWithPasswordService`

**Before (pre-refactor)** — function accepts `SupabaseClient`, calls `client.auth.*` directly:

```typescript
// packages/core/src/services/auth-service.ts (BEFORE)
import type { SupabaseClient } from "@supabase/supabase-js";

export async function signInWithPasswordService(
  client: SupabaseClient,
  input: SignInServiceInput,
): Promise<ServiceResult<SignInServiceData>> {
  const { error } = await client.auth.signInWithPassword({
    email: input.email,
    password: input.password,
  });
  // ... rest of implementation
}
```

**After (post-refactor)** — function accepts `AuthPort`, delegates to adapter:

```typescript
// packages/core/src/services/auth-service.ts (AFTER)
import type { AuthPort } from "./ports/auth-port";

export async function signInWithPasswordService(
  auth: AuthPort,
  input: SignInServiceInput,
): Promise<ServiceResult<SignInServiceData>> {
  return auth.signInWithPassword(input);
}
```

**Caller site (Server Action)** — before and after:

```typescript
// ui/features/auth/actions.ts (BEFORE)
"use server";
import { getServerClient } from "@enterprise/core/supabase/server";
import { signInWithPasswordService } from "@enterprise/core/services/auth-service";

export async function signInAction(input: SignInInput): Promise<ActionResult<SignInData>> {
  const client = await getServerClient();
  const result = await signInWithPasswordService(client, input);
  // ...
}

// ui/features/auth/actions.ts (AFTER)
"use server";
import { getServerClient } from "@enterprise/core/supabase/server";
import { createBackendAdapters } from "@enterprise/core/services/backend-adapters";
import { signInWithPasswordService } from "@enterprise/core/services/auth-service";

const { auth: authFactory } = createBackendAdapters();

export async function signInAction(input: SignInInput): Promise<ActionResult<SignInData>> {
  const client = await getServerClient();
  const auth = authFactory(client);
  const result = await signInWithPasswordService(auth, input);
  // ...
}
```

#### Before/after: `getUserRoleService`

**Before** — called inside `signInWithPasswordService` using `client` directly:

```typescript
// BEFORE — auth-service.ts calls getUserRoleService(client, userId)
const roleResult = await getUserRoleService(client, user.id);
```

**After** — `getUserRoleService` signature changes to accept `AuthPort`. The `SupabaseAuthAdapter` implements `getUserRole()` using the same `profiles` table query. Internal calls inside `auth-service.ts` call `auth.getUserRole()`.

```typescript
// AFTER — auth-service.ts calls auth.getUserRole(userId)
const roleResult = await auth.getUserRole(user.id);
```

#### Middleware: before/after

The `middleware.ts` change is the cleanest migration surface — `updateSession()` is replaced with `sessionPort.refreshSession()`:

```typescript
// ui/middleware.ts (BEFORE)
import { updateSession } from "@enterprise/core/supabase/middleware";

export async function middleware(request: NextRequest) {
  const response = await updateSession(request, middlewareSupabaseConfig);
  // ...
}

// ui/middleware.ts (AFTER)
import { createBackendAdapters } from "@enterprise/core/services/backend-adapters";

const { session: sessionPort } = createBackendAdapters();

export async function middleware(request: NextRequest) {
  const response = await sessionPort.refreshSession(request);
  // ...
}
```

The `createMiddlewareClient()` call for role resolution remains — it is a DB query, not an auth port concern. Until `DatabasePort` lands, middleware still uses the Supabase middleware client directly for the `getUserRoleService` call. This split dependency is documented explicitly in `middleware.ts` with a comment:

```typescript
// ui/middleware.ts (AFTER — showing split dependency explicitly)
import { createBackendAdapters } from "@enterprise/core/services/backend-adapters";
import { createMiddlewareClient } from "@enterprise/core/supabase/middleware";
import { getUserRoleService } from "@enterprise/core/services/auth-service";

const { session: sessionPort } = createBackendAdapters();

export async function middleware(request: NextRequest) {
  // Session refresh is provider-agnostic via SessionPort
  const response = await sessionPort.refreshSession(request);

  // Role resolution still uses SupabaseClient for the DB query.
  // This dependency is removed when DatabasePort lands (P1 follow-up).
  const supabase = createMiddlewareClient(request, middlewareSupabaseConfig);
  const { data: { user } } = await supabase.auth.getUser();

  if (!user && !isPublicRoute && !isAuthCompletionRoute) {
    // redirect...
  }

  const roleResult = await getUserRoleService(supabase, user.id);
  // ...
}
```

#### Services with mixed auth + DB dependencies

Services like the future storage-touching feature services accept both `StoragePort` and `SupabaseClient`:

```typescript
// AFTER — storage-touching service with split dependency
export async function uploadAvatarService(
  storage: StoragePort,    // storage operations via port
  client: SupabaseClient,  // DB operations via client (until DatabasePort lands)
  tenantId: string,
  userId: string,
  file: File,
): Promise<ServiceResult<{ url: string }>> {
  const path = STORAGE_PATHS.avatar(tenantId, userId, "webp");
  const uploadResult = await storage.upload(STORAGE_BUCKETS.AVATARS, path, file, {
    contentType: "image/webp",
  });

  if (!uploadResult.success) return uploadResult;

  // DB write still uses client directly
  await client.from("profiles").update({ avatar_url: uploadResult.data.fullPath }).eq("id", userId);

  const urlResult = await storage.getPublicUrl(STORAGE_BUCKETS.AVATARS, path);
  if (!urlResult.success) return urlResult;

  return { success: true, data: { url: urlResult.data.publicUrl } };
}
```

The split dependency (port for storage, `SupabaseClient` for DB) is documented in code comments and in the migration guide. It is a deliberate, bounded concession until `DatabasePort` ships.

---

## Service layer changes

The function-based services in `packages/core/src/services/` change their signatures as follows:

| Function | Before | After |
|----------|--------|-------|
| `signInWithPasswordService` | `(client: SupabaseClient, input)` | `(auth: AuthPort, input)` |
| `signUpService` | `(client: SupabaseClient, input)` | `(auth: AuthPort, input)` |
| `signOutService` | `(client: SupabaseClient)` | `(auth: AuthPort)` |
| `getCurrentPlatformUserService` | `(client: SupabaseClient)` | `(auth: AuthPort)` |
| `getUserRoleService` | `(client: SupabaseClient, userId)` | `(auth: AuthPort, userId)` |
| `requestPasswordResetService` | `(client: SupabaseClient, input)` | `(auth: AuthPort, input)` |
| `updatePasswordService` | `(client: SupabaseClient, input)` | `(auth: AuthPort, input)` |
| Future storage services | `(client: SupabaseClient, ...)` | `(storage: StoragePort, client: SupabaseClient, ...)` |

The service function bodies become thin delegations to the adapter. All business logic (error mapping, data shaping, result codes) moves into the adapter. This is deliberate: the service layer becomes a stable interface boundary; the adapter carries the provider-specific knowledge.

> **Rule for new services (after decoupling merges)**: Any new service that touches auth operations MUST accept `AuthPort`, not `SupabaseClient`. Any new service that touches storage MUST accept `StoragePort`. This rule is added to `packages/core/AGENTS.md` QA checklist.

---

## Environment variables

| Variable | Required | Default | Accepted values | Purpose |
|----------|----------|---------|-----------------|---------|
| `NEXT_PUBLIC_SUPABASE_URL` | Yes (for Supabase adapter) | — | Supabase project URL | Supabase auth and storage API endpoint |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Yes (for Supabase adapter) | — | Supabase anon key | Supabase client authentication |
| `BACKEND_AUTH_PROVIDER` | No | `"supabase"` | `"supabase"` \| `"custom"` | Selects the auth adapter. When `"custom"`, adopter must wire their adapter in `createBackendAdapters()`. |
| `BACKEND_STORAGE_PROVIDER` | No | `"supabase"` | `"supabase"` \| `"custom"` | Selects the storage adapter. When `"custom"`, adopter must wire their adapter in `createBackendAdapters()`. |

**Default path (no env vars set)**: `createBackendAdapters()` returns Supabase adapters for all ports. The only required env vars are `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY`, which are already required today.

**Custom provider path**: The adopter sets `BACKEND_AUTH_PROVIDER=custom` and modifies `createBackendAdapters()` to instantiate their adapter class. They do NOT set `NEXT_PUBLIC_SUPABASE_URL` unless they also use Supabase for storage or session.

**`.env.example` additions**:

```bash
# Backend provider selection — controls adapter factory in createBackendAdapters()
# Supported values: "supabase" (default) | "custom"
# Set to "custom" to wire your own AuthPort implementation (e.g. Firebase, Clerk, Auth0)
BACKEND_AUTH_PROVIDER=supabase

# Supported values: "supabase" (default) | "custom"
# Set to "custom" to wire your own StoragePort implementation (e.g. S3, R2, local)
BACKEND_STORAGE_PROVIDER=supabase
```

---

## Testing strategy

### Unit tests

#### Auth service tests (post-refactor)

Location: `packages/core/src/services/__tests__/auth-service.test.ts`

The existing Supabase-mocked test file is replaced entirely with port-mock tests. No `@supabase/supabase-js` import remains. The mock is a plain object satisfying `AuthPort` — simpler, faster, and provider-agnostic.

```typescript
// Canonical port-mock pattern for auth service tests
function createMockAuthPort(): AuthPort {
  return {
    signInWithPassword: vi.fn(),
    signUp: vi.fn(),
    signOut: vi.fn(),
    getUser: vi.fn(),
    getUserRole: vi.fn(),
    requestPasswordReset: vi.fn(),
    updatePassword: vi.fn(),
  };
}
```

| Test | What it verifies |
|------|-----------------|
| `signInWithPasswordService` success | Delegates to `auth.signInWithPassword()`, returns role |
| `signInWithPasswordService` invalid credentials | Propagates `INVALID_CREDENTIALS` from adapter |
| `signInWithPasswordService` user not found | Propagates `USER_NOT_FOUND` from adapter |
| `signInWithPasswordService` role lookup failure | Propagates `ROLE_LOOKUP_FAILED` from adapter |
| `signInWithPasswordService` null role defaults to guest | Returns `{ role: "guest" }` when adapter returns null role |
| `signOutService` success | Delegates to `auth.signOut()`, returns null |
| `signOutService` failure | Propagates `SIGN_OUT_FAILED` from adapter |
| `signUpService` success with confirmation | Returns `needsEmailConfirmation: true` |
| `signUpService` success without confirmation | Returns `needsEmailConfirmation: false` |
| `signUpService` provider failure | Propagates `SIGN_UP_FAILED` |
| `signUpService` user not created | Propagates `USER_NOT_CREATED` |
| `requestPasswordResetService` success | Delegates to `auth.requestPasswordReset()` |
| `requestPasswordResetService` failure | Propagates `PASSWORD_RESET_REQUEST_FAILED` |
| `updatePasswordService` success | Delegates to `auth.updatePassword()` |
| `updatePasswordService` failure | Propagates `PASSWORD_UPDATE_FAILED` |

#### Supabase adapter tests

Location: `packages/core/src/services/__tests__/supabase-auth-adapter.test.ts`

These tests verify that `SupabaseAuthAdapter` correctly maps Supabase SDK responses to `ServiceResult<T>`. They DO import and mock `@supabase/supabase-js` — this is appropriate because adapter tests are explicitly testing the Supabase mapping, not business logic.

| Test | What it verifies |
|------|-----------------|
| `signInWithPassword` maps SDK success to `ServiceResult` | Correct role is extracted and returned |
| `signInWithPassword` maps SDK error to `INVALID_CREDENTIALS` | Error code is set correctly |
| `signInWithPassword` maps null user to `USER_NOT_FOUND` | Boundary: user null after sign-in |
| `signUp` sets `needsEmailConfirmation: true` when session is null | Supabase returns null session when email conf required |
| `signUp` sets `needsEmailConfirmation: false` when session exists | Supabase returns session when email conf disabled |
| `getUser` returns null when no session | Boundary: anonymous visitor |
| `getUser` maps user + profile to `PlatformUser` | All fields mapped correctly |
| `getUserRole` maps profile.role to UserRole | Role extraction from profiles table |
| `getUserRole` ignores PGRST116 (row not found) | Missing profile defaults to guest role |
| `getUserRole` propagates non-PGRST116 errors | Network errors bubble up |
| `requestPasswordReset` maps SDK success | Delegates to `resetPasswordForEmail` |
| `updatePassword` maps SDK success | Delegates to `auth.updateUser()` |

#### Storage adapter tests

Location: `packages/core/src/services/__tests__/supabase-storage-adapter.test.ts`

| Test | What it verifies |
|------|-----------------|
| `upload` success returns path and fullPath | Supabase storage response is mapped correctly |
| `upload` failure returns `STORAGE_UPLOAD_FAILED` | Error from Supabase storage is captured |
| `download` success returns Blob | Response Blob is returned as-is |
| `download` failure returns `STORAGE_DOWNLOAD_FAILED` | Error and null data both handled |
| `delete` success returns null | Remove call succeeds |
| `delete` failure returns `STORAGE_DELETE_FAILED` | Error from Supabase storage is captured |
| `getSignedUrl` success returns URL and expiresIn | URL is returned with correct expiry |
| `getSignedUrl` failure returns `STORAGE_SIGNED_URL_FAILED` | Error and null data both handled |
| `getPublicUrl` always succeeds | Supabase never errors on public URL construction |
| `listFiles` maps Supabase FileObject array to StorageFileEntry | All nullable fields handled |
| `listFiles` with empty result returns empty array | Empty bucket returns `[]` |

#### Storage port unit tests

Location: `packages/core/src/services/__tests__/storage-service.test.ts` (example service using `StoragePort`)

```typescript
// Canonical port-mock pattern for storage service tests
function createMockStoragePort(): StoragePort {
  return {
    upload: vi.fn(),
    download: vi.fn(),
    delete: vi.fn(),
    getSignedUrl: vi.fn(),
    getPublicUrl: vi.fn(),
    listFiles: vi.fn(),
  };
}
```

#### Factory tests

Location: `packages/core/src/services/__tests__/backend-adapters.test.ts`

| Test | What it verifies |
|------|-----------------|
| Default (no env vars) returns Supabase adapters | `auth`, `storage`, `session` are all defined |
| `BACKEND_AUTH_PROVIDER=supabase` returns Supabase auth adapter | Explicit `supabase` value works identically to default |
| `BACKEND_AUTH_PROVIDER=custom` throws descriptive error | Clear error message for unsupported value |
| `BACKEND_STORAGE_PROVIDER=supabase` returns Supabase storage adapter | Explicit `supabase` value works identically to default |
| `BACKEND_STORAGE_PROVIDER=custom` throws descriptive error | Clear error message for unsupported value |
| Missing `NEXT_PUBLIC_SUPABASE_URL` throws on session construction | Configuration error caught early |

### Integration tests

No new Supabase integration tests are required. The `packages/core/src/supabase/rls-policies.test.ts` file tests RLS via the real Supabase client and is unaffected — it does not go through the port layer.

### E2E tests

No new E2E test files are required. All existing E2E tests implicitly validate that the Supabase adapter is functionally equivalent to the pre-refactor direct calls. Passing the full E2E suite without modification is the acceptance criterion for the default path (US-1 in the PRD).

The specific flows verified implicitly:

| Scenario | Adapter exercised |
|----------|-------------------|
| Sign in with email/password | `SupabaseAuthAdapter.signInWithPassword()` |
| Sign up new account | `SupabaseAuthAdapter.signUp()` |
| Sign out | `SupabaseAuthAdapter.signOut()` |
| Request password reset | `SupabaseAuthAdapter.requestPasswordReset()` |
| Update password | `SupabaseAuthAdapter.updatePassword()` |
| Middleware session refresh | `SupabaseSessionAdapter.refreshSession()` |

---

## Trade-offs

| Decision | Chosen | Not chosen | Rationale |
|----------|--------|------------|-----------|
| Port interfaces as plain TypeScript interfaces | Plain interface (`interface AuthPort`) | Abstract class | No SDK imports required to satisfy the interface. Any object literal or class works. Testing is trivial — no mock library needed beyond `vi.fn()`. |
| Auth and storage adapters take `SupabaseClient` per-call | Factory returns `(client) => Adapter` function | Factory returns fully-constructed adapter | `SupabaseClient` is request-scoped — it cannot be captured at module level. The function wrapper makes the per-request wiring explicit. |
| Session adapter constructed at module level | `createBackendAdapters()` constructs `SupabaseSessionAdapter` at call time | Session constructed per-request | `SupabaseSessionAdapter` captures URL and anon key at construction, not the client. It creates its own internal Supabase client per `refreshSession()` call via `updateSession()`. This is safe to construct once. |
| Service functions become thin delegations | Service delegates to adapter: `return auth.signInWithPassword(input)` | Service retains implementation, adapter wraps service | Moves provider-specific logic entirely into the adapter. Services become stable interface boundaries. Makes unit testing trivial — mock the adapter, not the Supabase SDK. |
| `SessionPort` returns `NextResponse` | `NextResponse` (Next.js type) | Custom response wrapper | Middleware is a Next.js primitive. A custom response abstraction would add complexity without benefit. Adopters who leave Next.js must rewrite middleware anyway. This is intentionally scoped to Next.js. |
| No `DatabasePort` in MVP | Excluded | Included | DB operations are the most complex decoupling surface — RLS policies, PostgREST vs Drizzle, schema coupling. Attempting this in MVP would delay Auth and Storage decoupling, which are the highest-value swaps for adopters. |
| `getUserRole` on `AuthPort` (not separate port) | `AuthPort.getUserRole()` | Separate `ProfilePort` or DB query | Role resolution is required in auth flows and middleware. Placing it on `AuthPort` keeps the adapter cohesive. Adopters with JWT-embedded roles implement it without a DB call. |
| `STORAGE_BUCKETS` and `STORAGE_PATHS` constants unchanged | Retained as-is in `storage-paths.ts` | Moved into `StoragePort` | The constants are provider-agnostic naming conventions. Any adapter can use them. Moving them would be a needless breaking change. |
| Env-var selection vs. `NODE_ENV` | Explicit env vars (`BACKEND_AUTH_PROVIDER`) | `NODE_ENV` check | `NODE_ENV` conflates deployment environment with provider choice. An adopter may run Firebase in staging and Supabase in production, or vice versa. Explicit env vars give full control and match the billing adapter pattern. |

---

## Risks

| Risk | Impact | Mitigation |
|------|--------|------------|
| Services that accept both `AuthPort` and `SupabaseClient` create a confusing split dependency | Medium — adopters may not understand which parameter handles which concern | Document the split clearly in code comments (`// Auth via AuthPort. DB via SupabaseClient until DatabasePort lands.`) and in the migration guide. This is a known, temporary state. |
| Port methods designed for Supabase make the Supabase adapter trivial but alternative adapters hard | High — port becomes a leaky Supabase abstraction | Design methods around the LOWEST COMMON DENOMINATOR. Supabase-specific features (Magic Link, MFA, OTP) are excluded from `AuthPort` MVP scope and documented as extension points. |
| Adopters bypass the port and import `SupabaseClient` directly in new services | Medium — defeats the pattern without a compile-time error | Add to `packages/core/AGENTS.md` QA checklist: "New services accept `AuthPort`/`StoragePort`, not `SupabaseClient`, for auth and storage operations (after decoupling merges)." Code review enforces this. |
| `createBackendAdapters()` throws at startup if `NEXT_PUBLIC_SUPABASE_URL` is missing in custom-provider environments | Medium — breakage for adopters who set `BACKEND_AUTH_PROVIDER=custom` but still use Supabase for session | Split session adapter construction: if both `BACKEND_AUTH_PROVIDER=custom` AND `BACKEND_STORAGE_PROVIDER=custom`, the session adapter construction is deferred and the adopter must provide a custom `SessionPort`. Document this in the migration guide. |
| Renaming service signatures from `SupabaseClient` to `AuthPort` breaks existing adopter forks | High for forks — source-level breaking change | Provide a complete before/after migration guide with diffs for every changed function signature. Version the change with a clear changelog entry. |
| Unit tests that mocked `SupabaseClient` deeply no longer compile after the signature change | Medium — existing test files break | All existing tests in `packages/core/src/services/__tests__/` are updated as part of this feature. The PR includes the updated test files. |
| `SupabaseSessionAdapter.refreshSession()` calls `updateSession()` which internally calls `getUser()` — double server-round-trip risk | Low — this was already the case in the pre-refactor middleware | No change in behavior. The adapter wraps existing code exactly. Performance characteristics are identical. |

---

## Implementation phases

| Phase | Deliverable | Dependencies |
|-------|-------------|--------------|
| 1 | Port interfaces: `auth-port.ts`, `storage-port.ts`, `session-port.ts` in `packages/core/src/services/ports/` | None |
| 2 | Supabase adapters: `SupabaseAuthAdapter`, `SupabaseStorageAdapter`, `SupabaseSessionAdapter` in `packages/core/src/services/adapters/` | Phase 1 |
| 3 | Adapter factory: `createBackendAdapters()` in `packages/core/src/services/backend-adapters.ts` | Phase 2 |
| 4 | Service migration: update `auth-service.ts` signatures from `SupabaseClient` to `AuthPort`; remove inline auth logic (now in adapter) | Phase 2 |
| 5 | Test migration: update `__tests__/auth-service.test.ts` to use port mocks; add `__tests__/supabase-auth-adapter.test.ts`, `__tests__/supabase-storage-adapter.test.ts`, `__tests__/backend-adapters.test.ts` | Phases 3–4 |
| 6 | Middleware migration: update `ui/middleware.ts` to use `SessionPort` from factory | Phase 3 |
| 7 | Server Action wiring: update all auth Server Actions in `ui/features/auth/actions.ts` to inject adapter via factory | Phases 3–4 |
| 8 | Public API exports: update `packages/core/src/services/index.ts` (or subpath exports) to export `AuthPort`, `StoragePort`, `SessionPort` | Phases 1–3 |
| 9 | Documentation: `docs/developer-guide/backend-provider-migration.md` | Phases 1–7 |
| 10 | QA checklist update: `packages/core/AGENTS.md` — add port-based injection rule for new services | Phase 9 |

---

## Decisions log

| Decision | Outcome | Rationale |
|----------|---------|-----------|
| Use `PaymentProviderPort` / `createPaymentAdapter()` billing pattern as the reference? | Yes — same structure: port interface → adapter class → factory function → env-var selection | Pattern is already in the codebase, proven, and understood by anyone who has read the billing feature. Zero new conventions introduced. |
| Plain interface vs. abstract class for ports? | Plain interface | Any object satisfying the shape is a valid adapter. No SDK imports required. Mocking is trivial. Consistent with `InvitationEmailPort` pattern already in the codebase. |
| Auth adapter receives `SupabaseClient` per-call (factory returns function) vs. at construction? | Factory returns `(client) => Adapter` function | `SupabaseClient` is request-scoped — constructed per-request from `getServerClient()`. Capturing it at module level would serve stale sessions. The function wrapper makes per-request wiring explicit and type-safe. |
| Include `getUserRole` on `AuthPort`? | Yes — as `getUserRole(userId: string)` | Role resolution is always needed after sign-in and in middleware. Placing it on `AuthPort` keeps auth concerns cohesive. Adopters using JWT-embedded roles implement it without a DB call. |
| `SessionPort` returns `NextResponse`? | Yes — intentionally Next.js-scoped | Middleware is a Next.js primitive. Abstracting away `NextResponse` into a custom response type adds complexity without benefit. Adopters who leave Next.js must rewrite middleware regardless. |
| `SessionPort` selection env var? | No separate env var — always instantiated alongside `AuthPort` | Session management is tightly coupled to the auth provider in practice. Separating them would require adopters to configure two env vars for one conceptual swap. |
| Include `DatabasePort` in this RFC? | No — P1 follow-up | DB operations (PostgREST vs. Drizzle, RLS delegation, schema coupling) require deeper analysis. Blocking auth/storage decoupling on this would delay the highest-value swaps. |
| Where do new port files live? | `packages/core/src/services/ports/` — alongside `invitation-email-port.ts` | Consistent with existing port location. No new directory structures introduced. |
| Where do new adapter files live? | `packages/core/src/services/adapters/` — alongside `ConsoleInvitationEmailAdapter` and `ResendInvitationEmailAdapter` | Consistent with existing adapter location and naming convention. |
| Ship Firebase, Clerk, or Auth0 adapters in this PR? | No — Supabase adapter only | Shipping unvalidated community adapters adds maintenance burden without production proof. The `AuthPort` interface is the deliverable; community adapters are examples in the migration guide. |
| `STORAGE_BUCKETS` and `STORAGE_PATHS` constants kept as-is? | Yes — provider-agnostic naming conventions | Any `StoragePort` implementation can use these constants. Moving them into the port would be a breaking change without benefit. The Supabase adapter uses them internally. |
| Env-var selection driven by explicit vars vs. `NODE_ENV`? | Explicit env vars (`BACKEND_AUTH_PROVIDER`, `BACKEND_STORAGE_PROVIDER`) | Mirrors the billing adapter decision. `NODE_ENV` conflates environment with provider choice. Explicit env vars give adopters full control (e.g., Supabase in prod, custom in staging). |

---

## File inventory

### New files

| File | Description |
|------|-------------|
| `packages/core/src/services/ports/auth-port.ts` | `AuthPort` interface — provider-agnostic auth operations |
| `packages/core/src/services/ports/storage-port.ts` | `StoragePort` interface — provider-agnostic file storage operations |
| `packages/core/src/services/ports/session-port.ts` | `SessionPort` interface — Next.js middleware session refresh |
| `packages/core/src/services/adapters/supabase-auth-adapter.ts` | `SupabaseAuthAdapter` class implementing `AuthPort` |
| `packages/core/src/services/adapters/supabase-storage-adapter.ts` | `SupabaseStorageAdapter` class implementing `StoragePort` |
| `packages/core/src/services/adapters/supabase-session-adapter.ts` | `SupabaseSessionAdapter` class implementing `SessionPort` |
| `packages/core/src/services/backend-adapters.ts` | `createBackendAdapters()` factory — env-var-driven adapter selection |
| `packages/core/src/services/__tests__/supabase-auth-adapter.test.ts` | Unit tests for `SupabaseAuthAdapter` — Supabase SDK mapping |
| `packages/core/src/services/__tests__/supabase-storage-adapter.test.ts` | Unit tests for `SupabaseStorageAdapter` — Supabase Storage SDK mapping |
| `packages/core/src/services/__tests__/backend-adapters.test.ts` | Unit tests for `createBackendAdapters()` factory — env-var selection |
| `docs/developer-guide/backend-provider-migration.md` | Step-by-step migration guide for adopters |

### Modified files

| File | Change |
|------|--------|
| `packages/core/src/services/auth-service.ts` | All function signatures changed from `(client: SupabaseClient, ...)` to `(auth: AuthPort, ...)`. Internal `client.auth.*` calls removed — delegated to adapter. `getUserRoleService` delegates to `auth.getUserRole()`. |
| `packages/core/src/services/__tests__/auth-service.test.ts` | Rewritten to use port-mock pattern. Removes `SupabaseClient` import. All `createMockClient()` usages replaced with `createMockAuthPort()`. |
| `ui/middleware.ts` | `updateSession()` call replaced with `sessionPort.refreshSession()`. `createBackendAdapters()` imported and called at module level. Comment added explaining remaining Supabase dependency for DB (role lookup). |
| `packages/core/src/index.ts` | Adds re-exports for `AuthPort`, `StoragePort`, `SessionPort`, and `createBackendAdapters` from their respective subpaths. |
| `packages/core/AGENTS.md` | QA checklist updated: "New services accept `AuthPort`/`StoragePort`, not `SupabaseClient` directly, for auth and storage operations (after decoupling is merged)." |
| `.env.example` | Two new commented entries: `BACKEND_AUTH_PROVIDER=supabase` and `BACKEND_STORAGE_PROVIDER=supabase` with inline documentation. |
| `ui/features/auth/actions.ts` | All auth Server Actions updated to inject adapter via `createBackendAdapters()`. Client is passed to `authFactory(client)` per-request. |

---

*Last updated: 2026-05-11*
