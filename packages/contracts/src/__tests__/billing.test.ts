import { describe, expect, it } from "vitest";
import {
  BILLING_CYCLE,
  SUBSCRIPTION_STATUS,
  billingCycleSchema,
  billingEventSchema,
  billingHistoryQuerySchema,
  cancelSubscriptionSchema,
  changePlanSchema,
  planSchema,
  subscriptionSchema,
  subscriptionStatusSchema,
} from "../dto/billing";

// ============================================================================
// subscriptionStatusSchema
// ============================================================================

describe("subscriptionStatusSchema", () => {
  it("accepts 'trialing'", () => {
    const result = subscriptionStatusSchema.safeParse("trialing");
    expect(result.success).toBe(true);
  });

  it("accepts 'active'", () => {
    const result = subscriptionStatusSchema.safeParse("active");
    expect(result.success).toBe(true);
  });

  it("accepts 'past_due'", () => {
    const result = subscriptionStatusSchema.safeParse("past_due");
    expect(result.success).toBe(true);
  });

  it("accepts 'canceled'", () => {
    const result = subscriptionStatusSchema.safeParse("canceled");
    expect(result.success).toBe(true);
  });

  it("accepts 'unpaid'", () => {
    const result = subscriptionStatusSchema.safeParse("unpaid");
    expect(result.success).toBe(true);
  });

  it("rejects an invalid status value", () => {
    const result = subscriptionStatusSchema.safeParse("expired");
    expect(result.success).toBe(false);
  });

  it("rejects an empty string", () => {
    const result = subscriptionStatusSchema.safeParse("");
    expect(result.success).toBe(false);
  });

  it("exposes all values via SUBSCRIPTION_STATUS const", () => {
    expect(SUBSCRIPTION_STATUS.TRIALING).toBe("trialing");
    expect(SUBSCRIPTION_STATUS.ACTIVE).toBe("active");
    expect(SUBSCRIPTION_STATUS.PAST_DUE).toBe("past_due");
    expect(SUBSCRIPTION_STATUS.CANCELED).toBe("canceled");
    expect(SUBSCRIPTION_STATUS.UNPAID).toBe("unpaid");
  });
});

// ============================================================================
// billingCycleSchema
// ============================================================================

describe("billingCycleSchema", () => {
  it("accepts 'monthly'", () => {
    const result = billingCycleSchema.safeParse("monthly");
    expect(result.success).toBe(true);
  });

  it("accepts 'yearly'", () => {
    const result = billingCycleSchema.safeParse("yearly");
    expect(result.success).toBe(true);
  });

  it("rejects 'weekly'", () => {
    const result = billingCycleSchema.safeParse("weekly");
    expect(result.success).toBe(false);
  });

  it("rejects an empty string", () => {
    const result = billingCycleSchema.safeParse("");
    expect(result.success).toBe(false);
  });

  it("exposes all values via BILLING_CYCLE const", () => {
    expect(BILLING_CYCLE.MONTHLY).toBe("monthly");
    expect(BILLING_CYCLE.YEARLY).toBe("yearly");
  });
});

// ============================================================================
// planSchema
// ============================================================================

describe("planSchema", () => {
  const validPlan = {
    id: "a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11",
    name: "Pro",
    slug: "pro",
    description: "The Pro plan",
    priceMonthly: 2900,
    priceYearly: 29000,
    currency: "usd",
    features: '{"ai":true}',
    limits: '{"members":10}',
    isActive: true,
    displayOrder: 1,
    trialDays: 14,
  };

  it("accepts a valid plan object", () => {
    const result = planSchema.safeParse(validPlan);
    expect(result.success).toBe(true);
  });

  it("accepts null description", () => {
    const result = planSchema.safeParse({ ...validPlan, description: null });
    expect(result.success).toBe(true);
  });

  it("rejects missing required field 'name'", () => {
    const { name: _name, ...withoutName } = validPlan;
    const result = planSchema.safeParse(withoutName);
    expect(result.success).toBe(false);
  });

  it("rejects missing required field 'slug'", () => {
    const { slug: _slug, ...withoutSlug } = validPlan;
    const result = planSchema.safeParse(withoutSlug);
    expect(result.success).toBe(false);
  });

  it("rejects missing required field 'priceMonthly'", () => {
    const { priceMonthly: _pm, ...withoutPrice } = validPlan;
    const result = planSchema.safeParse(withoutPrice);
    expect(result.success).toBe(false);
  });

  it("rejects invalid UUID for id", () => {
    const result = planSchema.safeParse({ ...validPlan, id: "not-a-uuid" });
    expect(result.success).toBe(false);
  });
});

