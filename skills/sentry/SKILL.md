---
name: sentry
description: "Sentry instrumentation patterns for @enterprise/web — Server Actions, error boundaries, tags, PII filtering, and structured logging. Auto-invoke when working with Sentry, error tracking, error boundaries, captureException, monitoring, or observability."
metadata:
  author: enterprise-platform
  version: "1.0.0"
---

# Sentry Instrumentation — @enterprise/web

## When to Use This Skill

Load this skill **before writing any code** when the context involves:

- Adding Sentry to a Server Action (error tracking or performance)
- Creating or modifying React Error Boundaries (`error.tsx`, `global-error.tsx`)
- Calling `Sentry.captureException()` directly
- Configuring Sentry (`instrumentation-client.ts`, `sentry.server.config.ts`, `sentry.edge.config.ts`)
- Working with `captureActionError()` from `ui/lib/sentry.ts`
- Filtering events in `beforeSend`
- Using `Sentry.logger.*` for structured log output
- Any question about observability, monitoring, or error budgets

---

## Critical File Naming

> `instrumentation-client.ts` is the ONLY client-side Sentry init file.
> Do NOT create or reference `sentry.client.config.ts` — that is the **deprecated v8 pattern**.

| File | Runtime | Purpose |
|------|---------|---------|
| `ui/instrumentation-client.ts` | Browser | Sentry browser SDK init (v10 pattern) |
| `ui/sentry.server.config.ts` | Node.js | Sentry Node SDK init |
| `ui/sentry.edge.config.ts` | Edge | Sentry Edge SDK init |
| `ui/instrumentation.ts` | Next.js hook | Registers server + edge configs |
| `ui/lib/sentry.ts` | Server-safe | `captureActionError`, `beforeSendFilter`, `getSentryEnvironment` |
| `ui/lib/sentry-user-context.tsx` | Client component | Sets `Sentry.setUser()` for authenticated sessions |

---

## Server Action Instrumentation

### Dual Approach: `withServerActionInstrumentation` + `captureActionError`

For every Server Action in `@enterprise/web`, use **both**:

1. `Sentry.withServerActionInstrumentation()` — wraps the whole body for performance tracing
2. `captureActionError()` — called inside error paths only, for error reporting with context

```typescript
import * as Sentry from "@sentry/nextjs";
import { headers } from "next/headers";
import { captureActionError } from "@/lib/sentry";

export async function createResource(
  _prev: ActionResult<Resource>,
  formData: FormData,
): Promise<ActionResult<Resource>> {
  return Sentry.withServerActionInstrumentation(
    "createResource",
    { headers: await headers(), recordResponse: true },
    async () => {
      // ... auth, validation, DB call ...

      const result = await resourceService.create(supabase, parsed.data);

      if (!result.success) {
        captureActionError(result.error, {
          actionName: "createResource",
          area: "resources",
          tenantId: profile.tenant_id,
          userId: user.id,
          inputShape: Object.keys(parsed.data), // keys ONLY — never values
        });
        return { success: false, error: "Failed to create resource." };
      }

      return { success: true, data: result.data };
    },
  );
}
```

### Rules

- `withServerActionInstrumentation()` wraps the **entire action body** — the return value IS the wrapper's return value
- `captureActionError()` is called **inside error paths only** — NOT on validation errors (Zod failures are expected)
- `recordResponse: true` — sends the response data to Sentry for tracing context
- `await headers()` must be called **before** passing to the instrumentation function (headers are async in Next.js 15)

---

## `captureActionError()` — Contract

Located at `ui/lib/sentry.ts`. Server-safe (no `"use client"`).

```typescript
interface ActionErrorContext {
  actionName: string;      // e.g., "createResource", "inviteMember"
  area: string;            // module/area for grouping in Sentry (e.g., "auth", "team", "resources")
  errorCode?: string;      // e.g., "23505" (Postgres), "NOT_FOUND"
  inputShape?: string[];   // field NAMES only — NEVER values
  tenantId?: string;       // from authenticated session
  userId?: string;         // from authenticated session
}

function captureActionError(error: unknown, context: ActionErrorContext): void;
```

**Guarantees:**
- NEVER throws — wraps internally in try/catch
- Uses `Sentry.withScope()` to set tags and extras without polluting global scope
- Sets tags: `action`, `area`, `error_code` (when provided), `tenant_id` (when provided)
- Sets extras: `input_shape` (keys array), `user_id`

### `captureActionError` vs direct `Sentry.captureException`

| Scenario | Use |
|----------|-----|
| Server Action encounters a DB or infrastructure error | `captureActionError()` |
| React Error Boundary catches a render error | `Sentry.captureException(error)` directly in `useEffect` |
| One-off manual error capture with custom scope | `Sentry.captureException()` directly |

---

## Sentry Tags (`buildSentryTags`)

Use `buildSentryTags({ tenantId, userRole, actionName })` from `@enterprise/core/observability/sentry-tags`.

All tags use `enterprise.*` prefix:

| Tag | Type | Values / Notes |
|-----|------|---------------|
| `enterprise.tenant_id` | `string?` | UUID from authenticated session |
| `enterprise.user_role` | `string?` | User role in the tenant |
| `action` | `string` | Server Action name |
| `area` | `string` | Feature module (e.g., `"auth"`, `"team"`, `"resources"`) |
| `error_code` | `string?` | DB error code or domain code, e.g. `"23505"`, `"ALREADY_USED"` |

See `docs/adr/004-sentry-tag-taxonomy.md` for the full taxonomy.

---

## Error Boundary Pattern

All `error.tsx` and `global-error.tsx` files MUST follow this pattern:

