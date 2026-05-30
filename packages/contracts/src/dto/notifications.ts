import { z } from "zod";

// ============================================================================
// Notification Type & Category — const objects + z.enum (contracts pattern)
// ============================================================================

export const NOTIFICATION_TYPE = {
  TEAM_INVITED: "team_invited",
  TEAM_INVITATION_ACCEPTED: "team_invitation_accepted",
  TEAM_ROLE_CHANGED: "team_role_changed",
  TEAM_REMOVED: "team_removed",
  BILLING_PAST_DUE: "billing_past_due",
  BILLING_PLAN_UPGRADED: "billing_plan_upgraded",
  BILLING_PLAN_DOWNGRADED: "billing_plan_downgraded",
  BILLING_CANCELED: "billing_canceled",
  BILLING_ACTIVATED: "billing_activated",
} as const;

export type NotificationType = (typeof NOTIFICATION_TYPE)[keyof typeof NOTIFICATION_TYPE];

export const notificationTypeSchema = z.enum([
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

export const NOTIFICATION_CATEGORY = {
  TEAM: "team",
  BILLING: "billing",
  SYSTEM: "system",
} as const;

export type NotificationCategory =
  (typeof NOTIFICATION_CATEGORY)[keyof typeof NOTIFICATION_CATEGORY];

export const notificationCategorySchema = z.enum(["team", "billing", "system"]);

// ============================================================================
// Output Schemas
// ============================================================================

/** Notification display shape */
export const notificationSchema = z.object({
  id: z.string().uuid(),
  tenantId: z.string().uuid(),
  userId: z.string().uuid(),
  type: notificationTypeSchema,
  category: notificationCategorySchema,
  title: z.string(),
  body: z.string(),
  metadata: z.string().nullable(),
  isRead: z.boolean(),
  readAt: z.string().datetime().nullable(),
  sourceEvent: z.string().nullable(),
  sourceEntityId: z.string().uuid().nullable(),
  createdAt: z.string().datetime(),
});

export type NotificationDto = z.infer<typeof notificationSchema>;

/** Notification preference display shape */
export const notificationPreferenceSchema = z.object({
  id: z.string().uuid(),
  userId: z.string().uuid(),
  tenantId: z.string().uuid(),
  category: notificationCategorySchema,
  inAppEnabled: z.boolean(),
  emailEnabled: z.boolean(),
});

export type NotificationPreferenceDto = z.infer<typeof notificationPreferenceSchema>;

/** Unread count shape */
export const unreadCountSchema = z.object({
  count: z.number().int().min(0),
});

export type UnreadCountDto = z.infer<typeof unreadCountSchema>;

// ============================================================================
// Input Schemas
// ============================================================================

/** Mark single notification as read */
export const markAsReadSchema = z.object({
  notificationId: z.string().uuid(),
});

export type MarkAsReadDto = z.infer<typeof markAsReadSchema>;

/** Mark all as read (no input — uses auth context) */
export const markAllAsReadSchema = z.object({});

export type MarkAllAsReadDto = z.infer<typeof markAllAsReadSchema>;

/** Update preferences */
export const updatePreferencesSchema = z.object({
  preferences: z.array(
    z.object({
      category: notificationCategorySchema,
      inAppEnabled: z.boolean(),
      emailEnabled: z.boolean(),
    }),
  ),
});

export type UpdatePreferencesDto = z.infer<typeof updatePreferencesSchema>;

/** List notifications query */
export const notificationsQuerySchema = z.object({
  category: notificationCategorySchema.optional(),
  isRead: z.boolean().optional(),
  limit: z.number().int().min(1).max(100).default(20),
  offset: z.number().int().min(0).default(0),
});

export type NotificationsQueryDto = z.infer<typeof notificationsQuerySchema>;

/** Create notification (internal — used by services, not exposed as Server Action) */
export const createNotificationSchema = z.object({
  tenantId: z.string().uuid(),
  userId: z.string().uuid(),
  type: notificationTypeSchema,
  category: notificationCategorySchema,
  title: z.string().min(1).max(200),
  body: z.string().min(1).max(1000),
  metadata: z.string().nullable().optional(),
  sourceEvent: z.string().nullable().optional(),
  sourceEntityId: z.string().uuid().nullable().optional(),
});

export type CreateNotificationDto = z.infer<typeof createNotificationSchema>;
