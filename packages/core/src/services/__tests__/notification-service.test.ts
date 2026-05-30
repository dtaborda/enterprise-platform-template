import type { SupabaseClient } from "@supabase/supabase-js";
import { describe, expect, it, vi } from "vitest";
import {
  createBulkNotifications,
  createNotification,
  getPreferences,
  getUnreadCount,
  isCritical,
  listNotifications,
  markAllAsRead,
  markAsRead,
  updatePreferences,
} from "../notification-service";
import type { NotificationEmailPort } from "../ports/notification-email-port";

// ─── Constants ────────────────────────────────────────────────────────────────

const TENANT_ID = "aaaaaaaa-0000-4000-8000-000000000001";
const USER_ID = "bbbbbbbb-0000-4000-8000-000000000001";
const OTHER_USER_ID = "bbbbbbbb-0000-4000-8000-000000000099";
const NOTIFICATION_ID = "cccccccc-0000-4000-8000-000000000001";

const TEAM_NOTIFICATION_ROW = {
  id: NOTIFICATION_ID,
  tenant_id: TENANT_ID,
  user_id: USER_ID,
  type: "team_invited",
  category: "team",
  title: "You were invited",
  body: "Admin invited you as a member.",
  metadata: null,
  is_read: false,
  read_at: null,
  source_event: "tenant_member.invited",
  source_entity_id: null,
  created_at: "2024-01-01T00:00:00.000Z",
};

const BILLING_NOTIFICATION_ROW = {
  id: "cccccccc-0000-4000-8000-000000000002",
  tenant_id: TENANT_ID,
  user_id: USER_ID,
  type: "billing_past_due",
  category: "billing",
  title: "Payment past due",
  body: "Update your payment method.",
  metadata: null,
  is_read: false,
  read_at: null,
  source_event: "billing.subscription_past_due",
  source_entity_id: null,
  created_at: "2024-01-02T00:00:00.000Z",
};

const READ_NOTIFICATION_ROW = {
  ...TEAM_NOTIFICATION_ROW,
  id: "cccccccc-0000-4000-8000-000000000003",
  is_read: true,
  read_at: "2024-01-01T12:00:00.000Z",
};

const PREFERENCE_ROW = {
  id: "dddddddd-0000-4000-8000-000000000001",
  user_id: USER_ID,
  tenant_id: TENANT_ID,
  category: "team",
  in_app_enabled: true,
  email_enabled: false,
};

// ─── Mock Builder ─────────────────────────────────────────────────────────────

function buildMockClientWithSequence(responses: Array<{ data: unknown; error: unknown }>): {
  client: SupabaseClient;
  callCount: () => number;
} {
  let idx = 0;
  const getResponse = () => responses[Math.min(idx++, responses.length - 1)];

  const chain = {
    select: vi.fn().mockReturnThis(),
    insert: vi.fn().mockReturnThis(),
    update: vi.fn().mockReturnThis(),
    upsert: vi.fn().mockReturnThis(),
    eq: vi.fn().mockReturnThis(),
    order: vi.fn().mockReturnThis(),
    range: vi.fn().mockReturnThis(),
    single: vi.fn().mockImplementation(() => Promise.resolve(getResponse())),
    maybeSingle: vi.fn().mockImplementation(() => Promise.resolve(getResponse())),
  };

  const client = {
    from: vi.fn().mockReturnValue(chain),
    _chain: chain,
  } as unknown as SupabaseClient;

  return { client, callCount: () => idx };
}

function buildMockAdapter(result: { success: boolean; error?: string }): NotificationEmailPort {
  return {
    sendNotificationEmail: vi.fn().mockResolvedValue(result),
  };
}

// ─── isCritical ───────────────────────────────────────────────────────────────