```tsx
"use client";

import { useEffect } from "react";
import * as Sentry from "@sentry/nextjs";

export default function ErrorBoundary({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    Sentry.captureException(error);
  }, [error]);

  return (
    <div>
      <h2>An unexpected error occurred</h2>
      <button onClick={reset}>Try again</button>
    </div>
  );
}
```

**IMPORTANT for `global-error.tsx`:** Must include `<html>` and `<body>` tags — it replaces the root layout.

```tsx
export default function GlobalError({ error, reset }: ...) {
  useEffect(() => { Sentry.captureException(error); }, [error]);

  return (
    <html>
      <body>
        {/* fallback UI */}
      </body>
    </html>
  );
}
```

---

## What NEVER to Send to Sentry

The following data MUST NEVER appear in any Sentry event, breadcrumb, extra, or user context:

| Category | Examples |
|----------|----------|
| Passwords | Login passwords, admin credentials |
| API tokens | Service tokens, third-party API keys |
| Supabase service role key | `SUPABASE_SERVICE_ROLE_KEY` |
| Webhook secrets | Any `*_WEBHOOK_SECRET` |
| Full request bodies | Form submissions with user input |
| Input field VALUES | Only send field NAMES (`inputShape`) |
| PII | Email addresses, names, phone numbers in logs |

**`inputShape` rule:** Pass `Object.keys(parsed.data)` — never `Object.values()` or the raw data object.

---

## `beforeSend` Filtering Rules

The `beforeSendFilter` in `ui/lib/sentry.ts` handles:

```typescript
const SENSITIVE_FIELDS = [
  "password", "token", "secret", "card", "cvv",
  "access_token", "service_role", "authorization",
];

// Filter expected Next.js framework errors
if (
  event.exception?.values?.some(
    (e) =>
      e.value?.includes("NEXT_REDIRECT") ||
      e.value?.includes("NEXT_NOT_FOUND") ||
      (e as { digest?: string }).digest?.startsWith("NEXT_"),
  )
) {
  return null; // Drop — not a real error
}

// Scrub sensitive fields from request data and breadcrumbs
```

**Drop these — they are NOT real errors:**
- `NEXT_REDIRECT` — navigation redirect (thrown intentionally by `redirect()`)
- `NEXT_NOT_FOUND` — 404 page (thrown intentionally by `notFound()`)

**Scrub these fields** from `event.request.data` and `event.breadcrumbs[*].data` → replace with `"[Filtered]"`.

---

## Sentry Structured Logging (`Sentry.logger.*`)

Requires `enableLogs: true` in the Sentry config (already set in all three config files).

```typescript
import * as Sentry from "@sentry/nextjs";

// Log levels: trace, debug, info, warn, error, fatal
Sentry.logger.info("Webhook received", {
  webhookType: payload.type,
  tenantId: profile.tenant_id,
});

Sentry.logger.error("Resource creation failed", {
  resourceId: resource.id,
  errorCode: error.code,
  // NEVER include sensitive data here
});
```

Use `Sentry.logger.*` for **structured, searchable logs** — not just for errors. These appear in Sentry Logs and can be correlated with errors and transactions.

---

## Environment Configuration

### Required Environment Variables

| Variable | Scope | Purpose |
|----------|-------|---------|
| `NEXT_PUBLIC_SENTRY_DSN` | Client + Server | Sentry ingest endpoint (safe to expose) |
| `SENTRY_AUTH_TOKEN` | Build-time only | Source map upload authentication |

`SENTRY_ORG` and `SENTRY_PROJECT` are configured via the Vercel Sentry integration or `.sentryclirc` — **NOT as env vars**.

### Sample Rates by Environment

| Environment | `tracesSampleRate` | `replaysSessionSampleRate` | `replaysOnErrorSampleRate` |
|-------------|---------------------|---------------------------|---------------------------|
| `development` | `1.0` | `0.0` | `1.0` |
| `staging` | `0.5` | `0.0` | `1.0` |
| `production` | `0.3` | `0.0` | `1.0` |

`replaysSessionSampleRate` MUST be `0.0` until a privacy review has been completed. On-error replay MUST be `1.0`.

### `enabled` flag

```typescript
// Correct — Vercel preview builds run with NODE_ENV=production
enabled: process.env.NODE_ENV === "production"

// WRONG — don't use APP_ENV check, preview builds would be disabled
// enabled: process.env.NEXT_PUBLIC_APP_ENV !== "development"  ← DO NOT USE
```

### `getSentryEnvironment()` mapping

```typescript
// Maps NEXT_PUBLIC_APP_ENV to Sentry environment string
// "production" → "production"
// "preview"    → "staging"
// anything else (including undefined) → "development"
```

---

## User Context

### Setting user context (Server Component / Server Action)

```typescript
import * as Sentry from "@sentry/nextjs";

// In (dashboard)/layout.tsx after auth resolves
Sentry.setUser({
  id: profile.id,
  email: profile.email,
  tenant_id: profile.tenantId, // custom attribute
});
```

### Client-side user context (`SentryUserContext` component)

```tsx
// ui/lib/sentry-user-context.tsx — "use client" component
// Renders nothing, just calls Sentry.setUser on mount
<SentryUserContext
  userId={profile.id}
  email={profile.email}
  tenantId={profile.tenantId}
/>
```

### Clearing context on sign-out

```typescript
// In signOut() action — BEFORE calling supabase.auth.signOut()
Sentry.setUser(null);
await supabase.auth.signOut();
```

---

## Sentry MCP — Agent-Assisted Debugging

The Sentry MCP is configured in `opencode.json`. When debugging production issues, you can use the Sentry MCP tools to:
- Search for errors by tag (`action`, `area`, `error_code`, `enterprise.tenant_id`)
- Inspect stack traces and breadcrumbs
- Correlate Sentry events with code changes

Available after authentication via the Sentry MCP OAuth flow.
