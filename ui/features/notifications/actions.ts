"use server";

import type { ActionResult, NotificationsQueryDto } from "@enterprise/contracts";
import {
  markAsReadSchema,
  notificationsQuerySchema,
  updatePreferencesSchema,
} from "@enterprise/contracts";
import type {
  NotificationPreferenceRecord,
  NotificationRecord,
} from "@enterprise/core/services/notification-service";
import {
  getPreferences,
  getUnreadCount,
  listNotifications,
  markAllAsRead,
  markAsRead,
  updatePreferences,
} from "@enterprise/core/services/notification-service";
import { getServerClient } from "@enterprise/core/supabase/server";
import { revalidatePath } from "next/cache";
import { ROUTES } from "@/lib/routes";
import { captureActionError } from "@/lib/sentry";

// ─── Auth Context ─────────────────────────────────────────────────────────────

async function getAuthContext(supabase: Awaited<ReturnType<typeof getServerClient>>) {
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return null;
  }

  const tenantId = (user.app_metadata?.["tenant_id"] as string | undefined) ?? null;
  const role = (user.app_metadata?.["role"] as string | undefined) ?? null;

  if (!tenantId) {
    return null;
  }

  return { userId: user.id, tenantId, role };
}

// ─── Actions ──────────────────────────────────────────────────────────────────

/**
 * List notifications for the authenticated user.
 * Accepts an optional query object (category, isRead, limit, offset).
 */
export async function listNotificationsAction(
  input: Partial<NotificationsQueryDto> = {},
): Promise<ActionResult<NotificationRecord[]>> {
  const parsed = notificationsQuerySchema.safeParse(input);

  if (!parsed.success) {
    return {
      success: false,
      error: {
        code: "VALIDATION_ERROR",
        message: "Invalid query parameters",
        details: parsed.error.flatten().fieldErrors as Record<string, unknown>,
      },
    };
  }

  const supabase = await getServerClient();
  const auth = await getAuthContext(supabase);

  if (!auth) {
    return {
      success: false,
      error: { code: "UNAUTHORIZED", message: "Authentication required" },
    };
  }

  try {
    const result = await listNotifications(supabase, auth.tenantId, auth.userId, parsed.data);

    if (!result.success) {
      captureActionError(new Error(result.error), {
        actionName: "listNotificationsAction",
        area: "notifications",
        errorCode: result.code,
        tenantId: auth.tenantId,
        userId: auth.userId,
        userRole: auth.role ?? undefined,
        inputShape: Object.keys(parsed.data),
      });

      return {
        success: false,
        error: { code: result.code ?? "LIST_NOTIFICATIONS_FAILED", message: result.error },
      };
    }

    return { success: true, data: result.data };
  } catch (err) {
    captureActionError(err, {
      actionName: "listNotificationsAction",
      area: "notifications",
      tenantId: auth.tenantId,
      userId: auth.userId,
      userRole: auth.role ?? undefined,
      inputShape: Object.keys(parsed.data),
    });

    return {
      success: false,
      error: { code: "UNEXPECTED_ERROR", message: "An unexpected error occurred" },
    };
  }
}

/**
 * Get the unread notification count for the authenticated user.
 * No input — uses auth context for tenant+user scoping.
 */
export async function getUnreadCountAction(): Promise<ActionResult<{ count: number }>> {
  const supabase = await getServerClient();
  const auth = await getAuthContext(supabase);

  if (!auth) {
    return {
      success: false,
      error: { code: "UNAUTHORIZED", message: "Authentication required" },
    };
  }

  try {
    const result = await getUnreadCount(supabase, auth.tenantId, auth.userId);

    if (!result.success) {
      captureActionError(new Error(result.error), {
        actionName: "getUnreadCountAction",
        area: "notifications",
        errorCode: result.code,
        tenantId: auth.tenantId,
        userId: auth.userId,
        userRole: auth.role ?? undefined,
      });

      return {
        success: false,
        error: { code: result.code ?? "UNREAD_COUNT_FAILED", message: result.error },
      };
    }

    return { success: true, data: result.data };
  } catch (err) {
    captureActionError(err, {
      actionName: "getUnreadCountAction",
      area: "notifications",
      tenantId: auth.tenantId,
      userId: auth.userId,
      userRole: auth.role ?? undefined,
    });

    return {
      success: false,
      error: { code: "UNEXPECTED_ERROR", message: "An unexpected error occurred" },
    };
  }
}

/**
 * Mark a single notification as read.
 * Validates notificationId UUID, then calls markAsRead service.
 */
export async function markAsReadAction(
  input: Record<string, unknown>,
): Promise<ActionResult<null>> {
  const parsed = markAsReadSchema.safeParse(input);

  if (!parsed.success) {
    return {
      success: false,
      error: {
        code: "VALIDATION_ERROR",
        message: "Invalid input",
        details: parsed.error.flatten().fieldErrors as Record<string, unknown>,
      },
    };
  }

  const supabase = await getServerClient();
  const auth = await getAuthContext(supabase);

  if (!auth) {
    return {
      success: false,
      error: { code: "UNAUTHORIZED", message: "Authentication required" },
    };
  }

  try {
    const result = await markAsRead(
      supabase,
      auth.tenantId,
      auth.userId,
      parsed.data.notificationId,
    );

    if (!result.success) {
      captureActionError(new Error(result.error), {
        actionName: "markAsReadAction",
        area: "notifications",
        errorCode: result.code,
        tenantId: auth.tenantId,
        userId: auth.userId,
        userRole: auth.role ?? undefined,
        inputShape: Object.keys(parsed.data),
      });

      return {
        success: false,
        error: { code: result.code ?? "MARK_READ_FAILED", message: result.error },
      };
    }

    revalidatePath(ROUTES.notifications);
    return { success: true, data: null };
  } catch (err) {
    captureActionError(err, {
      actionName: "markAsReadAction",
      area: "notifications",
      tenantId: auth.tenantId,
      userId: auth.userId,
      userRole: auth.role ?? undefined,
      inputShape: Object.keys(parsed.data),
    });

    return {
      success: false,
      error: { code: "UNEXPECTED_ERROR", message: "An unexpected error occurred" },
    };
  }
}