// ============================================================================
// subscriptionSchema
// ============================================================================

describe("subscriptionSchema", () => {
  const validSubscription = {
    id: "a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11",
    tenantId: "b1eebc99-9c0b-4ef8-bb6d-6bb9bd380a22",
    planId: "c2eebc99-9c0b-4ef8-bb6d-6bb9bd380a33",
    status: "active" as const,
    billingCycle: "monthly" as const,
    currentPeriodStart: "2024-01-01T00:00:00.000Z",
    currentPeriodEnd: "2024-02-01T00:00:00.000Z",
    cancelAtPeriodEnd: false,
    canceledAt: null,
    trialEndsAt: null,
    graceEndsAt: null,
    externalSubscriptionId: null,
    externalCustomerId: null,
  };

  it("accepts a valid subscription object", () => {
    const result = subscriptionSchema.safeParse(validSubscription);
    expect(result.success).toBe(true);
  });

  it("allows nullable canceledAt", () => {
    const result = subscriptionSchema.safeParse({ ...validSubscription, canceledAt: null });
    expect(result.success).toBe(true);
  });

  it("allows nullable trialEndsAt", () => {
    const result = subscriptionSchema.safeParse({ ...validSubscription, trialEndsAt: null });
    expect(result.success).toBe(true);
  });

  it("allows nullable graceEndsAt", () => {
    const result = subscriptionSchema.safeParse({ ...validSubscription, graceEndsAt: null });
    expect(result.success).toBe(true);
  });

  it("allows nullable externalSubscriptionId", () => {
    const result = subscriptionSchema.safeParse({
      ...validSubscription,
      externalSubscriptionId: null,
    });
    expect(result.success).toBe(true);
  });

  it("allows nullable externalCustomerId", () => {
    const result = subscriptionSchema.safeParse({
      ...validSubscription,
      externalCustomerId: null,
    });
    expect(result.success).toBe(true);
  });

  it("allows optional nested plan", () => {
    const result = subscriptionSchema.safeParse({
      ...validSubscription,
      plan: {
        id: "c2eebc99-9c0b-4ef8-bb6d-6bb9bd380a33",
        name: "Pro",
        slug: "pro",
        description: null,
        priceMonthly: 2900,
        priceYearly: 29000,
        currency: "usd",
        features: "{}",
        limits: "{}",
        isActive: true,
        displayOrder: 1,
        trialDays: 14,
      },
    });
    expect(result.success).toBe(true);
  });

  it("accepts subscription without nested plan", () => {
    const result = subscriptionSchema.safeParse(validSubscription);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.plan).toBeUndefined();
    }
  });

  it("rejects invalid status value", () => {
    const result = subscriptionSchema.safeParse({ ...validSubscription, status: "expired" });
    expect(result.success).toBe(false);
  });
});

// ============================================================================
// billingEventSchema
// ============================================================================

describe("billingEventSchema", () => {
  const validEvent = {
    id: "a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11",
    tenantId: "b1eebc99-9c0b-4ef8-bb6d-6bb9bd380a22",
    subscriptionId: null,
    eventType: "payment.succeeded",
    provider: "stripe",
    externalEventId: "evt_001",
    processedAt: null,
    createdAt: "2024-01-01T00:00:00.000Z",
  };

  it("accepts a valid billing event", () => {
    const result = billingEventSchema.safeParse(validEvent);
    expect(result.success).toBe(true);
  });

  it("allows nullable subscriptionId", () => {
    const result = billingEventSchema.safeParse({ ...validEvent, subscriptionId: null });
    expect(result.success).toBe(true);
  });

  it("allows nullable externalEventId", () => {
    const result = billingEventSchema.safeParse({ ...validEvent, externalEventId: null });
    expect(result.success).toBe(true);
  });

  it("allows nullable processedAt", () => {
    const result = billingEventSchema.safeParse({ ...validEvent, processedAt: null });
    expect(result.success).toBe(true);
  });

  it("rejects missing required field 'eventType'", () => {
    const { eventType: _et, ...withoutEventType } = validEvent;
    const result = billingEventSchema.safeParse(withoutEventType);
    expect(result.success).toBe(false);
  });

  it("rejects invalid UUID for tenantId", () => {
    const result = billingEventSchema.safeParse({ ...validEvent, tenantId: "not-a-uuid" });
    expect(result.success).toBe(false);
  });
});

