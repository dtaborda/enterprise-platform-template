import { describe, expect, it } from "vitest";
import {
  createNotificationSchema,
  markAllAsReadSchema,
  markAsReadSchema,
  NOTIFICATION_CATEGORY,
  NOTIFICATION_TYPE,
  notificationCategorySchema,
  notificationPreferenceSchema,
  notificationSchema,
  notificationsQuerySchema,
  notificationTypeSchema,
  unreadCountSchema,
  updatePreferencesSchema,
} from "../dto/notifications";

// ============================================================================
// notificationTypeSchema
// ============================================================================

describe("notificationTypeSchema", () => {
  it("accepts all 9 valid notification types", () => {
    const types = [
      "team_invited",
      "team_invitation_accepted",
      "team_role_changed",
      "team_removed",
      "billing_past_due",
      "billing_plan_upgraded",
      "billing_plan_downgraded",
      "billing_canceled",
      "billing_activated",
    ];

    for (const type of types) {
      const result = notificationTypeSchema.safeParse(type);
      expect(result.success, `Expected ${type} to be valid`).toBe(true);
    }
  });

  it("rejects an invalid type", () => {
    const result = notificationTypeSchema.safeParse("sms_alert");
    expect(result.success).toBe(false);
  });

  it("rejects an empty string", () => {
    const result = notificationTypeSchema.safeParse("");
    expect(result.success).toBe(false);
  });

  it("exposes all values via NOTIFICATION_TYPE const", () => {
    expect(NOTIFICATION_TYPE.TEAM_INVITED).toBe("team_invited");
    expect(NOTIFICATION_TYPE.TEAM_REMOVED).toBe("team_removed");
    expect(NOTIFICATION_TYPE.BILLING_PAST_DUE).toBe("billing_past_due");
    expect(NOTIFICATION_TYPE.BILLING_CANCELED).toBe("billing_canceled");
    expect(NOTIFICATION_TYPE.BILLING_ACTIVATED).toBe("billing_activated");
  });
});

// ============================================================================
// notificationCategorySchema
// ============================================================================

describe("notificationCategorySchema", () => {
  it("accepts 'team'", () => {
    expect(notificationCategorySchema.safeParse("team").success).toBe(true);
  });

  it("accepts 'billing'", () => {
    expect(notificationCategorySchema.safeParse("billing").success).toBe(true);
  });

  it("accepts 'system'", () => {
    expect(notificationCategorySchema.safeParse("system").success).toBe(true);
  });

  it("rejects 'notifications'", () => {
    expect(notificationCategorySchema.safeParse("notifications").success).toBe(false);
  });

  it("exposes all values via NOTIFICATION_CATEGORY const", () => {
    expect(NOTIFICATION_CATEGORY.TEAM).toBe("team");
    expect(NOTIFICATION_CATEGORY.BILLING).toBe("billing");
    expect(NOTIFICATION_CATEGORY.SYSTEM).toBe("system");
  });
});

// ============================================================================
// notificationSchema
// ============================================================================

describe("notificationSchema", () => {
  const validNotification = {
    id: "a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11",
    tenantId: "b1eebc99-9c0b-4ef8-bb6d-6bb9bd380a22",
    userId: "c2eebc99-9c0b-4ef8-bb6d-6bb9bd380a33",
    type: "team_invited" as const,
    category: "team" as const,
    title: "You were invited to join Acme",
    body: "Admin invited you as a member.",
    metadata: null,
    isRead: false,
    readAt: null,
    sourceEvent: "tenant_member.invited",
    sourceEntityId: null,
    createdAt: "2024-01-01T00:00:00.000Z",
  };

  it("accepts a valid notification", () => {
    const result = notificationSchema.safeParse(validNotification);
    expect(result.success).toBe(true);
  });

  it("accepts null metadata", () => {
    const result = notificationSchema.safeParse({ ...validNotification, metadata: null });
    expect(result.success).toBe(true);
  });

  it("accepts string metadata (JSON string)", () => {
    const result = notificationSchema.safeParse({
      ...validNotification,
      metadata: '{"role":"member"}',
    });
    expect(result.success).toBe(true);
  });

  it("accepts null readAt", () => {
    const result = notificationSchema.safeParse({ ...validNotification, readAt: null });
    expect(result.success).toBe(true);
  });

  it("accepts null sourceEvent", () => {
    const result = notificationSchema.safeParse({ ...validNotification, sourceEvent: null });
    expect(result.success).toBe(true);
  });

  it("accepts null sourceEntityId", () => {
    const result = notificationSchema.safeParse({ ...validNotification, sourceEntityId: null });
    expect(result.success).toBe(true);
  });

  it("accepts a valid UUID for sourceEntityId", () => {
    const result = notificationSchema.safeParse({
      ...validNotification,
      sourceEntityId: "d3eebc99-9c0b-4ef8-bb6d-6bb9bd380a44",
    });
    expect(result.success).toBe(true);
  });

  it("rejects invalid UUID for id", () => {
    const result = notificationSchema.safeParse({ ...validNotification, id: "not-a-uuid" });
    expect(result.success).toBe(false);
  });

  it("rejects invalid type", () => {
    const result = notificationSchema.safeParse({ ...validNotification, type: "unknown_event" });
    expect(result.success).toBe(false);
  });

  it("rejects missing required field 'title'", () => {
    const { title: _title, ...withoutTitle } = validNotification;
    const result = notificationSchema.safeParse(withoutTitle);
    expect(result.success).toBe(false);
  });
});

