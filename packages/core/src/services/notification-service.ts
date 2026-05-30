// Notification Service
// Handles in-app notification creation, listing, mark-as-read, and preference management
// Reads use authenticated client (RLS scoped); INSERTs use adminClient (service_role)

import type {
  CreateNotificationDto,
  NotificationsQueryDto,
  NotificationType,
  UpdatePreferencesDto,
} from "@enterprise/contracts";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { ServiceResult } from "./auth-service";
import type { NotificationEmailPort } from "./ports/notification-email-port";

// ─── Service-Layer Types ──────────────────────────────────────────────────────
// ISO string timestamps (matching Supabase JS client response format)

export interface NotificationRecord {
  id: string;
  tenantId: string;
  userId: string;
  type: NotificationType;
  category: "team" | "billing" | "system";
  title: string;
  body: string;
  metadata: string | null;
  isRead: boolean;
  readAt: string | null;
  sourceEvent: string | null;
  sourceEntityId: string | null;
  createdAt: string;
}

export interface NotificationPreferenceRecord {
  id: string;
  userId: string;
  tenantId: string;
  category: "team" | "billing" | "system";
  inAppEnabled: boolean;
  emailEnabled: boolean;
}

// ─── Critical Types ───────────────────────────────────────────────────────────

/** Critical event types bypass user preferences and always deliver to all channels */
const CRITICAL_TYPES: NotificationType[] = [
  "billing_past_due",
  "billing_canceled",
  "team_invited",
  "team_removed",
];

export function isCritical(type: NotificationType): boolean {
  return CRITICAL_TYPES.includes(type);
}

// ─── Email Channel Strategy ───────────────────────────────────────────────────

/** Notification types that trigger email delivery (in addition to in-app) */
const EMAIL_TYPES: NotificationType[] = [
  "team_invited",
  "team_removed",
  "billing_past_due",
  "billing_canceled",
  "billing_plan_upgraded",
  "billing_plan_downgraded",
  "billing_activated",
  "team_invitation_accepted",
  "team_role_changed",
];

function requiresEmail(type: NotificationType): boolean {
  return EMAIL_TYPES.includes(type);
}

// ─── Row Mapper ───────────────────────────────────────────────────────────────

type NotificationRow = Record<string, unknown>;
type PreferenceRow = Record<string, unknown>;

function mapNotificationRow(row: NotificationRow): NotificationRecord {
  return {
    id: row["id"] as string,
    tenantId: row["tenant_id"] as string,
    userId: row["user_id"] as string,
    type: row["type"] as NotificationType,
    category: row["category"] as NotificationRecord["category"],
    title: row["title"] as string,
    body: row["body"] as string,
    metadata: (row["metadata"] as string | null) ?? null,
    isRead: row["is_read"] as boolean,
    readAt: (row["read_at"] as string | null) ?? null,
    sourceEvent: (row["source_event"] as string | null) ?? null,
    sourceEntityId: (row["source_entity_id"] as string | null) ?? null,
    createdAt: row["created_at"] as string,
  };
}

function mapPreferenceRow(row: PreferenceRow): NotificationPreferenceRecord {
  return {
    id: row["id"] as string,
    userId: row["user_id"] as string,
    tenantId: row["tenant_id"] as string,
    category: row["category"] as NotificationPreferenceRecord["category"],
    inAppEnabled: row["in_app_enabled"] as boolean,
    emailEnabled: row["email_enabled"] as boolean,
  };
}

// ─── Default Preference Helper ────────────────────────────────────────────────

const ALL_CATEGORIES: NotificationPreferenceRecord["category"][] = ["team", "billing", "system"];

function buildDefaultPreferences(userId: string, tenantId: string): NotificationPreferenceRecord[] {
  return ALL_CATEGORIES.map((category) => ({
    id: `default-${category}`,
    userId,
    tenantId,
    category,
    inAppEnabled: true,
    emailEnabled: true,
  }));
}

// ─── Audit Helper ─────────────────────────────────────────────────────────────

