---
title: "Brand abstraction and backend decoupling migration guide"
description: "How to migrate adopter forks to the brand abstraction (#14) and backend provider decoupling (#16) changes."
owner: "Engineering"
lastUpdated: "2026-06-08"
---

# Brand abstraction and backend decoupling migration guide

## Purpose

This guide describes the source-level changes introduced by feature #14 (brand abstraction) and feature #16 (backend provider decoupling) and explains what adopter forks must update to stay compatible. It covers the breaking auth-service signature change, adapter injection in Server Actions and middleware, and the new brand system APIs.

## Scope

- Included: auth-service migration, adapter injection call sites, brand provider wiring, custom provider skeleton, test setup with port mocks
- Excluded: database schema or Row-Level Security (RLS) changes (there are none), billing provider migration (covered separately), deployment provider decoupling (#20)

---

## Overview

Two parallel tracks landed together:

| Track | Feature | What changed |
|-------|---------|--------------|
| #16 — Backend decoupling | Port/adapter pattern for auth and storage | `auth-service` functions now accept `AuthPort` instead of `SupabaseClient`. Session refresh in middleware goes through `SessionPort`. Both use `createBackendAdapters()` to select the active implementation. |
| #14 — Brand abstraction | `@enterprise/brand` package | Brand identity (logo, metadata, theme, legal links) is driven by a `BrandConfig` validated against `brandConfigSchema`. `resolveBrand()` selects the active brand server-side; `BrandProvider` + `useBrand()` expose it to Client Components. |

**Adopters who keep the default Supabase backend and "enterprise" brand do not need to change any runtime behavior.** The new APIs are additive and the default path activates without any new env vars. The only mandatory change is updating call sites that import from `auth-service` — see the before/after diff below.

---

## Backend decoupling (#16)

### Breaking change: `auth-service` function signatures

All seven functions in `packages/core/src/services/auth-service.ts` previously accepted a `SupabaseClient` as their first argument. They now accept `AuthPort`.

```typescript
// ❌ Before (pre-decoupling)
import type { SupabaseClient } from "@supabase/supabase-js";

export async function signInWithPasswordService(
  client: SupabaseClient,
  input: SignInServiceInput,
): Promise<ServiceResult<SignInServiceData>> { ... }

export async function signOutService(
  client: SupabaseClient,
): Promise<ServiceResult<null>> { ... }
```

```typescript
// ✅ After
import type { AuthPort } from "./ports/auth-port";

export async function signInWithPasswordService(
  auth: AuthPort,
  input: SignInServiceInput,
): Promise<ServiceResult<SignInServiceData>> {
  return auth.signInWithPassword(input);
}

export async function signOutService(auth: AuthPort): Promise<ServiceResult<null>> {
  return auth.signOut();
}
```

The same pattern applies to all seven functions: `signInWithPasswordService`, `signUpService`, `signOutService`, `getCurrentPlatformUserService`, `getUserRoleService`, `requestPasswordResetService`, and `updatePasswordService`. The `ServiceResult<T>` type, all input/data interfaces, and `resolveRoleRedirectPath` are unchanged.

> **Note**: This is a source-level breaking change only. No runtime behavior changes for the default Supabase path — the `SupabaseAuthAdapter` implements `AuthPort` with the same logic that previously lived inline in the service functions.

---

### Adapter injection in Server Actions

`createBackendAdapters()` is called once at module level. The returned `auth` value is a factory function — call it with the request-scoped Supabase client to produce an `AuthPort` per request.

```typescript
// ✅ Correct — ui/features/auth/actions.ts
"use server";

import { createBackendAdapters } from "@enterprise/core/services/backend-adapters";
import { signInWithPasswordService } from "@enterprise/core/services/auth-service";
import { getServerClient } from "@enterprise/core/supabase/server";

// Module-level: factory is created once per module load.
const { auth: authFactory } = createBackendAdapters();

export async function signIn(email: string, password: string) {
  const supabase = await getServerClient(); // request-scoped
  const auth = authFactory(supabase);       // per-request AuthPort

  const result = await signInWithPasswordService(auth, { email, password });
  // ...
}
```

The `storage` key follows the same pattern: `storageFactory(client)` returns a `StoragePort`. The `session` key is a pre-constructed `SessionPort` instance — see middleware usage below.

---

### Middleware: session refresh via `SessionPort`

The middleware no longer imports `@supabase/ssr` directly. Session refresh is delegated to `sessionPort.refreshSession(request)`.

```typescript
// ✅ Correct — ui/middleware.ts
import { createBackendAdapters } from "@enterprise/core/services/backend-adapters";

const { session: sessionPort, auth: authFactory } = createBackendAdapters();

export async function middleware(request: NextRequest) {
  // SessionPort handles cookie read/validate/refresh — no direct @supabase/ssr needed.
  const response = await sessionPort.refreshSession(request);

  // Role resolution still uses SupabaseClient for the DB query.
  // DatabasePort is a P1 follow-up; until then, createMiddlewareClient is kept here.
  const supabase = createMiddlewareClient(request, middlewareSupabaseConfig);
  const auth = authFactory(supabase);
  // ...
  return response;
}
```

> **Note**: `SupabaseSessionAdapter` resolves `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY` lazily at request time (not at module load). This prevents `next build` from throwing when those env vars are absent during static page collection.

---

### Implementing a custom `AuthPort`

To replace Supabase auth with a different provider (Firebase, Clerk, Auth0, or any custom system):

1. Create a class or object that satisfies the `AuthPort` interface from `packages/core/src/services/ports/auth-port.ts`.
2. Return a factory for it in `createBackendAdapters()`.
3. Set `BACKEND_AUTH_PROVIDER=custom` in your environment.

Minimal skeleton:

```typescript
// packages/core/src/services/adapters/my-auth-adapter.ts
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
import type { PlatformUser } from "@enterprise/contracts";

export class MyAuthAdapter implements AuthPort {
  async signInWithPassword(input: SignInServiceInput): Promise<ServiceResult<SignInServiceData>> {
    // Call your auth provider here.
    // MUST return { success: false, error: string, code: string } on failure — never throw.
    return { success: true, data: { role: "member" } };
  }

  async signUp(input: SignUpServiceInput): Promise<ServiceResult<SignUpServiceData>> {
    return { success: true, data: { userId: "...", needsEmailConfirmation: false } };
  }

  async signOut(): Promise<ServiceResult<null>> {
    return { success: true, data: null };
  }

  async getUser(): Promise<ServiceResult<PlatformUser | null>> {
    // MUST validate the token server-side — equivalent to Supabase's getUser(), not getSession().
    return { success: true, data: null };
  }

  async getUserRole(userId: string): Promise<ServiceResult<UserRoleServiceData>> {
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

Then wire it in `createBackendAdapters()`:

```typescript
// packages/core/src/services/backend-adapters.ts — extend the auth branch
if (authProvider === "supabase") {
  authFactory = (client) => new SupabaseAuthAdapter(client);
} else if (authProvider === "custom") {
  // MyAuthAdapter does not need a SupabaseClient — ignore the argument.
  authFactory = (_client) => new MyAuthAdapter();
} else {
  throw new Error(`Unknown BACKEND_AUTH_PROVIDER: "${authProvider}"`);
}
```

The same approach applies to `StoragePort` via `BACKEND_STORAGE_PROVIDER`. See `packages/core/src/services/ports/storage-port.ts` for the full interface.

---

### Environment variables

| Variable | Default | Description |
|----------|---------|-------------|
| `BACKEND_AUTH_PROVIDER` | `supabase` | Active auth adapter. Set to `custom` when providing your own `AuthPort` implementation. |
| `BACKEND_STORAGE_PROVIDER` | `supabase` | Active storage adapter. Set to `custom` when providing your own `StoragePort` implementation. |

Both variables are optional. Omitting them activates the Supabase adapters with no change to existing behavior.

---

### Test setup with `createMockAuthPort()`

Service tests must not import `@supabase/supabase-js`. Use `createMockAuthPort()` from `packages/core/src/services/__tests__/mocks/auth-port.mock.ts` instead.

```typescript
// packages/core/src/services/__tests__/auth-service.test.ts
import { describe, expect, it, vi } from "vitest";
import { createMockAuthPort } from "./__tests__/mocks/auth-port.mock";
import {
  signInWithPasswordService,
  signOutService,
} from "../auth-service";

describe("signInWithPasswordService", () => {
  it("returns the role on success", async () => {
    const auth = createMockAuthPort();
    vi.mocked(auth.signInWithPassword).mockResolvedValue({
      success: true,
      data: { role: "member" },
    });

    const result = await signInWithPasswordService(auth, {
      email: "user@example.com",
      password: "secret",
    });

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.role).toBe("member");
    }
  });

  it("forwards the failure from the adapter", async () => {
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
  });
});
```

`createMockAuthPort()` returns a fully-typed object where every method is a `vi.fn()` stub. TypeScript catches any drift between the mock and the live `AuthPort` interface at compile time.

---

## Brand abstraction (#14)

### Package location

The brand package lives at `packages/brand/` and is published as `@enterprise/brand`. It is separate from `@enterprise/ui` (the design system). The `BrandConfig` Zod schema and inferred types live in `@enterprise/contracts` at `packages/contracts/src/schemas/brand.ts`.

Import subpaths:

| Import | What it exports |
|--------|----------------|
| `@enterprise/brand/resolve` | `resolveBrand()` — server-only |
| `@enterprise/brand/metadata` | `generateBrandMetadata()` |
| `@enterprise/brand/provider` | `BrandProvider`, `useBrand()` |
| `@enterprise/brand/theme-mode` | `deriveThemeMode()` |
| `@enterprise/contracts` | `BrandConfig`, `brandConfigSchema` |

---

### `resolveBrand()` and `generateBrandMetadata()` in `layout.tsx`

`resolveBrand()` is server-only — it reads `next/headers`. Call it from `generateMetadata()` and the root layout Server Component. Pass the result to `BrandProvider` as a prop.

```typescript
// ✅ Correct — ui/app/layout.tsx
import { resolveBrand } from "@enterprise/brand/resolve";
import { generateBrandMetadata } from "@enterprise/brand/metadata";
import { BrandProvider } from "@enterprise/brand/provider";
import { deriveThemeMode } from "@enterprise/brand/theme-mode";