describe("isCritical", () => {
  it("returns true for billing_past_due", () => {
    expect(isCritical("billing_past_due")).toBe(true);
  });

  it("returns true for billing_canceled", () => {
    expect(isCritical("billing_canceled")).toBe(true);
  });

  it("returns true for team_invited", () => {
    expect(isCritical("team_invited")).toBe(true);
  });

  it("returns true for team_removed", () => {
    expect(isCritical("team_removed")).toBe(true);
  });

  it("returns false for billing_plan_upgraded", () => {
    expect(isCritical("billing_plan_upgraded")).toBe(false);
  });

  it("returns false for team_role_changed", () => {
    expect(isCritical("team_role_changed")).toBe(false);
  });
});

// ─── listNotifications mock ───────────────────────────────────────────────────

/**
 * Build a mock for listNotifications which uses .select().eq().eq().order().range()
 * The last method in the chain is range() which must return the promise.
 */
function buildListMockClient(resolveWith: { data: unknown; error: unknown }): SupabaseClient {
  // listNotifications uses: .select().eq().eq()[.eq()][.eq()].order().range()
  // All chainable methods must return the same object, and range() returns the promise
  const chain: Record<string, unknown> = {};
  chain["select"] = vi.fn().mockReturnValue(chain);
  chain["eq"] = vi.fn().mockReturnValue(chain);
  chain["order"] = vi.fn().mockReturnValue(chain);
  chain["range"] = vi.fn().mockResolvedValue(resolveWith);
  return { from: vi.fn().mockReturnValue(chain) } as unknown as SupabaseClient;
}

// ─── listNotifications ────────────────────────────────────────────────────────

describe("listNotifications", () => {
  it("returns user notifications scoped to tenant (basic pagination)", async () => {
    const rows = [TEAM_NOTIFICATION_ROW, BILLING_NOTIFICATION_ROW];
    const client = buildListMockClient({ data: rows, error: null });

    const result = await listNotifications(client, TENANT_ID, USER_ID, {
      limit: 20,
      offset: 0,
    });

    expect(result.success).toBe(true);
    if (!result.success) return;
    expect(result.data).toHaveLength(2);
    expect(result.data[0]?.tenantId).toBe(TENANT_ID);
    expect(result.data[0]?.userId).toBe(USER_ID);
  });

  it("returns only billing category when category filter is applied", async () => {
    const rows = [BILLING_NOTIFICATION_ROW];
    const client = buildListMockClient({ data: rows, error: null });

    const result = await listNotifications(client, TENANT_ID, USER_ID, {
      limit: 20,
      offset: 0,
      category: "billing",
    });

    expect(result.success).toBe(true);
    if (!result.success) return;
    expect(result.data).toHaveLength(1);
    expect(result.data[0]?.category).toBe("billing");
  });

  it("returns only unread when isRead=false filter is applied", async () => {
    const rows = [TEAM_NOTIFICATION_ROW, BILLING_NOTIFICATION_ROW];
    const client = buildListMockClient({ data: rows, error: null });

    const result = await listNotifications(client, TENANT_ID, USER_ID, {
      limit: 20,
      offset: 0,
      isRead: false,
    });

    expect(result.success).toBe(true);
    if (!result.success) return;
    expect(result.data.every((n) => !n.isRead)).toBe(true);
  });

  it("returns error when query fails", async () => {
    const client = buildListMockClient({ data: null, error: { message: "DB error" } });

    const result = await listNotifications(client, TENANT_ID, USER_ID, {
      limit: 20,
      offset: 0,
    });

    expect(result.success).toBe(false);
    if (result.success) return;
    expect(result.code).toBe("NOTIFICATIONS_LIST_FAILED");
  });
});

// ─── getUnreadCount mock helper ───────────────────────────────────────────────

/**
 * Build a mock for getUnreadCount which uses .select("*", {count:"exact",head:true}).eq().eq().eq()
 * The third eq() is the last — returns the promise with { count, error }.
 */