async function writeAuditLog(
  client: SupabaseClient,
  tenantId: string,
  userId: string,
  event: string,
  resourceId?: string,
  metadata?: Record<string, unknown>,
): Promise<void> {
  const { error } = await client.from("audit_log").insert({
    tenant_id: tenantId,
    user_id: userId,
    action: "create",
    resource: "notification",
    resource_id: resourceId ?? null,
    metadata: JSON.stringify({ event, ...(metadata ?? {}) }),
    ip_address: null,
    user_agent: null,
  });

  if (error) {
    console.error(`[audit_log] Failed to write [${event}]:`, error);
  }
}

// ─── Service Functions ────────────────────────────────────────────────────────

/**
 * List notifications for a user in a tenant.
 * Supports pagination and optional category/isRead filters.
 * Ordered by created_at DESC.
 */
export async function listNotifications(
  client: SupabaseClient,
  tenantId: string,
  userId: string,
  query: NotificationsQueryDto,
): Promise<ServiceResult<NotificationRecord[]>> {
  const { limit, offset, category, isRead } = query;

  // Build base query — add optional filters BEFORE pagination to keep the chain valid
  let queryBuilder = client
    .from("notifications")
    .select(
      "id, tenant_id, user_id, type, category, title, body, metadata, is_read, read_at, source_event, source_entity_id, created_at",
    )
    .eq("tenant_id", tenantId)
    .eq("user_id", userId);

  if (category !== undefined) {
    queryBuilder = queryBuilder.eq("category", category);
  }

  if (isRead !== undefined) {
    queryBuilder = queryBuilder.eq("is_read", isRead);
  }

  const { data, error } = await queryBuilder
    .order("created_at", { ascending: false })
    .range(offset, offset + limit - 1);

  if (error) {
    return { success: false, error: error.message, code: "NOTIFICATIONS_LIST_FAILED" };
  }

  return {
    success: true,
    data: ((data ?? []) as NotificationRow[]).map(mapNotificationRow),
  };
}

/**
 * Get unread notification count for a user in a tenant.
 * Used for the header bell badge.
 */
export async function getUnreadCount(
  client: SupabaseClient,
  tenantId: string,
  userId: string,
): Promise<ServiceResult<{ count: number }>> {
  const { count, error } = await client
    .from("notifications")
    .select("*", { count: "exact", head: true })
    .eq("tenant_id", tenantId)
    .eq("user_id", userId)
    .eq("is_read", false);

  if (error) {
    return { success: false, error: error.message, code: "UNREAD_COUNT_FAILED" };
  }

  return { success: true, data: { count: count ?? 0 } };
}

/**
 * Mark a single notification as read.
 * Sets is_read = true and read_at = now().
 * Idempotent — no error if already read.
 */
export async function markAsRead(
  client: SupabaseClient,
  tenantId: string,
  userId: string,
  notificationId: string,
): Promise<ServiceResult<null>> {
  // Verify the notification belongs to this user
  const { data: existing, error: fetchError } = await client
    .from("notifications")
    .select("id, user_id, tenant_id, is_read")
    .eq("id", notificationId)
    .eq("tenant_id", tenantId)
    .eq("user_id", userId)
    .maybeSingle();

  if (fetchError) {
    return { success: false, error: fetchError.message, code: "NOTIFICATION_FETCH_FAILED" };
  }

  if (!existing) {
    return {
      success: false,
      error: "Notification not found or access denied",
      code: "NOTIFICATION_NOT_FOUND",
    };
  }

  const row = existing as NotificationRow;

  // Idempotent: already read
  if (row["is_read"] === true) {
    return { success: true, data: null };
  }

  const { error: updateError } = await client
    .from("notifications")
    .update({
      is_read: true,
      read_at: new Date().toISOString(),
    })
    .eq("id", notificationId)
    .eq("tenant_id", tenantId)
    .eq("user_id", userId);

  if (updateError) {
    return { success: false, error: updateError.message, code: "MARK_READ_FAILED" };
  }

  return { success: true, data: null };
}

/**
 * Mark all unread notifications as read for a user in a tenant.
 * Returns the count of updated rows.
 */
export async function markAllAsRead(
  client: SupabaseClient,
  tenantId: string,
  userId: string,
): Promise<ServiceResult<{ updated: number }>> {
  const { data, error } = await client
    .from("notifications")
    .update({
      is_read: true,
      read_at: new Date().toISOString(),
    })
    .eq("tenant_id", tenantId)
    .eq("user_id", userId)
    .eq("is_read", false)
    .select("id");

  if (error) {
    return { success: false, error: error.message, code: "MARK_ALL_READ_FAILED" };
  }

  return { success: true, data: { updated: (data ?? []).length } };
}

