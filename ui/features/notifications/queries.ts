// Server-side data fetching for notification Server Components.
// These are NOT Server Actions — they are async functions called directly from page.tsx.
// They use the authenticated Supabase client (RLS-scoped).

import type { NotificationsQueryDto } from "@enterprise/contracts";
import { notificationsQuerySchema } from "@enterprise/contracts";
import {
  getPreferences,
  getUnreadCount,
  listNotifications,
} from "@enterprise/core/services/notification-service";
import { getServerClient } from "@enterprise/core/supabase/server";

// ─── Auth Context Helper ──────────────────────────────────────────────────────

async function getNotificationAuthContext() {
  const supabase = await getServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return null;
  }

  const tenantId = (user.app_metadata?.["tenant_id"] as string | undefined) ?? null;

  if (!tenantId) {
    return null;
  }

  return { supabase, userId: user.id, tenantId };
}

// ─── Query Functions ──────────────────────────────────────────────────────────

/**
 * Fetch paginated notifications for the authenticated user.
 * Used by the notifications page Server Component.
 */
export async function getNotifications(query?: Partial<NotificationsQueryDto>) {
  const ctx = await getNotificationAuthContext();

  if (!ctx) {
    return [];
  }

  const parsed = notificationsQuerySchema.safeParse(query ?? {});
  const resolvedQuery = parsed.success ? parsed.data : notificationsQuerySchema.parse({});

  const result = await listNotifications(ctx.supabase, ctx.tenantId, ctx.userId, resolvedQuery);

  if (!result.success) {
    return [];
  }

  return result.data;
}

/**
 * Fetch the unread notification count for the authenticated user.
 * Used to seed the notification bell's initial count (SSR).
 */
export async function getNotificationUnreadCount(): Promise<number> {
  const ctx = await getNotificationAuthContext();

  if (!ctx) {
    return 0;
  }

  const result = await getUnreadCount(ctx.supabase, ctx.tenantId, ctx.userId);

  if (!result.success) {
    return 0;
  }

  return result.data.count;
}

/**
 * Fetch notification preferences for the authenticated user.
 * Used by the preferences page Server Component.
 */
export async function getNotificationPreferences() {
  const ctx = await getNotificationAuthContext();

  if (!ctx) {
    return [];
  }

  const result = await getPreferences(ctx.supabase, ctx.tenantId, ctx.userId);

  if (!result.success) {
    return [];
  }

  return result.data;
}