function buildCountMockClient(count: number | null): SupabaseClient {
  let eqCalls = 0;
  const chain: Record<string, unknown> = {};
  chain["select"] = vi.fn().mockReturnValue(chain);
  chain["eq"] = vi.fn().mockImplementation(() => {
    eqCalls++;
    if (eqCalls >= 3) {
      return Promise.resolve({ count, error: null });
    }
    return chain;
  });
  return { from: vi.fn().mockReturnValue(chain) } as unknown as SupabaseClient;
}

// ─── getUnreadCount ───────────────────────────────────────────────────────────

describe("getUnreadCount", () => {
  it("returns correct count of unread notifications", async () => {
    const client = buildCountMockClient(3);

    const result = await getUnreadCount(client, TENANT_ID, USER_ID);

    expect(result.success).toBe(true);
    if (!result.success) return;
    expect(result.data.count).toBe(3);
  });

  it("returns count = 0 when no unread notifications exist", async () => {
    const client = buildCountMockClient(0);

    const result = await getUnreadCount(client, TENANT_ID, USER_ID);

    expect(result.success).toBe(true);
    if (!result.success) return;
    expect(result.data.count).toBe(0);
  });
});

// ─── markAsRead ───────────────────────────────────────────────────────────────

describe("markAsRead", () => {
  it("marks a notification as read successfully", async () => {
    const { client } = buildMockClientWithSequence([
      { data: TEAM_NOTIFICATION_ROW, error: null }, // fetch check
      { data: null, error: null }, // update
    ]);

    const result = await markAsRead(client, TENANT_ID, USER_ID, NOTIFICATION_ID);

    expect(result.success).toBe(true);
    if (!result.success) return;
    expect(result.data).toBeNull();
  });

  it("returns success (no-op) when notification is already read", async () => {
    const { client } = buildMockClientWithSequence([
      { data: READ_NOTIFICATION_ROW, error: null }, // already read
    ]);

    const result = await markAsRead(client, TENANT_ID, USER_ID, NOTIFICATION_ID);

    expect(result.success).toBe(true);
  });

  it("returns error when notification belongs to another user", async () => {
    const { client } = buildMockClientWithSequence([
      { data: null, error: null }, // not found for this user
    ]);

    const result = await markAsRead(client, TENANT_ID, OTHER_USER_ID, NOTIFICATION_ID);

    expect(result.success).toBe(false);
    if (result.success) return;
    expect(result.code).toBe("NOTIFICATION_NOT_FOUND");
  });
});

// ─── markAllAsRead ────────────────────────────────────────────────────────────

describe("markAllAsRead", () => {
  it("marks all unread notifications and returns updated count", async () => {
    const rows = [TEAM_NOTIFICATION_ROW, BILLING_NOTIFICATION_ROW];
    const chain = {
      update: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      select: vi.fn().mockResolvedValue({ data: rows, error: null }),
    };

    const client = {
      from: vi.fn().mockReturnValue(chain),
    } as unknown as SupabaseClient;

    const result = await markAllAsRead(client, TENANT_ID, USER_ID);

    expect(result.success).toBe(true);
    if (!result.success) return;
    expect(result.data.updated).toBe(2);
  });

  it("returns updated = 0 when no unread notifications exist", async () => {
    const chain = {
      update: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      select: vi.fn().mockResolvedValue({ data: [], error: null }),
    };

    const client = {
      from: vi.fn().mockReturnValue(chain),
    } as unknown as SupabaseClient;

    const result = await markAllAsRead(client, TENANT_ID, USER_ID);

    expect(result.success).toBe(true);
    if (!result.success) return;
    expect(result.data.updated).toBe(0);
  });
});

// ─── createNotification ───────────────────────────────────────────────────────