export async function generateMetadata() {
  const brand = await resolveBrand();
  return generateBrandMetadata(brand);
}

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const brand = await resolveBrand();
  const initialThemeMode = deriveThemeMode(brand.themeRef);

  return (
    <html lang="en" data-theme={initialThemeMode} suppressHydrationWarning>
      <body>
        <BrandProvider brand={brand}>{children}</BrandProvider>
      </body>
    </html>
  );
}
```

`resolveBrand()` follows this priority chain:

```
1. BRAND_SLUG env var           → exact slug lookup
2. Subdomain of request host    → acme.platform.com → "acme"
3. First path segment           → /acme/dashboard   → "acme"
4. Default brand                → isDefault: true, or "enterprise" slug
```

---

### `BrandProvider` and `useBrand()` in Client Components

`BrandProvider` is a Client Component (`"use client"`). It wraps `ThemeProvider` and puts the resolved `BrandConfig` in context. Call `useBrand()` inside any Client Component that is a descendant of `BrandProvider`.

```tsx
// ✅ Correct — reading brand in a client component
"use client";

import { useBrand } from "@enterprise/brand/provider";

export function AppFooter() {
  const brand = useBrand();

  return (
    <footer>
      <span>{brand.displayName}</span>
      {brand.legal.privacyUrl && (
        <a href={brand.legal.privacyUrl}>Privacy</a>
      )}
    </footer>
  );
}
```

> **Warning**: `useBrand()` throws if called outside `BrandProvider`. The root layout already wraps all children with `BrandProvider`, so this only arises in isolated test renders — wrap with `<BrandProvider brand={...}>` in test setup.

---

### Adding a custom brand

1. Create a new brand config file in `packages/brand/src/brands/`. It must satisfy `BrandConfig` (inferred from `brandConfigSchema`).

```typescript
// packages/brand/src/brands/acme.brand.ts
import type { BrandConfig } from "@enterprise/contracts";

