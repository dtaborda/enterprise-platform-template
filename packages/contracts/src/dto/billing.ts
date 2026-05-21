import { z } from "zod";

// ============================================================================
// Subscription Status
// ============================================================================

export const SUBSCRIPTION_STATUS = {
  TRIALING: "trialing",
  ACTIVE: "active",
  PAST_DUE: "past_due",
  CANCELED: "canceled",
  UNPAID: "unpaid",
} as const;

export type SubscriptionStatus = (typeof SUBSCRIPTION_STATUS)[keyof typeof SUBSCRIPTION_STATUS];

export const subscriptionStatusSchema = z.enum([
  "trialing",
  "active",
  "past_due",
  "canceled",
  "unpaid",
]);

// ============================================================================
// Billing Cycle
// ============================================================================

export const BILLING_CYCLE = {
  MONTHLY: "monthly",
  YEARLY: "yearly",
} as const;

export type BillingCycle = (typeof BILLING_CYCLE)[keyof typeof BILLING_CYCLE];

export const billingCycleSchema = z.enum(["monthly", "yearly"]);

// ============================================================================
// Plan (output)
// ============================================================================

export const planSchema = z.object({
  id: z.string().uuid(),
  name: z.string(),
  slug: z.string(),
  description: z.string().nullable(),
  priceMonthly: z.number().int(),
  priceYearly: z.number().int(),
  currency: z.string(),
  features: z.string(),
  limits: z.string(),
  isActive: z.boolean(),
  displayOrder: z.number().int(),
  trialDays: z.number().int(),
});

export type PlanDto = z.infer<typeof planSchema>;

// ============================================================================
// Subscription (output)
// ============================================================================

export const subscriptionSchema = z.object({
  id: z.string().uuid(),
  tenantId: z.string().uuid(),
  planId: z.string().uuid(),
  status: subscriptionStatusSchema,
  billingCycle: billingCycleSchema,
  currentPeriodStart: z.string().datetime(),
  currentPeriodEnd: z.string().datetime(),
  cancelAtPeriodEnd: z.boolean(),
  canceledAt: z.string().datetime().nullable(),
  trialEndsAt: z.string().datetime().nullable(),
  graceEndsAt: z.string().datetime().nullable(),
  externalSubscriptionId: z.string().nullable(),
  externalCustomerId: z.string().nullable(),
  plan: planSchema.optional(),
});

export type SubscriptionDto = z.infer<typeof subscriptionSchema>;

// ============================================================================
// Billing Event (output)
// ============================================================================

export const billingEventSchema = z.object({
  id: z.string().uuid(),
  tenantId: z.string().uuid(),
  subscriptionId: z.string().uuid().nullable(),
  eventType: z.string(),
  provider: z.string(),
  externalEventId: z.string().nullable(),
  processedAt: z.string().datetime().nullable(),
  createdAt: z.string().datetime(),
});

export type BillingEventDto = z.infer<typeof billingEventSchema>;

// ============================================================================
// Change Plan (input)
// ============================================================================

export const changePlanSchema = z.object({
  planId: z.string().uuid(),
});

export type ChangePlanDto = z.infer<typeof changePlanSchema>;

// ============================================================================
// Cancel Subscription (input)
// ============================================================================

export const cancelSubscriptionSchema = z.object({
  cancelAtPeriodEnd: z.boolean().default(true),
});

export type CancelSubscriptionDto = z.infer<typeof cancelSubscriptionSchema>;

// ============================================================================
// Billing History Query (input)
// ============================================================================

export const billingHistoryQuerySchema = z.object({
  limit: z.number().int().min(1).max(100).default(50),
  offset: z.number().int().min(0).default(0),
});

export type BillingHistoryQueryDto = z.infer<typeof billingHistoryQuerySchema>;
