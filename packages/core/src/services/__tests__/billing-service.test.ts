import type { SupabaseClient } from "@supabase/supabase-js";
import { describe, expect, it, vi } from "vitest";
import type { PaymentProviderPort } from "../ports/payment-provider-port";
import {
  cancelSubscription,
  changePlan,
  getSubscription,
  listPlans,
  processWebhookEvent,
  resumeSubscription,
} from "../billing-service";

// ─── Mock Helpers ──────────────────────────────────────────────────────────────

const TENANT_ID = "aaaaaaaa-0000-4000-8000-000000000001";
const USER_ID = "bbbbbbbb-0000-4000-8000-000000000001";
const PLAN_FREE_ID = "cccccccc-0000-4000-8000-000000000001";
const PLAN_PRO_ID = "cccccccc-0000-4000-8000-000000000002";
const SUBSCRIPTION_ID = "dddddddd-0000-4000-8000-000000000001";
const EXTERNAL_SUB_ID = "local_sub_001";

const FREE_PLAN = {
  id: PLAN_FREE_ID,
  name: "Free",
  slug: "free",
  description: null,
  price_monthly: 0,
  price_yearly: 0,
  currency: "usd",
  features: "{}",
  limits: "{}",
  is_active: true,
  display_order: 1,
  trial_days: 0,
  created_at: new Date().toISOString(),
  updated_at: new Date().toISOString(),
};

const PRO_PLAN = {
  id: PLAN_PRO_ID,
  name: "Pro",
  slug: "pro",
  description: "Pro plan",
  price_monthly: 2900,
  price_yearly: 29000,
  currency: "usd",
  features: "{}",
  limits: "{}",
  is_active: true,
  display_order: 2,
  trial_days: 14,
  created_at: new Date().toISOString(),
  updated_at: new Date().toISOString(),
};

const INACTIVE_PLAN = {
  ...FREE_PLAN,
  id: "cccccccc-0000-4000-8000-000000000003",
  name: "Legacy",
  slug: "legacy",
  is_active: false,
  display_order: 99,
};

const ACTIVE_SUBSCRIPTION = {
  id: SUBSCRIPTION_ID,
  tenant_id: TENANT_ID,
  plan_id: PLAN_FREE_ID,
  status: "active",
  billing_cycle: "monthly",
  current_period_start: new Date().toISOString(),
  current_period_end: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
  cancel_at_period_end: false,
  canceled_at: null,
  trial_ends_at: null,
  grace_ends_at: null,
  external_subscription_id: EXTERNAL_SUB_ID,
  external_customer_id: "local_cust_001",
  created_at: new Date().toISOString(),
  updated_at: new Date().toISOString(),
  plans: FREE_PLAN,
};

function createMockAdapter(): PaymentProviderPort & {
  changePlan: ReturnType<typeof vi.fn>;
  cancelSubscription: ReturnType<typeof vi.fn>;
  resumeSubscription: ReturnType<typeof vi.fn>;
  createCustomer: ReturnType<typeof vi.fn>;
  createSubscription: ReturnType<typeof vi.fn>;
} {
  return {
    createCustomer: vi.fn().mockResolvedValue({ customerId: "local_cust" }),
    createSubscription: vi.fn().mockResolvedValue({
      subscriptionId: EXTERNAL_SUB_ID,
      status: "active",
      currentPeriodStart: new Date().toISOString(),
      currentPeriodEnd: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
    }),
    changePlan: vi.fn().mockResolvedValue({ success: true }),
    cancelSubscription: vi.fn().mockResolvedValue({ success: true }),
    resumeSubscription: vi.fn().mockResolvedValue({ success: true }),
    getPortalUrl: vi.fn().mockResolvedValue({ url: "http://localhost:3000/billing?portal=local" }),
    verifyWebhookSignature: vi.fn().mockResolvedValue(true),
  };
}

// ─── Tests ─────────────────────────────────────────────────────────────────────