// ============================================================================
// notificationPreferenceSchema
// ============================================================================

describe("notificationPreferenceSchema", () => {
  const validPreference = {
    id: "a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11",
    userId: "b1eebc99-9c0b-4ef8-bb6d-6bb9bd380a22",
    tenantId: "c2eebc99-9c0b-4ef8-bb6d-6bb9bd380a33",
    category: "billing" as const,
    inAppEnabled: true,
    emailEnabled: false,
  };

  it("accepts a valid preference", () => {
    const result = notificationPreferenceSchema.safeParse(validPreference);
    expect(result.success).toBe(true);
  });

  it("rejects invalid category", () => {
    const result = notificationPreferenceSchema.safeParse({ ...validPreference, category: "sms" });
    expect(result.success).toBe(false);
  });

  it("rejects non-boolean inAppEnabled", () => {
    const result = notificationPreferenceSchema.safeParse({
      ...validPreference,
      inAppEnabled: "true",
    });
    expect(result.success).toBe(false);
  });
});

// ============================================================================
// unreadCountSchema
// ============================================================================

describe("unreadCountSchema", () => {
  it("accepts count = 0", () => {
    const result = unreadCountSchema.safeParse({ count: 0 });
    expect(result.success).toBe(true);
  });

  it("accepts positive count", () => {
    const result = unreadCountSchema.safeParse({ count: 42 });
    expect(result.success).toBe(true);
  });

  it("rejects negative count", () => {
    const result = unreadCountSchema.safeParse({ count: -1 });
    expect(result.success).toBe(false);
  });

  it("rejects float count", () => {
    const result = unreadCountSchema.safeParse({ count: 1.5 });
    expect(result.success).toBe(false);
  });

  it("rejects string count", () => {
    const result = unreadCountSchema.safeParse({ count: "5" });
    expect(result.success).toBe(false);
  });
});

// ============================================================================
// markAsReadSchema
// ============================================================================

describe("markAsReadSchema", () => {
  it("accepts a valid UUID notificationId", () => {
    const result = markAsReadSchema.safeParse({
      notificationId: "a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11",
    });
    expect(result.success).toBe(true);
  });

  it("rejects a non-UUID notificationId", () => {
    const result = markAsReadSchema.safeParse({ notificationId: "some-string" });
    expect(result.success).toBe(false);
  });

  it("rejects missing notificationId", () => {
    const result = markAsReadSchema.safeParse({});
    expect(result.success).toBe(false);
  });
});

// ============================================================================
// markAllAsReadSchema
// ============================================================================

describe("markAllAsReadSchema", () => {
  it("accepts an empty object", () => {
    const result = markAllAsReadSchema.safeParse({});
    expect(result.success).toBe(true);
  });

  it("accepts extra keys (strips them)", () => {
    const result = markAllAsReadSchema.safeParse({ extra: "value" });
    expect(result.success).toBe(true);
  });
});

// ============================================================================
// updatePreferencesSchema
// ============================================================================