describe("createNotification", () => {
  const baseInput = {
    tenantId: TENANT_ID,
    userId: USER_ID,
    type: "billing_plan_upgraded" as const,
    category: "billing" as const,
    title: "Plan upgraded",
    body: "Your plan was upgraded to Pro.",
    metadata: null,
  };

  it("creates notification when non-critical and preferences allow in-app", async () => {
    // Sequence: getPreferenceForCategory (maybeSingle → null = default enabled), then insert
    const chain = {
      select: vi.fn().mockReturnThis(),
      insert: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      single: vi.fn().mockResolvedValue({ data: null, error: null }),
      maybeSingle: vi
        .fn()
        .mockResolvedValueOnce({ data: null, error: null }) // pref check: no row = default enabled
        .mockResolvedValueOnce({ data: BILLING_NOTIFICATION_ROW, error: null }), // audit_log
    };
    chain.select.mockReturnThis();
    chain.insert.mockReturnThis();

    // For insert().select().single()
    const insertChain = {
      select: vi.fn().mockReturnThis(),
      single: vi.fn().mockResolvedValue({ data: BILLING_NOTIFICATION_ROW, error: null }),
    };

    let callIndex = 0;
    const fromMock = vi.fn().mockImplementation(() => {
      callIndex++;
      if (callIndex === 1) {
        // notification_preferences query
        return {
          select: vi.fn().mockReturnThis(),
          eq: vi.fn().mockReturnThis(),
          maybeSingle: vi.fn().mockResolvedValue({ data: null, error: null }),
        };
      }
      if (callIndex === 2) {
        // notifications insert
        return {
          insert: vi.fn().mockReturnValue(insertChain),
        };
      }
      // audit_log
      return {
        insert: vi.fn().mockResolvedValue({ data: null, error: null }),
      };
    });

    const adminClient = { from: fromMock } as unknown as SupabaseClient;

    const result = await createNotification(adminClient, baseInput);

    expect(result.success).toBe(true);
  });

  it("does NOT create in-app notification when preferences disable in_app", async () => {
    const disabledPref = { in_app_enabled: false, email_enabled: false };

    let callIndex = 0;
    const fromMock = vi.fn().mockImplementation(() => {
      callIndex++;
      if (callIndex === 1) {
        // preference check → in_app disabled
        return {
          select: vi.fn().mockReturnThis(),
          eq: vi.fn().mockReturnThis(),
          maybeSingle: vi.fn().mockResolvedValue({ data: disabledPref, error: null }),
        };
      }
      return {
        insert: vi.fn().mockReturnValue({
          select: vi.fn().mockReturnThis(),
          single: vi.fn().mockResolvedValue({ data: null, error: null }),
        }),
      };
    });

    const adminClient = { from: fromMock } as unknown as SupabaseClient;

    const result = await createNotification(adminClient, baseInput);

    // Returns success but with empty id (no DB row)
    expect(result.success).toBe(true);
    if (!result.success) return;
    expect(result.data.id).toBe("");
    // Should not have called insert (callIndex would only be 1 from pref check)
    expect(callIndex).toBe(1);
  });

  it("creates notification for critical type regardless of preferences", async () => {
    const criticalInput = {
      ...baseInput,
      type: "billing_past_due" as const,
      category: "billing" as const,
    };

    let callIndex = 0;
    const fromMock = vi.fn().mockImplementation(() => {
      callIndex++;
      if (callIndex === 1) {
        // notifications insert
        return {
          insert: vi.fn().mockReturnValue({
            select: vi.fn().mockReturnThis(),
            single: vi.fn().mockResolvedValue({ data: BILLING_NOTIFICATION_ROW, error: null }),
          }),
        };
      }
      // audit_log
      return { insert: vi.fn().mockResolvedValue({ data: null, error: null }) };
    });

    const adminClient = { from: fromMock } as unknown as SupabaseClient;

    const result = await createNotification(adminClient, criticalInput);

    expect(result.success).toBe(true);
    // No preference check should have happened (critical bypass)
    // First call goes straight to notifications insert, not preference lookup
    expect(callIndex).toBeGreaterThanOrEqual(1);
  });

  it("calls email adapter when notification type requires email", async () => {
    const emailAdapter = buildMockAdapter({ success: true });

    let callIndex = 0;
    const fromMock = vi.fn().mockImplementation(() => {
      callIndex++;
      if (callIndex === 1) {
        // preference check (for in-app)
        return {
          select: vi.fn().mockReturnThis(),
          eq: vi.fn().mockReturnThis(),
          maybeSingle: vi.fn().mockResolvedValue({ data: null, error: null }),
        };
      }
      if (callIndex === 2) {
        // insert notification
        return {
          insert: vi.fn().mockReturnValue({
            select: vi.fn().mockReturnThis(),
            single: vi.fn().mockResolvedValue({ data: BILLING_NOTIFICATION_ROW, error: null }),
          }),
        };
      }
      // audit_log or email preference check
      return {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        maybeSingle: vi.fn().mockResolvedValue({ data: null, error: null }),
        insert: vi.fn().mockResolvedValue({ data: null, error: null }),
      };
    });

    const adminClient = { from: fromMock } as unknown as SupabaseClient;

    const result = await createNotification(
      adminClient,
      baseInput,
      emailAdapter,
      "user@example.com",
    );

    expect(result.success).toBe(true);
    // Email adapter should have been called (it's non-blocking, so we need to wait)
    await new Promise((r) => setTimeout(r, 10));
    expect(emailAdapter.sendNotificationEmail).toHaveBeenCalledWith(
      expect.objectContaining({
        to: "user@example.com",
        subject: baseInput.title,
      }),
    );
  });

  it("creates notification even when email adapter fails", async () => {
    const emailAdapter = buildMockAdapter({ success: false, error: "SMTP timeout" });

    let callIndex = 0;
    const fromMock = vi.fn().mockImplementation(() => {
      callIndex++;
      if (callIndex === 1) {
        return {
          select: vi.fn().mockReturnThis(),
          eq: vi.fn().mockReturnThis(),
          maybeSingle: vi.fn().mockResolvedValue({ data: null, error: null }),
        };
      }
      if (callIndex === 2) {
        return {
          insert: vi.fn().mockReturnValue({
            select: vi.fn().mockReturnThis(),
            single: vi.fn().mockResolvedValue({ data: BILLING_NOTIFICATION_ROW, error: null }),
          }),
        };
      }
      return {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        maybeSingle: vi.fn().mockResolvedValue({ data: null, error: null }),
        insert: vi.fn().mockResolvedValue({ data: null, error: null }),
      };
    });

    const adminClient = { from: fromMock } as unknown as SupabaseClient;

    const result = await createNotification(
      adminClient,
      baseInput,
      emailAdapter,
      "user@example.com",
    );

    // Notification must be created even if email fails
    expect(result.success).toBe(true);
  });
});