describe("listPlans", () => {
  it("returns only active plans sorted by display_order", async () => {
    // Plans returned from DB pre-filtered (is_active = true), ordered by display_order
    const mockClient = {
      from: vi.fn(() => ({
        select: vi.fn(() => ({
          eq: vi.fn(() => ({
            order: vi.fn().mockResolvedValue({ data: [FREE_PLAN, PRO_PLAN], error: null }),
          })),
        })),
      })),
    } as unknown as SupabaseClient;

    const result = await listPlans(mockClient);

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data).toHaveLength(2);
      const first = result.data[0];
      const second = result.data[1];
      expect(first?.slug).toBe("free");
      expect(second?.slug).toBe("pro");
    }
  });

  it("excludes inactive plans — returns empty array when none active", async () => {
    const mockClient = {
      from: vi.fn(() => ({
        select: vi.fn(() => ({
          eq: vi.fn(() => ({
            order: vi.fn().mockResolvedValue({ data: [], error: null }),
          })),
        })),
      })),
    } as unknown as SupabaseClient;

    const result = await listPlans(mockClient);

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data).toHaveLength(0);
    }
  });
});

describe("getSubscription", () => {
  it("returns subscription with joined plan on success", async () => {
    const mockClient = {
      from: vi.fn(() => ({
        select: vi.fn(() => ({
          eq: vi.fn(() => ({
            maybeSingle: vi.fn().mockResolvedValue({ data: ACTIVE_SUBSCRIPTION, error: null }),
          })),
        })),
      })),
    } as unknown as SupabaseClient;

    const result = await getSubscription(mockClient, TENANT_ID);

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data).not.toBeNull();
      if (result.data !== null) {
        expect(result.data.tenantId).toBe(TENANT_ID);
        expect(result.data.status).toBe("active");
        expect(result.data.plan).toBeDefined();
        expect(result.data.plan.slug).toBe("free");
      }
    }
  });

  it("returns null when no subscription row exists", async () => {
    const mockClient = {
      from: vi.fn(() => ({
        select: vi.fn(() => ({
          eq: vi.fn(() => ({
            maybeSingle: vi.fn().mockResolvedValue({ data: null, error: null }),
          })),
        })),
      })),
    } as unknown as SupabaseClient;

    const result = await getSubscription(mockClient, TENANT_ID);

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data).toBeNull();
    }
  });
});

describe("changePlan", () => {
  it("success — calls adapter, updates subscription row, writes audit log", async () => {
    const adapter = createMockAdapter();
    const auditInsertMock = vi.fn().mockResolvedValue({ data: null, error: null });

    // Updated subscription row returned after UPDATE
    const updatedSubscription = { ...ACTIVE_SUBSCRIPTION, plan_id: PLAN_PRO_ID };

    const mockClient = {
      from: vi.fn((table: string) => {
        if (table === "tenant_subscriptions") {
          return {
            select: vi.fn(() => ({
              eq: vi.fn(() => ({
                maybeSingle: vi
                  .fn()
                  .mockResolvedValue({ data: ACTIVE_SUBSCRIPTION, error: null }),
              })),
            })),
          };
        }
        if (table === "plans") {
          return {
            select: vi.fn(() => ({
              eq: vi.fn(() => ({
                maybeSingle: vi.fn().mockResolvedValue({ data: PRO_PLAN, error: null }),
              })),
            })),
          };
        }
        return { insert: vi.fn().mockResolvedValue({ data: null, error: null }) };
      }),
    } as unknown as SupabaseClient;

    const mockAdminClient = {
      from: vi.fn((table: string) => {
        if (table === "tenant_subscriptions") {
          return {
            update: vi.fn(() => ({
              eq: vi.fn(() => ({
                select: vi.fn(() => ({
                  single: vi.fn().mockResolvedValue({ data: updatedSubscription, error: null }),
                })),
              })),
            })),
          };
        }
        return { insert: auditInsertMock };
      }),
    } as unknown as SupabaseClient;

    const result = await changePlan(
      mockClient,
      mockAdminClient,
      TENANT_ID,
      USER_ID,
      { planId: PLAN_PRO_ID },
      adapter,
    );

    expect(result.success).toBe(true);
    expect(adapter.changePlan).toHaveBeenCalledOnce();
    expect(auditInsertMock).toHaveBeenCalled();
  });

  it("rejects inactive plan with PLAN_NOT_AVAILABLE", async () => {
    const adapter = createMockAdapter();

    const mockClient = {
      from: vi.fn((table: string) => {
        if (table === "tenant_subscriptions") {
          return {
            select: vi.fn(() => ({
              eq: vi.fn(() => ({
                maybeSingle: vi
                  .fn()
                  .mockResolvedValue({ data: ACTIVE_SUBSCRIPTION, error: null }),
              })),
            })),
          };
        }
        if (table === "plans") {
          return {
            select: vi.fn(() => ({
              eq: vi.fn(() => ({
                maybeSingle: vi.fn().mockResolvedValue({ data: INACTIVE_PLAN, error: null }),
              })),
            })),
          };
        }
        return { insert: vi.fn().mockResolvedValue({ data: null, error: null }) };
      }),
    } as unknown as SupabaseClient;

    const result = await changePlan(
      mockClient,
      {} as SupabaseClient,
      TENANT_ID,
      USER_ID,
      { planId: INACTIVE_PLAN.id },
      adapter,
    );

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.code).toBe("PLAN_NOT_AVAILABLE");
    }
    expect(adapter.changePlan).not.toHaveBeenCalled();
  });

  it("rejects same plan with PLAN_ALREADY_ACTIVE", async () => {
    const adapter = createMockAdapter();

    const mockClient = {
      from: vi.fn((table: string) => {
        if (table === "tenant_subscriptions") {
          return {
            select: vi.fn(() => ({
              eq: vi.fn(() => ({
                maybeSingle: vi
                  .fn()
                  .mockResolvedValue({ data: ACTIVE_SUBSCRIPTION, error: null }),
              })),
            })),
          };
        }
        if (table === "plans") {
          return {
            select: vi.fn(() => ({
              eq: vi.fn(() => ({
                // Same plan as current subscription (FREE)
                maybeSingle: vi.fn().mockResolvedValue({ data: FREE_PLAN, error: null }),
              })),
            })),
          };
        }
        return { insert: vi.fn().mockResolvedValue({ data: null, error: null }) };
      }),
    } as unknown as SupabaseClient;

    const result = await changePlan(
      mockClient,
      {} as SupabaseClient,
      TENANT_ID,
      USER_ID,
      { planId: PLAN_FREE_ID },
      adapter,
    );

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.code).toBe("PLAN_ALREADY_ACTIVE");
    }
    expect(adapter.changePlan).not.toHaveBeenCalled();
  });
});