const acmeBrand: BrandConfig = {
  slug: "acme",                          // lowercase, alphanumeric with hyphens
  name: "acme",
  displayName: "Acme Platform",
  description: "The Acme SaaS product.",
  logo: {
    light: { src: "/images/acme/logo-light.svg", alt: "Acme Platform", width: 160, height: 32 },
    dark:  { src: "/images/acme/logo-dark.svg",  alt: "Acme Platform", width: 160, height: 32 },
  },
  favicon: "/images/acme/favicon.svg",
  metadata: {
    titleTemplate: "%s | Acme Platform",
    defaultTitle: "Acme Platform",
    description: "Acme — the platform for modern teams.",
    ogImage: "/images/acme/og-image.png",
  },
  legal: {
    privacyUrl: "https://acme.com/privacy",
    termsUrl:   "https://acme.com/terms",
  },
  social: {
    github: "https://github.com/acme",
  },
  themeRef: "light",                     // must match a theme JSON in packages/ui/src/themes/
  features: { showPoweredBy: false },
  isDefault: false,
};

export default acmeBrand;
```

2. Register it in `packages/brand/src/brands/index.ts`:

```typescript
// ✅ Add the export — registry picks it up automatically
export { default as enterprise } from "./enterprise.brand";
export { default as acme } from "./acme.brand";
```

3. Select it at runtime via the `BRAND_SLUG` env var or subdomain/path matching:

```bash
# .env.local
BRAND_SLUG=acme
```

The registry validates all brand configs at server startup. A duplicate `slug` or a missing required field throws immediately, preventing a silent misconfiguration from reaching users at request time.

---

## Rollback

Both tracks are fully reversible and require no database changes.

| Track | Rollback steps |
|-------|---------------|
| #14 — Brand | Remove `packages/brand/src/` directory, revert `ui/app/layout.tsx` to static `metadata` export and `ThemeProvider`, remove brand schema exports from `packages/contracts/src/index.ts`. |
| #16 — Decoupling | Revert `auth-service.ts` function signatures to accept `SupabaseClient`, remove `packages/core/src/services/ports/` and `packages/core/src/services/adapters/` directories, revert `ui/features/auth/actions.ts` and `ui/middleware.ts` to their pre-migration forms. |

Neither track touches database schemas, RLS policies, or migrations. A `git revert` of the relevant commits is sufficient to restore the prior state.

---

*Last updated: 2026-06-08*