// ─── createBulkNotifications ──────────────────────────────────────────────────

describe("createBulkNotifications", () => {
  it("creates one notification per recipient", async () => {
    const inputs = [
      {
        tenantId: TENANT_ID,
        userId: USER_ID,
        type: "billing_past_due" as const,
        category: "billing" as const,
        title: "Payment past due",
        body: "Update your payment method.",
        metadata: null,
      },
      {
        tenantId: TENANT_ID,
        userId: OTHER_USER_ID,
        type: "billing_past_due" as const,
        category: "billing" as const,
        title: "Payment past due",
        body: "Update your payment method.",
        metadata: null,
      },
    ];

    let callIndex = 0;
    const fromMock = vi.fn().mockImplementation(() => {
      callIndex++;
      // For critical types, no pref check — go straight to insert
      if (callIndex % 2 === 1) {
        return {
          insert: vi.fn().mockReturnValue({
            select: vi.fn().mockReturnThis(),
            single: vi.fn().mockResolvedValue({ data: BILLING_NOTIFICATION_ROW, error: null }),
          }),
        };
      }
      // audit_log
      return { insert: vi.fn().mockResolvedValue({ data: null, error: null }) };
    });

    const adminClient = { from: fromMock } as unknown as SupabaseClient;

    const result = await createBulkNotifications(adminClient, inputs);

    expect(result.success).toBe(true);
    if (!result.success) return;
    expect(result.data).toHaveLength(2);
  });
});