describe("cancelSubscription", () => {
  it("at period end — sets cancel_at_period_end = true, status stays active", async () => {
    const adapter = createMockAdapter();
    const auditInsertMock = vi.fn().mockResolvedValue({ data: null, error: null });

    const canceledSub = {
      ...ACTIVE_SUBSCRIPTION,
      cancel_at_period_end: true,
    };

    const mockClient = {
      from: vi.fn((table: string) => {
        if (table === "tenant_subscriptions") {
          return {
            select: vi.fn(() => ({
              eq: vi.fn(() => ({
                maybeSingle: vi
                  .fn()
                  .mockResolvedValue({ data: ACTIVE_SUBSCRIPTION, error: null }),
              })),
            })),
          };
        }
        return { insert: vi.fn().mockResolvedValue({ data: null, error: null }) };
      }),
    } as unknown as SupabaseClient;

    const mockAdminClient = {
      from: vi.fn((table: string) => {
        if (table === "tenant_subscriptions") {
          return {
            update: vi.fn(() => ({
              eq: vi.fn(() => ({
                select: vi.fn(() => ({
                  single: vi.fn().mockResolvedValue({ data: canceledSub, error: null }),
                })),
              })),
            })),
          };
        }
        return { insert: auditInsertMock };
      }),
    } as unknown as SupabaseClient;

    const result = await cancelSubscription(
      mockClient,
      mockAdminClient,
      TENANT_ID,
      USER_ID,
      { cancelAtPeriodEnd: true },
      adapter,
    );

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.cancelAtPeriodEnd).toBe(true);
      expect(result.data.status).toBe("active");
    }
    expect(adapter.cancelSubscription).toHaveBeenCalledOnce();
  });

  it("immediate — sets status = canceled", async () => {
    const adapter = createMockAdapter();
    const auditInsertMock = vi.fn().mockResolvedValue({ data: null, error: null });

    const immediateCanceledSub = {
      ...ACTIVE_SUBSCRIPTION,
      status: "canceled",
      canceled_at: new Date().toISOString(),
    };

    const mockClient = {
      from: vi.fn((table: string) => {
        if (table === "tenant_subscriptions") {
          return {
            select: vi.fn(() => ({
              eq: vi.fn(() => ({
                maybeSingle: vi
                  .fn()
                  .mockResolvedValue({ data: ACTIVE_SUBSCRIPTION, error: null }),
              })),
            })),
          };
        }
        return { insert: vi.fn().mockResolvedValue({ data: null, error: null }) };
      }),
    } as unknown as SupabaseClient;

    const mockAdminClient = {
      from: vi.fn((table: string) => {
        if (table === "tenant_subscriptions") {
          return {
            update: vi.fn(() => ({
              eq: vi.fn(() => ({
                select: vi.fn(() => ({
                  single: vi
                    .fn()
                    .mockResolvedValue({ data: immediateCanceledSub, error: null }),
                })),
              })),
            })),
          };
        }
        return { insert: auditInsertMock };
      }),
    } as unknown as SupabaseClient;

    const result = await cancelSubscription(
      mockClient,
      mockAdminClient,
      TENANT_ID,
      USER_ID,
      { cancelAtPeriodEnd: false },
      adapter,
    );

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.status).toBe("canceled");
    }
  });
});