/**
 * Create a single in-app notification.
 * Checks user preferences (unless critical) before inserting.
 * Dispatches email via adapter if the notification type requires it.
 * Email dispatch is NON-BLOCKING — failures do not prevent notification creation.
 */
export async function createNotification(
  adminClient: SupabaseClient,
  input: CreateNotificationDto,
  emailAdapter?: NotificationEmailPort,
  recipientEmail?: string,
): Promise<ServiceResult<NotificationRecord>> {
  const critical = isCritical(input.type);

  // Check in-app preference (skip if critical)
  let inAppAllowed = true;
  if (!critical) {
    const prefResult = await getPreferenceForCategory(
      adminClient,
      input.tenantId,
      input.userId,
      input.category,
    );
    inAppAllowed = prefResult.inAppEnabled;
  }

  let notificationRecord: NotificationRecord | null = null;

  // Create in-app notification if allowed
  if (inAppAllowed) {
    const { data, error } = await adminClient
      .from("notifications")
      .insert({
        tenant_id: input.tenantId,
        user_id: input.userId,
        type: input.type,
        category: input.category,
        title: input.title,
        body: input.body,
        metadata: input.metadata ?? null,
        source_event: input.sourceEvent ?? null,
        source_entity_id: input.sourceEntityId ?? null,
      })
      .select(
        "id, tenant_id, user_id, type, category, title, body, metadata, is_read, read_at, source_event, source_entity_id, created_at",
      )
      .single();

    if (error) {
      return { success: false, error: error.message, code: "NOTIFICATION_CREATE_FAILED" };
    }

    notificationRecord = mapNotificationRow(data as NotificationRow);

    // Audit: notification created
    void writeAuditLog(
      adminClient,
      input.tenantId,
      input.userId,
      "notification.created",
      notificationRecord.id,
      { type: input.type, category: input.category },
    );
  }

  // Dispatch email if applicable
  if (emailAdapter && recipientEmail && requiresEmail(input.type)) {
    let emailAllowed = critical;

    if (!emailAllowed) {
      const prefResult = await getPreferenceForCategory(
        adminClient,
        input.tenantId,
        input.userId,
        input.category,
      );
      emailAllowed = prefResult.emailEnabled;
    }

    if (emailAllowed) {
      // Non-blocking email dispatch
      emailAdapter
        .sendNotificationEmail({
          to: recipientEmail,
          subject: input.title,
          title: input.title,
          body: input.body,
        })
        .then((emailResult) => {
          const auditEvent = emailResult.success
            ? "notification.email_sent"
            : "notification.email_failed";

          void writeAuditLog(adminClient, input.tenantId, input.userId, auditEvent, undefined, {
            type: input.type,
            error: emailResult.success ? undefined : emailResult.error,
          });
        })
        .catch((err) => {
          console.error("[notification-service] Email dispatch error:", err);
          void writeAuditLog(
            adminClient,
            input.tenantId,
            input.userId,
            "notification.email_failed",
            undefined,
            { type: input.type, error: err instanceof Error ? err.message : "Unknown error" },
          );
        });
    }
  }

  // If in-app was disabled and no notification was created, return a synthetic record
  if (!notificationRecord) {
    // Return a synthetic representation when in-app was disabled by preference
    return {
      success: true,
      data: {
        id: "",
        tenantId: input.tenantId,
        userId: input.userId,
        type: input.type,
        category: input.category,
        title: input.title,
        body: input.body,
        metadata: input.metadata ?? null,
        isRead: false,
        readAt: null,
        sourceEvent: input.sourceEvent ?? null,
        sourceEntityId: input.sourceEntityId ?? null,
        createdAt: new Date().toISOString(),
      },
    };
  }

  return { success: true, data: notificationRecord };
}

/**
 * Create notifications for multiple recipients.
 * Used for broadcasting events (e.g. billing_past_due → owner + admins).
 * Non-blocking: individual failures are logged but do not abort the batch.
 */