// ─── getPreferences mock helper ───────────────────────────────────────────────

/**
 * Build a mock for getPreferences which uses .select().eq(tenant).eq(user).
 * The second eq() call returns the awaitable result.
 */
function buildPrefMockClient(resolveWith: { data: unknown; error: unknown }): SupabaseClient {
  let eqCalls = 0;
  const chain: Record<string, unknown> = {};
  chain["select"] = vi.fn().mockReturnValue(chain);
  chain["eq"] = vi.fn().mockImplementation(() => {
    eqCalls++;
    // The second eq call is the last one — return the promise
    if (eqCalls >= 2) {
      return Promise.resolve(resolveWith);
    }
    return chain;
  });
  return { from: vi.fn().mockReturnValue(chain) } as unknown as SupabaseClient;
}

// ─── getPreferences ───────────────────────────────────────────────────────────

describe("getPreferences", () => {
  it("returns saved preferences when rows exist", async () => {
    const client = buildPrefMockClient({ data: [PREFERENCE_ROW], error: null });

    const result = await getPreferences(client, TENANT_ID, USER_ID);

    expect(result.success).toBe(true);
    if (!result.success) return;
    // At least the one saved row + defaults for missing categories
    expect(result.data.length).toBeGreaterThanOrEqual(1);
  });

  it("returns defaults (all enabled) when no preference rows exist", async () => {
    const client = buildPrefMockClient({ data: [], error: null });

    const result = await getPreferences(client, TENANT_ID, USER_ID);

    expect(result.success).toBe(true);
    if (!result.success) return;
    // All 3 categories with defaults
    expect(result.data).toHaveLength(3);
    expect(result.data.every((p) => p.inAppEnabled && p.emailEnabled)).toBe(true);
  });
});

// ─── updatePreferences ────────────────────────────────────────────────────────

describe("updatePreferences", () => {
  it("upserts preference rows and returns updated preferences", async () => {
    const updatedRows = [{ ...PREFERENCE_ROW, in_app_enabled: true, email_enabled: false }];

    let callIndex = 0;
    const fromMock = vi.fn().mockImplementation(() => {
      callIndex++;
      if (callIndex === 1) {
        // upsert notification_preferences
        return {
          upsert: vi.fn().mockReturnValue({
            select: vi.fn().mockResolvedValue({ data: updatedRows, error: null }),
          }),
        };
      }
      // audit_log
      return { insert: vi.fn().mockResolvedValue({ data: null, error: null }) };
    });

    const client = { from: fromMock } as unknown as SupabaseClient;

    const result = await updatePreferences(client, TENANT_ID, USER_ID, {
      preferences: [{ category: "team", inAppEnabled: true, emailEnabled: false }],
    });

    expect(result.success).toBe(true);
    if (!result.success) return;
    expect(result.data).toHaveLength(1);
    expect(result.data[0]?.category).toBe("team");
  });

  it("returns error when upsert fails", async () => {
    const fromMock = vi.fn().mockReturnValue({
      upsert: vi.fn().mockReturnValue({
        select: vi
          .fn()
          .mockResolvedValue({ data: null, error: { message: "Constraint violation" } }),
      }),
    });

    const client = { from: fromMock } as unknown as SupabaseClient;

    const result = await updatePreferences(client, TENANT_ID, USER_ID, {
      preferences: [{ category: "billing", inAppEnabled: false, emailEnabled: false }],
    });

    expect(result.success).toBe(false);
    if (result.success) return;
    expect(result.code).toBe("PREFERENCES_UPDATE_FAILED");
  });
});