/**
 * Mark all notifications as read for the authenticated user.
 * No meaningful input — uses auth context for tenant+user scoping.
 */
export async function markAllAsReadAction(): Promise<ActionResult<{ updated: number }>> {
  const supabase = await getServerClient();
  const auth = await getAuthContext(supabase);

  if (!auth) {
    return {
      success: false,
      error: { code: "UNAUTHORIZED", message: "Authentication required" },
    };
  }

  try {
    const result = await markAllAsRead(supabase, auth.tenantId, auth.userId);

    if (!result.success) {
      captureActionError(new Error(result.error), {
        actionName: "markAllAsReadAction",
        area: "notifications",
        errorCode: result.code,
        tenantId: auth.tenantId,
        userId: auth.userId,
        userRole: auth.role ?? undefined,
      });

      return {
        success: false,
        error: { code: result.code ?? "MARK_ALL_READ_FAILED", message: result.error },
      };
    }

    revalidatePath(ROUTES.notifications);
    return { success: true, data: result.data };
  } catch (err) {
    captureActionError(err, {
      actionName: "markAllAsReadAction",
      area: "notifications",
      tenantId: auth.tenantId,
      userId: auth.userId,
      userRole: auth.role ?? undefined,
    });

    return {
      success: false,
      error: { code: "UNEXPECTED_ERROR", message: "An unexpected error occurred" },
    };
  }
}

/**
 * Get notification preferences for the authenticated user.
 * No input — uses auth context. Returns all 3 categories (missing rows = defaults).
 */
export async function getPreferencesAction(): Promise<
  ActionResult<NotificationPreferenceRecord[]>
> {
  const supabase = await getServerClient();
  const auth = await getAuthContext(supabase);

  if (!auth) {
    return {
      success: false,
      error: { code: "UNAUTHORIZED", message: "Authentication required" },
    };
  }

  try {
    const result = await getPreferences(supabase, auth.tenantId, auth.userId);

    if (!result.success) {
      captureActionError(new Error(result.error), {
        actionName: "getPreferencesAction",
        area: "notifications",
        errorCode: result.code,
        tenantId: auth.tenantId,
        userId: auth.userId,
        userRole: auth.role ?? undefined,
      });

      return {
        success: false,
        error: { code: result.code ?? "PREFERENCES_FETCH_FAILED", message: result.error },
      };
    }

    return { success: true, data: result.data };
  } catch (err) {
    captureActionError(err, {
      actionName: "getPreferencesAction",
      area: "notifications",
      tenantId: auth.tenantId,
      userId: auth.userId,
      userRole: auth.role ?? undefined,
    });

    return {
      success: false,
      error: { code: "UNEXPECTED_ERROR", message: "An unexpected error occurred" },
    };
  }
}

/**
 * Update notification preferences for the authenticated user.
 * Upserts per-category settings; revalidates the preferences page.
 */
export async function updatePreferencesAction(
  input: Record<string, unknown>,
): Promise<ActionResult<NotificationPreferenceRecord[]>> {
  const parsed = updatePreferencesSchema.safeParse(input);

  if (!parsed.success) {
    return {
      success: false,
      error: {
        code: "VALIDATION_ERROR",
        message: "Invalid preferences input",
        details: parsed.error.flatten().fieldErrors as Record<string, unknown>,
      },
    };
  }

  const supabase = await getServerClient();
  const auth = await getAuthContext(supabase);

  if (!auth) {
    return {
      success: false,
      error: { code: "UNAUTHORIZED", message: "Authentication required" },
    };
  }

  try {
    const result = await updatePreferences(supabase, auth.tenantId, auth.userId, parsed.data);

    if (!result.success) {
      captureActionError(new Error(result.error), {
        actionName: "updatePreferencesAction",
        area: "notifications",
        errorCode: result.code,
        tenantId: auth.tenantId,
        userId: auth.userId,
        userRole: auth.role ?? undefined,
        inputShape: ["preferences"],
      });

      return {
        success: false,
        error: { code: result.code ?? "PREFERENCES_UPDATE_FAILED", message: result.error },
      };
    }

    revalidatePath(ROUTES.notificationPreferences);
    return { success: true, data: result.data };
  } catch (err) {
    captureActionError(err, {
      actionName: "updatePreferencesAction",
      area: "notifications",
      tenantId: auth.tenantId,
      userId: auth.userId,
      userRole: auth.role ?? undefined,
      inputShape: ["preferences"],
    });

    return {
      success: false,
      error: { code: "UNEXPECTED_ERROR", message: "An unexpected error occurred" },
    };
  }
}