describe("resumeSubscription", () => {
  it("success — clears cancel_at_period_end", async () => {
    const adapter = createMockAdapter();
    const auditInsertMock = vi.fn().mockResolvedValue({ data: null, error: null });

    const cancelPendingSub = { ...ACTIVE_SUBSCRIPTION, cancel_at_period_end: true };
    const resumedSub = { ...ACTIVE_SUBSCRIPTION, cancel_at_period_end: false };

    const mockClient = {
      from: vi.fn((table: string) => {
        if (table === "tenant_subscriptions") {
          return {
            select: vi.fn(() => ({
              eq: vi.fn(() => ({
                maybeSingle: vi.fn().mockResolvedValue({ data: cancelPendingSub, error: null }),
              })),
            })),
          };
        }
        return { insert: vi.fn().mockResolvedValue({ data: null, error: null }) };
      }),
    } as unknown as SupabaseClient;

    const mockAdminClient = {
      from: vi.fn((table: string) => {
        if (table === "tenant_subscriptions") {
          return {
            update: vi.fn(() => ({
              eq: vi.fn(() => ({
                select: vi.fn(() => ({
                  single: vi.fn().mockResolvedValue({ data: resumedSub, error: null }),
                })),
              })),
            })),
          };
        }
        return { insert: auditInsertMock };
      }),
    } as unknown as SupabaseClient;

    const result = await resumeSubscription(mockClient, mockAdminClient, TENANT_ID, USER_ID, adapter);

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.cancelAtPeriodEnd).toBe(false);
    }
    expect(adapter.resumeSubscription).toHaveBeenCalledOnce();
    expect(auditInsertMock).toHaveBeenCalled();
  });

  it("no-op when cancel_at_period_end = false — returns SUBSCRIPTION_NOT_PENDING_CANCEL", async () => {
    const adapter = createMockAdapter();

    // Subscription is already active with no pending cancel
    const mockClient = {
      from: vi.fn((table: string) => {
        if (table === "tenant_subscriptions") {
          return {
            select: vi.fn(() => ({
              eq: vi.fn(() => ({
                // cancel_at_period_end = false → no-op
                maybeSingle: vi
                  .fn()
                  .mockResolvedValue({ data: ACTIVE_SUBSCRIPTION, error: null }),
              })),
            })),
          };
        }
        return { insert: vi.fn().mockResolvedValue({ data: null, error: null }) };
      }),
    } as unknown as SupabaseClient;

    const result = await resumeSubscription(
      mockClient,
      {} as SupabaseClient,
      TENANT_ID,
      USER_ID,
      adapter,
    );

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.code).toBe("SUBSCRIPTION_NOT_PENDING_CANCEL");
    }
    expect(adapter.resumeSubscription).not.toHaveBeenCalled();
  });
});

describe("processWebhookEvent", () => {
  it("duplicate event — no-op returns WEBHOOK_ALREADY_PROCESSED", async () => {
    // Existing billing event with the same external_event_id
    const existingEvent = {
      id: "eeeeeeee-0000-4000-8000-000000000001",
      external_event_id: "evt_001",
    };

    const mockAdminClient = {
      from: vi.fn((table: string) => {
        if (table === "billing_events") {
          return {
            select: vi.fn(() => ({
              eq: vi.fn(() => ({
                maybeSingle: vi.fn().mockResolvedValue({ data: existingEvent, error: null }),
              })),
            })),
          };
        }
        return { insert: vi.fn().mockResolvedValue({ data: null, error: null }) };
      }),
    } as unknown as SupabaseClient;

    const result = await processWebhookEvent(mockAdminClient, {
      eventType: "payment.succeeded",
      externalEventId: "evt_001",
      externalSubscriptionId: EXTERNAL_SUB_ID,
      provider: "stripe",
      tenantId: TENANT_ID,
      payload: {},
    });

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.code).toBe("WEBHOOK_ALREADY_PROCESSED");
    }
  });
});
