import type { ErrorEvent, EventHint } from "@sentry/nextjs";
import * as Sentry from "@sentry/nextjs";

// ─── Types ────────────────────────────────────────────────────────────────────

export type SentryArea = "auth" | "dashboard" | "resources" | "settings" | "webhook";

export interface ActionErrorContext {
  actionName: string;
  area: SentryArea;
  errorCode?: string;
  inputShape?: string[];
  tenantId?: string;
  userId?: string;
  userRole?: string;
}

// ─── PII / Secrets filter list ────────────────────────────────────────────────

export const SENSITIVE_FIELDS = [
  "password",
  "token",
  "secret",
  "card",
  "cvv",
  "access_token",
  "service_role",
  "authorization",
] as const;

// ─── captureActionError ───────────────────────────────────────────────────────

/**
 * Captures an error from a Server Action with structured enterprise context.
 *
 * Guarantees:
 * - NEVER throws — all exceptions are swallowed internally.
 * - Uses Sentry.withScope so tags/extras don't bleed into the global scope.
 * - Sets `enterprise.*` tags for filtering in Sentry dashboards.
 */
export function captureActionError(error: unknown, context: ActionErrorContext): void {
  try {
    Sentry.withScope((scope) => {
      scope.setTag("enterprise.action", context.actionName);
      scope.setTag("enterprise.area", context.area);

      if (context.errorCode) {
        scope.setTag("enterprise.error_code", context.errorCode);
      }

      if (context.tenantId) {
        scope.setTag("enterprise.tenant_id", context.tenantId);
      }

      if (context.userId) {
        scope.setTag("enterprise.user_id", context.userId);
      }

      if (context.userRole) {
        scope.setTag("enterprise.user_role", context.userRole);
      }

      if (context.inputShape) {
        scope.setExtra("input_shape", context.inputShape);
      }

      Sentry.captureException(error);
    });
  } catch {
    // Never allow Sentry instrumentation to break the application
  }
}

// ─── getSentryEnvironment ─────────────────────────────────────────────────────

/**
 * Maps NEXT_PUBLIC_APP_ENV to a Sentry environment string.
 *
 * "production" → "production"
 * "preview"    → "staging"
 * anything else (undefined, "development", etc.) → "development"
 */
export function getSentryEnvironment(): "production" | "staging" | "development" {
  const appEnv = process.env["NEXT_PUBLIC_APP_ENV"];

  if (appEnv === "production") return "production";
  if (appEnv === "preview") return "staging";

  return "development";
}

// ─── beforeSendFilter ────────────────────────────────────────────────────────

/**
 * Sentry `beforeSend` hook that:
 * 1. Drops expected Next.js framework non-errors (NEXT_REDIRECT, NEXT_NOT_FOUND).
 * 2. Scrubs SENSITIVE_FIELDS from request.data and breadcrumb data.
 */
export function beforeSendFilter(event: ErrorEvent, _hint: EventHint): ErrorEvent | null {
  // Drop expected Next.js framework "errors" — these are intentional throws
  const isNextFrameworkError = event.exception?.values?.some((e) => {
    const msg = e.value ?? "";
    return (
      msg.includes("NEXT_REDIRECT") ||
      msg.includes("NEXT_NOT_FOUND") ||
      (e as { digest?: string }).digest?.startsWith("NEXT_")
    );
  });

  if (isNextFrameworkError) {
    return null;
  }

  // Scrub sensitive fields from request body data
  if (event.request?.data && typeof event.request.data === "object") {
    const data = event.request.data as Record<string, unknown>;
    for (const field of SENSITIVE_FIELDS) {
      if (field in data) {
        data[field] = "[Filtered]";
      }
    }
  }

  // Scrub sensitive fields from breadcrumb data
  if (event.breadcrumbs) {
    for (const breadcrumb of event.breadcrumbs) {
      if (breadcrumb.data && typeof breadcrumb.data === "object") {
        const data = breadcrumb.data as Record<string, unknown>;
        for (const field of SENSITIVE_FIELDS) {
          if (field in data) {
            data[field] = "[Filtered]";
          }
        }
      }
    }
  }

  return event;
}