describe("updatePreferencesSchema", () => {
  it("accepts a valid preferences array", () => {
    const result = updatePreferencesSchema.safeParse({
      preferences: [
        { category: "billing", inAppEnabled: true, emailEnabled: false },
        { category: "team", inAppEnabled: true, emailEnabled: true },
      ],
    });
    expect(result.success).toBe(true);
  });

  it("accepts an empty preferences array", () => {
    const result = updatePreferencesSchema.safeParse({ preferences: [] });
    expect(result.success).toBe(true);
  });

  it("rejects preferences with invalid category", () => {
    const result = updatePreferencesSchema.safeParse({
      preferences: [{ category: "push", inAppEnabled: true, emailEnabled: false }],
    });
    expect(result.success).toBe(false);
  });

  it("rejects missing preferences field", () => {
    const result = updatePreferencesSchema.safeParse({});
    expect(result.success).toBe(false);
  });
});

// ============================================================================
// notificationsQuerySchema
// ============================================================================

describe("notificationsQuerySchema", () => {
  it("applies default limit = 20 when not provided", () => {
    const result = notificationsQuerySchema.safeParse({});
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.limit).toBe(20);
    }
  });

  it("applies default offset = 0 when not provided", () => {
    const result = notificationsQuerySchema.safeParse({});
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.offset).toBe(0);
    }
  });

  it("accepts optional category filter", () => {
    const result = notificationsQuerySchema.safeParse({ category: "billing" });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.category).toBe("billing");
    }
  });

  it("accepts optional isRead filter", () => {
    const result = notificationsQuerySchema.safeParse({ isRead: false });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.isRead).toBe(false);
    }
  });

  it("accepts limit at boundary max (100)", () => {
    const result = notificationsQuerySchema.safeParse({ limit: 100 });
    expect(result.success).toBe(true);
  });

  it("rejects limit > 100", () => {
    const result = notificationsQuerySchema.safeParse({ limit: 101 });
    expect(result.success).toBe(false);
  });

  it("rejects limit < 1", () => {
    const result = notificationsQuerySchema.safeParse({ limit: 0 });
    expect(result.success).toBe(false);
  });

  it("rejects negative offset", () => {
    const result = notificationsQuerySchema.safeParse({ offset: -1 });
    expect(result.success).toBe(false);
  });

  it("rejects invalid category value", () => {
    const result = notificationsQuerySchema.safeParse({ category: "email" });
    expect(result.success).toBe(false);
  });
});

// ============================================================================
// createNotificationSchema
// ============================================================================

describe("createNotificationSchema", () => {
  const validInput = {
    tenantId: "a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11",
    userId: "b1eebc99-9c0b-4ef8-bb6d-6bb9bd380a22",
    type: "billing_past_due" as const,
    category: "billing" as const,
    title: "Payment past due",
    body: "Please update your payment method.",
    metadata: null,
    sourceEvent: "billing.subscription_past_due",
    sourceEntityId: null,
  };

  it("accepts a valid create notification input", () => {
    const result = createNotificationSchema.safeParse(validInput);
    expect(result.success).toBe(true);
  });

  it("accepts optional metadata as JSON string", () => {
    const result = createNotificationSchema.safeParse({
      ...validInput,
      metadata: '{"graceEndsAt":"2026-06-15T00:00:00Z"}',
    });
    expect(result.success).toBe(true);
  });

  it("accepts optional sourceEntityId as UUID", () => {
    const result = createNotificationSchema.safeParse({
      ...validInput,
      sourceEntityId: "c2eebc99-9c0b-4ef8-bb6d-6bb9bd380a33",
    });
    expect(result.success).toBe(true);
  });

  it("rejects title shorter than 1 char", () => {
    const result = createNotificationSchema.safeParse({ ...validInput, title: "" });
    expect(result.success).toBe(false);
  });

  it("rejects title longer than 200 chars", () => {
    const result = createNotificationSchema.safeParse({
      ...validInput,
      title: "x".repeat(201),
    });
    expect(result.success).toBe(false);
  });

  it("rejects body longer than 1000 chars", () => {
    const result = createNotificationSchema.safeParse({
      ...validInput,
      body: "x".repeat(1001),
    });
    expect(result.success).toBe(false);
  });

  it("rejects invalid type", () => {
    const result = createNotificationSchema.safeParse({ ...validInput, type: "push_alert" });
    expect(result.success).toBe(false);
  });

  it("rejects invalid UUID for sourceEntityId", () => {
    const result = createNotificationSchema.safeParse({
      ...validInput,
      sourceEntityId: "not-a-uuid",
    });
    expect(result.success).toBe(false);
  });

  it("accepts input without optional fields", () => {
    const { metadata: _m, sourceEvent: _se, sourceEntityId: _sei, ...minimal } = validInput;
    const result = createNotificationSchema.safeParse(minimal);
    expect(result.success).toBe(true);
  });
});
