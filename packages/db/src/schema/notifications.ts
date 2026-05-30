// Notifications schema — in-app notification feed and user preferences
// INSERT is service_role only; SELECT/UPDATE are authenticated (user_id = auth.uid())

import { sql } from "drizzle-orm";
import {
  boolean,
  index,
  pgEnum,
  pgPolicy,
  pgTable,
  text,
  timestamp,
  unique,
  uuid,
} from "drizzle-orm/pg-core";
import { authenticatedRole, serviceRole } from "drizzle-orm/supabase";
import { tenants } from "./platform.js";

// ============================================================================
// Enums
// ============================================================================

/** Notification type — identifies the triggering event */
export const notificationTypeEnum = pgEnum("notification_type", [
  "team_invited",
  "team_invitation_accepted",
  "team_role_changed",
  "team_removed",
  "billing_past_due",
  "billing_plan_upgraded",
  "billing_plan_downgraded",
  "billing_canceled",
  "billing_activated",
]);

/** Notification category — groups notifications for filtering and preference controls */
export const notificationCategoryEnum = pgEnum("notification_category", [
  "team",
  "billing",
  "system",
]);

// ============================================================================
// RLS Helpers
// ============================================================================

/** Matches the user_id column against the authenticated user's JWT sub */
const userIdMatchesUid = sql`(user_id = auth.uid())`;

/** Matches the tenant_id column against the JWT app_metadata tenant_id claim */
const tenantClaimMatchesColumn = sql`((auth.jwt()->'app_metadata'->>'tenant_id')::uuid = tenant_id)`;

/** Combined user + tenant scope check (used on both tables) */
const userAndTenantMatch = sql`(${userIdMatchesUid} AND ${tenantClaimMatchesColumn})`;

// ============================================================================
// Notifications Table
// ============================================================================

/**
 * notifications — immutable event log per user per tenant.
 * Only is_read and read_at are mutable after creation.
 * INSERT is service_role only — notifications are created by service-layer code
 * that may not have the recipient's JWT context (e.g. billing webhooks).
 */
export const notifications = pgTable(
  "notifications",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    tenantId: uuid("tenant_id")
      .notNull()
      .references(() => tenants.id, { onDelete: "cascade" }),
    /** Recipient — references auth.users.id (no FK enforced; users may be removed) */
    userId: uuid("user_id").notNull(),
    type: notificationTypeEnum("type").notNull(),
    category: notificationCategoryEnum("category").notNull(),
    title: text("title").notNull(),
    body: text("body").notNull(),
    /** JSON string — parsed at service layer. Consistent with billing features/limits pattern. */
    metadata: text("metadata"),
    isRead: boolean("is_read").notNull().default(false),
    readAt: timestamp("read_at", { withTimezone: true }),
    /** Original triggering event name (e.g. 'tenant_member.invited') */
    sourceEvent: text("source_event"),
    /** ID of the entity that triggered this notification */
    sourceEntityId: uuid("source_entity_id"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    index("notifications_user_tenant_idx").on(table.userId, table.tenantId),
    index("notifications_user_unread_idx").on(table.userId, table.tenantId, table.isRead),
    index("notifications_category_idx").on(table.category),
    index("notifications_created_at_idx").on(table.createdAt),
    index("notifications_source_event_idx").on(table.sourceEvent),
    // SELECT: user sees only their own notifications in their tenant
    pgPolicy("notifications_select", {
      as: "permissive",
      for: "select",
      to: authenticatedRole,
      using: userAndTenantMatch,
    }),
    // INSERT: service_role only — no recipient JWT available at create time
    pgPolicy("notifications_insert", {
      as: "permissive",
      for: "insert",
      to: serviceRole,
      withCheck: sql`true`,
    }),
    // UPDATE: user can mark their own notifications as read
    pgPolicy("notifications_update", {
      as: "permissive",
      for: "update",
      to: authenticatedRole,
      using: userAndTenantMatch,
      withCheck: userAndTenantMatch,
    }),
    // No DELETE policy — retention cleanup is a follow-up (90-day cron job)
  ],
).enableRLS();

// ============================================================================
// Notification Preferences Table
// ============================================================================

/**
 * notification_preferences — per-user, per-tenant, per-category toggles.
 * Missing row means all channels enabled (preference default = enabled).
 * UNIQUE constraint prevents duplicate rows per (user, tenant, category).
 */
export const notificationPreferences = pgTable(
  "notification_preferences",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    /** Owner of the preference — references auth.users.id */
    userId: uuid("user_id").notNull(),
    tenantId: uuid("tenant_id")
      .notNull()
      .references(() => tenants.id, { onDelete: "cascade" }),
    category: notificationCategoryEnum("category").notNull(),
    inAppEnabled: boolean("in_app_enabled").notNull().default(true),
    emailEnabled: boolean("email_enabled").notNull().default(true),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    index("preferences_user_tenant_idx").on(table.userId, table.tenantId),
    // One preference row per user per tenant per category
    unique("preferences_user_tenant_category_unique").on(
      table.userId,
      table.tenantId,
      table.category,
    ),
    pgPolicy("preferences_select", {
      as: "permissive",
      for: "select",
      to: authenticatedRole,
      using: userAndTenantMatch,
    }),
    pgPolicy("preferences_insert", {
      as: "permissive",
      for: "insert",
      to: authenticatedRole,
      withCheck: userAndTenantMatch,
    }),
    pgPolicy("preferences_update", {
      as: "permissive",
      for: "update",
      to: authenticatedRole,
      using: userAndTenantMatch,
      withCheck: userAndTenantMatch,
    }),
    // No DELETE policy — preferences are updated, not removed
  ],
).enableRLS();

// ============================================================================
// Type Exports (for use in services)
// ============================================================================

export type Notification = typeof notifications.$inferSelect;
export type NewNotification = typeof notifications.$inferInsert;

export type NotificationPreference = typeof notificationPreferences.$inferSelect;
export type NewNotificationPreference = typeof notificationPreferences.$inferInsert;