// ============================================================================
// changePlanSchema
// ============================================================================

describe("changePlanSchema", () => {
  it("accepts a valid UUID planId", () => {
    const result = changePlanSchema.safeParse({
      planId: "a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11",
    });
    expect(result.success).toBe(true);
  });

  it("rejects a non-UUID planId", () => {
    const result = changePlanSchema.safeParse({ planId: "pro-plan" });
    expect(result.success).toBe(false);
  });

  it("rejects an empty string planId", () => {
    const result = changePlanSchema.safeParse({ planId: "" });
    expect(result.success).toBe(false);
  });

  it("rejects a missing planId", () => {
    const result = changePlanSchema.safeParse({});
    expect(result.success).toBe(false);
  });
});

// ============================================================================
// cancelSubscriptionSchema
// ============================================================================

describe("cancelSubscriptionSchema", () => {
  it("defaults cancelAtPeriodEnd to true when not provided", () => {
    const result = cancelSubscriptionSchema.safeParse({});
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.cancelAtPeriodEnd).toBe(true);
    }
  });

  it("accepts explicit true", () => {
    const result = cancelSubscriptionSchema.safeParse({ cancelAtPeriodEnd: true });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.cancelAtPeriodEnd).toBe(true);
    }
  });

  it("accepts explicit false", () => {
    const result = cancelSubscriptionSchema.safeParse({ cancelAtPeriodEnd: false });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.cancelAtPeriodEnd).toBe(false);
    }
  });

  it("rejects a string value for cancelAtPeriodEnd", () => {
    const result = cancelSubscriptionSchema.safeParse({ cancelAtPeriodEnd: "true" });
    expect(result.success).toBe(false);
  });
});

// ============================================================================
// billingHistoryQuerySchema
// ============================================================================

describe("billingHistoryQuerySchema", () => {
  it("applies default limit of 50 when not provided", () => {
    const result = billingHistoryQuerySchema.safeParse({});
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.limit).toBe(50);
    }
  });

  it("applies default offset of 0 when not provided", () => {
    const result = billingHistoryQuerySchema.safeParse({});
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.offset).toBe(0);
    }
  });

  it("accepts limit = 1 (minimum boundary)", () => {
    const result = billingHistoryQuerySchema.safeParse({ limit: 1 });
    expect(result.success).toBe(true);
  });

  it("accepts limit = 100 (maximum boundary)", () => {
    const result = billingHistoryQuerySchema.safeParse({ limit: 100 });
    expect(result.success).toBe(true);
  });

  it("rejects limit > 100", () => {
    const result = billingHistoryQuerySchema.safeParse({ limit: 101 });
    expect(result.success).toBe(false);
  });

  it("rejects limit < 1", () => {
    const result = billingHistoryQuerySchema.safeParse({ limit: 0 });
    expect(result.success).toBe(false);
  });

  it("accepts a valid offset", () => {
    const result = billingHistoryQuerySchema.safeParse({ limit: 50, offset: 100 });
    expect(result.success).toBe(true);
  });

  it("rejects negative offset", () => {
    const result = billingHistoryQuerySchema.safeParse({ offset: -1 });
    expect(result.success).toBe(false);
  });

  it("accepts limit and offset together", () => {
    const result = billingHistoryQuerySchema.safeParse({ limit: 25, offset: 50 });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.limit).toBe(25);
      expect(result.data.offset).toBe(50);
    }
  });
});