export async function createBulkNotifications(
  adminClient: SupabaseClient,
  inputs: CreateNotificationDto[],
  emailAdapter?: NotificationEmailPort,
  recipientEmails?: Record<string, string>,
): Promise<ServiceResult<NotificationRecord[]>> {
  if (inputs.length === 0) {
    return { success: true, data: [] };
  }

  const results: NotificationRecord[] = [];
  const errors: string[] = [];

  for (const input of inputs) {
    const recipientEmail = recipientEmails?.[input.userId];
    const result = await createNotification(adminClient, input, emailAdapter, recipientEmail);

    if (result.success) {
      results.push(result.data);
    } else {
      errors.push(`${input.userId}: ${result.error}`);
      console.error(
        "[notification-service] createBulkNotifications partial failure:",
        result.error,
      );
    }
  }

  if (errors.length > 0 && results.length === 0) {
    return {
      success: false,
      error: `All ${errors.length} notifications failed`,
      code: "BULK_CREATE_FAILED",
    };
  }

  return { success: true, data: results };
}

/**
 * Get notification preferences for a user in a tenant.
 * Returns all 3 categories; missing rows use default (all enabled).
 */
export async function getPreferences(
  client: SupabaseClient,
  tenantId: string,
  userId: string,
): Promise<ServiceResult<NotificationPreferenceRecord[]>> {
  const { data, error } = await client
    .from("notification_preferences")
    .select("id, user_id, tenant_id, category, in_app_enabled, email_enabled")
    .eq("tenant_id", tenantId)
    .eq("user_id", userId);

  if (error) {
    return { success: false, error: error.message, code: "PREFERENCES_FETCH_FAILED" };
  }

  const rows = ((data ?? []) as PreferenceRow[]).map(mapPreferenceRow);

  // Fill in missing categories with defaults
  const existing = new Set(rows.map((r) => r.category));
  const defaults = buildDefaultPreferences(userId, tenantId).filter(
    (d) => !existing.has(d.category),
  );

  return { success: true, data: [...rows, ...defaults] };
}

/**
 * Upsert notification preferences for a user in a tenant.
 * Writes audit log for the change.
 */
export async function updatePreferences(
  client: SupabaseClient,
  tenantId: string,
  userId: string,
  input: UpdatePreferencesDto,
): Promise<ServiceResult<NotificationPreferenceRecord[]>> {
  const upsertRows = input.preferences.map((pref) => ({
    user_id: userId,
    tenant_id: tenantId,
    category: pref.category,
    in_app_enabled: pref.inAppEnabled,
    email_enabled: pref.emailEnabled,
    updated_at: new Date().toISOString(),
  }));

  const { data, error } = await client
    .from("notification_preferences")
    .upsert(upsertRows, { onConflict: "user_id,tenant_id,category" })
    .select("id, user_id, tenant_id, category, in_app_enabled, email_enabled");

  if (error) {
    return { success: false, error: error.message, code: "PREFERENCES_UPDATE_FAILED" };
  }

  // Audit: preferences changed
  void writeAuditLog(client, tenantId, userId, "notification.preferences_updated", undefined, {
    categories: input.preferences.map((p) => p.category),
  });

  return {
    success: true,
    data: ((data ?? []) as PreferenceRow[]).map(mapPreferenceRow),
  };
}

// ─── Internal Helpers ─────────────────────────────────────────────────────────

/**
 * Fetch preference for a specific category.
 * Falls back to defaults (all enabled) if no row exists.
 */
async function getPreferenceForCategory(
  client: SupabaseClient,
  tenantId: string,
  userId: string,
  category: "team" | "billing" | "system",
): Promise<{ inAppEnabled: boolean; emailEnabled: boolean }> {
  const { data } = await client
    .from("notification_preferences")
    .select("in_app_enabled, email_enabled")
    .eq("tenant_id", tenantId)
    .eq("user_id", userId)
    .eq("category", category)
    .maybeSingle();

  if (!data) {
    // Missing row = all enabled (preference default)
    return { inAppEnabled: true, emailEnabled: true };
  }

  const row = data as PreferenceRow;
  return {
    inAppEnabled: row["in_app_enabled"] as boolean,
    emailEnabled: row["email_enabled"] as boolean,
  };
}
