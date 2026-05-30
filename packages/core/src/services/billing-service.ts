// Billing Service
// Handles plan catalog, tenant subscriptions, plan changes, cancellation, webhook events
// All functions receive SupabaseClient via DI and return ServiceResult<T>
// ALL writes use adminClient (service_role) — never the authenticated client for mutations

import type {
  BillingHistoryQueryDto,
  CancelSubscriptionDto,
  ChangePlanDto,
} from "@enterprise/contracts";
import type { SupabaseClient } from "@supabase/supabase-js";
import { createNotificationEmailAdapter } from "./adapters/notification-email-adapter-factory";
import type { ServiceResult } from "./auth-service";
import { createBulkNotifications, createNotification } from "./notification-service";
import type { PaymentProviderPort } from "./ports/payment-provider-port";

// ─── Service-Layer Types ──────────────────────────────────────────────────────
// These use ISO string timestamps (matching what Supabase JS client returns)
// instead of Drizzle's Date-based $inferSelect types.

export interface PlanRecord {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  priceMonthly: number;
  priceYearly: number;
  currency: string;
  features: string;
  limits: string;
  isActive: boolean;
  displayOrder: number;
  trialDays: number;
  createdAt: string;
  updatedAt: string;
}

export interface SubscriptionRecord {
  id: string;
  tenantId: string;
  planId: string;
  status: "trialing" | "active" | "past_due" | "canceled" | "unpaid";
  billingCycle: "monthly" | "yearly";
  currentPeriodStart: string;
  currentPeriodEnd: string;
  cancelAtPeriodEnd: boolean;
  canceledAt: string | null;
  trialEndsAt: string | null;
  graceEndsAt: string | null;
  externalSubscriptionId: string | null;
  externalCustomerId: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface BillingEventRecord {
  id: string;
  tenantId: string;
  subscriptionId: string | null;
  eventType: string;
  provider: string;
  externalEventId: string | null;
  payload: string | null;
  processedAt: string | null;
  createdAt: string;
}

export interface SubscriptionWithPlan {
  id: string;
  tenantId: string;
  planId: string;
  status: "trialing" | "active" | "past_due" | "canceled" | "unpaid";
  billingCycle: "monthly" | "yearly";
  currentPeriodStart: string;
  currentPeriodEnd: string;
  cancelAtPeriodEnd: boolean;
  canceledAt: string | null;
  trialEndsAt: string | null;
  graceEndsAt: string | null;
  externalSubscriptionId: string | null;
  externalCustomerId: string | null;
  plan: {
    id: string;
    name: string;
    slug: string;
    description: string | null;
    priceMonthly: number;
    priceYearly: number;
    currency: string;
    features: string;
    limits: string;
    trialDays: number;
  };
}

export interface WebhookEvent {
  eventType: string;
  externalEventId: string;
  externalSubscriptionId: string;
  provider: string;
  tenantId?: string;
  payload: Record<string, unknown>;
  subscriptionData?: {
    status?: string;
    currentPeriodStart?: string;
    currentPeriodEnd?: string;
    cancelAtPeriodEnd?: boolean;
    graceEndsAt?: string | null;
    planSlug?: string;
  };
}

// ─── Row Mappers ─────────────────────────────────────────────────────────────

type PlanRow = Record<string, unknown>;
type SubscriptionRow = Record<string, unknown>;

function mapPlanRow(row: PlanRow): PlanRecord {
  return {
    id: row["id"] as string,
    name: row["name"] as string,
    slug: row["slug"] as string,
    description: (row["description"] as string | null) ?? null,
    priceMonthly: row["price_monthly"] as number,
    priceYearly: row["price_yearly"] as number,
    currency: row["currency"] as string,
    features: row["features"] as string,
    limits: row["limits"] as string,
    isActive: row["is_active"] as boolean,
    displayOrder: row["display_order"] as number,
    trialDays: row["trial_days"] as number,
    createdAt: row["created_at"] as string,
    updatedAt: row["updated_at"] as string,
  };
}

function mapSubscriptionRow(row: SubscriptionRow): SubscriptionRecord {
  return {
    id: row["id"] as string,
    tenantId: row["tenant_id"] as string,
    planId: row["plan_id"] as string,
    status: row["status"] as SubscriptionRecord["status"],
    billingCycle: row["billing_cycle"] as SubscriptionRecord["billingCycle"],
    currentPeriodStart: row["current_period_start"] as string,
    currentPeriodEnd: row["current_period_end"] as string,
    cancelAtPeriodEnd: row["cancel_at_period_end"] as boolean,
    canceledAt: (row["canceled_at"] as string | null) ?? null,
    trialEndsAt: (row["trial_ends_at"] as string | null) ?? null,
    graceEndsAt: (row["grace_ends_at"] as string | null) ?? null,
    externalSubscriptionId: (row["external_subscription_id"] as string | null) ?? null,
    externalCustomerId: (row["external_customer_id"] as string | null) ?? null,
    createdAt: row["created_at"] as string,
    updatedAt: row["updated_at"] as string,
  };
}

function mapSubscriptionWithPlan(row: SubscriptionRow): SubscriptionWithPlan {
  const planRow = row["plans"] as PlanRow | undefined;
  if (!planRow) {
    throw new Error("Subscription row missing joined plan data");
  }

  return {
    id: row["id"] as string,
    tenantId: row["tenant_id"] as string,
    planId: row["plan_id"] as string,
    status: row["status"] as SubscriptionWithPlan["status"],
    billingCycle: row["billing_cycle"] as SubscriptionWithPlan["billingCycle"],
    currentPeriodStart: row["current_period_start"] as string,
    currentPeriodEnd: row["current_period_end"] as string,
    cancelAtPeriodEnd: row["cancel_at_period_end"] as boolean,
    canceledAt: (row["canceled_at"] as string | null) ?? null,
    trialEndsAt: (row["trial_ends_at"] as string | null) ?? null,
    graceEndsAt: (row["grace_ends_at"] as string | null) ?? null,
    externalSubscriptionId: (row["external_subscription_id"] as string | null) ?? null,
    externalCustomerId: (row["external_customer_id"] as string | null) ?? null,
    plan: {
      id: planRow["id"] as string,
      name: planRow["name"] as string,
      slug: planRow["slug"] as string,
      description: (planRow["description"] as string | null) ?? null,
      priceMonthly: planRow["price_monthly"] as number,
      priceYearly: planRow["price_yearly"] as number,
      currency: planRow["currency"] as string,
      features: planRow["features"] as string,
      limits: planRow["limits"] as string,
      trialDays: planRow["trial_days"] as number,
    },
  };
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
  const action = event.includes("canceled") || event.includes("expired") ? "delete" : "update";

  const { error } = await client.from("audit_log").insert({
    tenant_id: tenantId,
    user_id: userId,
    action,
    resource: "billing",
    resource_id: resourceId ?? null,
    metadata: JSON.stringify({ event, ...(metadata ?? {}) }),
    ip_address: null,
    user_agent: null,
  });

  if (error) {
    console.error(`[audit_log] Failed to write [${event} -> ${action}]:`, error);
  }
}

// ─── Service Functions ────────────────────────────────────────────────────────

/**
 * List all active plans sorted by display_order ASC.
 * Uses authenticated client (RLS: plans_select allows any authenticated user).
 */
export async function listPlans(client: SupabaseClient): Promise<ServiceResult<PlanRecord[]>> {
  const { data, error } = await client
    .from("plans")
    .select(
      "id, name, slug, description, price_monthly, price_yearly, currency, features, limits, is_active, display_order, trial_days, created_at, updated_at",
    )
    .eq("is_active", true)
    .order("display_order", { ascending: true });

  if (error) {
    return { success: false, error: error.message, code: "PLANS_LIST_FAILED" };
  }

  return { success: true, data: ((data ?? []) as PlanRow[]).map(mapPlanRow) as PlanRecord[] };
}

/**
 * Get current subscription for a tenant with joined plan details.
 * Returns null when no subscription row exists (valid for new tenants before init).
 */
export async function getSubscription(
  client: SupabaseClient,
  tenantId: string,
): Promise<ServiceResult<SubscriptionWithPlan | null>> {
  const { data, error } = await client
    .from("tenant_subscriptions")
    .select(
      "id, tenant_id, plan_id, status, billing_cycle, current_period_start, current_period_end, cancel_at_period_end, canceled_at, trial_ends_at, grace_ends_at, external_subscription_id, external_customer_id, created_at, updated_at, plans(id, name, slug, description, price_monthly, price_yearly, currency, features, limits, trial_days)",
    )
    .eq("tenant_id", tenantId)
    .maybeSingle();

  if (error) {
    return { success: false, error: error.message, code: "SUBSCRIPTION_FETCH_FAILED" };
  }

  if (!data) {
    return { success: true, data: null };
  }

  try {
    return { success: true, data: mapSubscriptionWithPlan(data as SubscriptionRow) };
  } catch (mapError) {
    return {
      success: false,
      error: mapError instanceof Error ? mapError.message : "Failed to map subscription",
      code: "SUBSCRIPTION_FETCH_FAILED",
    };
  }
}

/**
 * Change subscription plan (upgrade or downgrade).
 * Validates: plan exists, plan is active, plan is not the same as current.
 * Calls adapter, updates DB, writes audit log.
 */
export async function changePlan(
  client: SupabaseClient,
  adminClient: SupabaseClient,
  tenantId: string,
  userId: string,
  input: ChangePlanDto,
  adapter: PaymentProviderPort,
): Promise<ServiceResult<SubscriptionRecord>> {
  // 1. Get current subscription
  const { data: currentSub, error: subError } = await client
    .from("tenant_subscriptions")
    .select(
      "id, tenant_id, plan_id, status, billing_cycle, current_period_start, current_period_end, cancel_at_period_end, canceled_at, trial_ends_at, grace_ends_at, external_subscription_id, external_customer_id, created_at, updated_at",
    )
    .eq("tenant_id", tenantId)
    .maybeSingle();

  if (subError) {
    return { success: false, error: subError.message, code: "SUBSCRIPTION_FETCH_FAILED" };
  }

  if (!currentSub) {
    return { success: false, error: "No subscription found", code: "SUBSCRIPTION_NOT_FOUND" };
  }

  const sub = currentSub as SubscriptionRow;

  // 2. Verify same plan guard
  if ((sub["plan_id"] as string) === input.planId) {
    return {
      success: false,
      error: "Tenant is already on this plan",
      code: "PLAN_ALREADY_ACTIVE",
    };
  }

  // 3. Get target plan
  const { data: targetPlan, error: planError } = await client
    .from("plans")
    .select(
      "id, name, slug, description, price_monthly, price_yearly, currency, features, limits, is_active, display_order, trial_days, created_at, updated_at",
    )
    .eq("id", input.planId)
    .maybeSingle();

  if (planError) {
    return { success: false, error: planError.message, code: "PLAN_NOT_FOUND" };
  }

  if (!targetPlan) {
    return { success: false, error: "Plan not found", code: "PLAN_NOT_FOUND" };
  }

  const plan = targetPlan as PlanRow;

  // 4. Validate plan is active
  if (!(plan["is_active"] as boolean)) {
    return { success: false, error: "Plan is not available", code: "PLAN_NOT_AVAILABLE" };
  }

  // 5. Call adapter
  const externalSubId = sub["external_subscription_id"] as string | null;
  if (externalSubId) {
    try {
      await adapter.changePlan({
        subscriptionId: externalSubId,
        newPlanSlug: plan["slug"] as string,
      });
    } catch (adapterError) {
      return {
        success: false,
        error: adapterError instanceof Error ? adapterError.message : "Adapter error",
        code: "ADAPTER_ERROR",
      };
    }
  }

  // 6. Update subscription in DB via adminClient
  const { data: updatedSub, error: updateError } = await adminClient
    .from("tenant_subscriptions")
    .update({
      plan_id: input.planId,
      updated_at: new Date().toISOString(),
    })
    .eq("tenant_id", tenantId)
    .select(
      "id, tenant_id, plan_id, status, billing_cycle, current_period_start, current_period_end, cancel_at_period_end, canceled_at, trial_ends_at, grace_ends_at, external_subscription_id, external_customer_id, created_at, updated_at",
    )
    .single();

  if (updateError || !updatedSub) {
    return {
      success: false,
      error: updateError?.message ?? "Failed to update subscription",
      code: "UPDATE_FAILED",
    };
  }

  // 7. Determine upgrade vs downgrade based on price
  const newPriceMonthly = plan["price_monthly"] as number;
  const oldPlanId = sub["plan_id"] as string;

  // Fetch old plan price for upgrade/downgrade determination
  const { data: oldPlanData } = await client
    .from("plans")
    .select("price_monthly")
    .eq("id", oldPlanId)
    .maybeSingle();

  const oldPrice = (oldPlanData as PlanRow | null)?.["price_monthly"] as number | undefined;
  const isUpgrade = oldPrice !== undefined ? newPriceMonthly > oldPrice : true;
  const auditEvent = isUpgrade ? "billing.plan_upgraded" : "billing.plan_downgraded";

  // 8. Write audit log (fire-and-forget)
  void writeAuditLog(adminClient, tenantId, userId, auditEvent, sub["id"] as string, {
    fromPlanId: oldPlanId,
    toPlanId: input.planId,
    initiatedBy: userId,
  });

  // 9. Dispatch notification (non-blocking)
  const notificationType = isUpgrade ? "billing_plan_upgraded" : "billing_plan_downgraded";
  createNotification(
    adminClient,
    {
      tenantId,
      userId,
      type: notificationType,
      category: "billing",
      title: isUpgrade ? "Plan upgraded" : "Plan downgraded",
      body: isUpgrade
        ? "Your subscription plan has been upgraded."
        : "Your subscription plan has been downgraded.",
      metadata: JSON.stringify({ fromPlanId: oldPlanId, toPlanId: input.planId }),
      sourceEvent: auditEvent,
      sourceEntityId: sub["id"] as string,
    },
    createNotificationEmailAdapter(),
  ).catch((notifError) => {
    console.error("[billing] changePlan: notification dispatch failed:", notifError);
  });

  return { success: true, data: mapSubscriptionRow(updatedSub as SubscriptionRow) };
}

/**
 * Cancel subscription — sets cancel_at_period_end or status = 'canceled' for immediate.
 * Calls adapter, updates DB, writes audit log.
 */
export async function cancelSubscription(
  client: SupabaseClient,
  adminClient: SupabaseClient,
  tenantId: string,
  userId: string,
  input: CancelSubscriptionDto,
  adapter: PaymentProviderPort,
): Promise<ServiceResult<SubscriptionRecord>> {
  // 1. Get current subscription
  const { data: currentSub, error: subError } = await client
    .from("tenant_subscriptions")
    .select(
      "id, tenant_id, plan_id, status, billing_cycle, current_period_start, current_period_end, cancel_at_period_end, canceled_at, trial_ends_at, grace_ends_at, external_subscription_id, external_customer_id, created_at, updated_at",
    )
    .eq("tenant_id", tenantId)
    .maybeSingle();

  if (subError) {
    return { success: false, error: subError.message, code: "SUBSCRIPTION_FETCH_FAILED" };
  }

  if (!currentSub) {
    return { success: false, error: "No subscription found", code: "SUBSCRIPTION_NOT_FOUND" };
  }

  const sub = currentSub as SubscriptionRow;

  // 2. Guard: already canceled
  if ((sub["status"] as string) === "canceled") {
    return {
      success: false,
      error: "Subscription is already canceled",
      code: "SUBSCRIPTION_ALREADY_CANCELED",
    };
  }

  const externalSubId = sub["external_subscription_id"] as string | null;

  // 3. Call adapter
  if (externalSubId) {
    try {
      await adapter.cancelSubscription({
        subscriptionId: externalSubId,
        cancelAtPeriodEnd: input.cancelAtPeriodEnd,
      });
    } catch (adapterError) {
      return {
        success: false,
        error: adapterError instanceof Error ? adapterError.message : "Adapter error",
        code: "ADAPTER_ERROR",
      };
    }
  }

  // 4. Build update payload
  const updatePayload: Record<string, unknown> = {
    updated_at: new Date().toISOString(),
  };

  if (input.cancelAtPeriodEnd) {
    updatePayload["cancel_at_period_end"] = true;
  } else {
    updatePayload["status"] = "canceled";
    updatePayload["canceled_at"] = new Date().toISOString();
  }

  // 5. Update DB via adminClient
  const { data: updatedSub, error: updateError } = await adminClient
    .from("tenant_subscriptions")
    .update(updatePayload)
    .eq("tenant_id", tenantId)
    .select(
      "id, tenant_id, plan_id, status, billing_cycle, current_period_start, current_period_end, cancel_at_period_end, canceled_at, trial_ends_at, grace_ends_at, external_subscription_id, external_customer_id, created_at, updated_at",
    )
    .single();

  if (updateError || !updatedSub) {
    return {
      success: false,
      error: updateError?.message ?? "Failed to update subscription",
      code: "UPDATE_FAILED",
    };
  }

  // 6. Write audit log
  void writeAuditLog(
    adminClient,
    tenantId,
    userId,
    "billing.subscription_canceled",
    sub["id"] as string,
    {
      planId: sub["plan_id"] as string,
      cancelAtPeriodEnd: input.cancelAtPeriodEnd,
      accessUntil: input.cancelAtPeriodEnd ? (sub["current_period_end"] as string) : null,
      initiatedBy: userId,
    },
  );

  // 7. Dispatch notification to owner + admins (non-blocking)
  try {
    const { data: recipients } = await adminClient
      .from("profiles")
      .select("id, email")
      .eq("tenant_id", tenantId)
      .in("role", ["owner", "admin"]);

    const recipientRows = (recipients ?? []) as Array<Record<string, unknown>>;
    const inputs = recipientRows.map((r) => ({
      tenantId,
      userId: r["id"] as string,
      type: "billing_canceled" as const,
      category: "billing" as const,
      title: "Subscription canceled",
      body: "Your subscription has been canceled.",
      sourceEvent: "billing.subscription_canceled",
      sourceEntityId: sub["id"] as string,
    }));
    const emailMap: Record<string, string> = {};
    for (const r of recipientRows) {
      emailMap[r["id"] as string] = r["email"] as string;
    }

    if (inputs.length > 0) {
      createBulkNotifications(
        adminClient,
        inputs,
        createNotificationEmailAdapter(),
        emailMap,
      ).catch((notifError) => {
        console.error("[billing] cancelSubscription: notification dispatch failed:", notifError);
      });
    }
  } catch (notifError) {
    console.error("[billing] cancelSubscription: notification dispatch failed:", notifError);
  }

  return { success: true, data: mapSubscriptionRow(updatedSub as SubscriptionRow) };
}

/**
 * Resume a pending cancellation (cancel_at_period_end = true → false).
 * No-op if subscription is already active with no pending cancel.
 */
export async function resumeSubscription(
  client: SupabaseClient,
  adminClient: SupabaseClient,
  tenantId: string,
  userId: string,
  adapter: PaymentProviderPort,
): Promise<ServiceResult<SubscriptionRecord>> {
  // 1. Get current subscription
  const { data: currentSub, error: subError } = await client
    .from("tenant_subscriptions")
    .select(
      "id, tenant_id, plan_id, status, billing_cycle, current_period_start, current_period_end, cancel_at_period_end, canceled_at, trial_ends_at, grace_ends_at, external_subscription_id, external_customer_id, created_at, updated_at",
    )
    .eq("tenant_id", tenantId)
    .maybeSingle();

  if (subError) {
    return { success: false, error: subError.message, code: "SUBSCRIPTION_FETCH_FAILED" };
  }

  if (!currentSub) {
    return { success: false, error: "No subscription found", code: "SUBSCRIPTION_NOT_FOUND" };
  }

  const sub = currentSub as SubscriptionRow;

  // 2. No-op guard: not pending cancel
  if (!(sub["cancel_at_period_end"] as boolean)) {
    return {
      success: false,
      error: "Subscription is not pending cancellation",
      code: "SUBSCRIPTION_NOT_PENDING_CANCEL",
    };
  }

  const externalSubId = sub["external_subscription_id"] as string | null;

  // 3. Call adapter
  if (externalSubId) {
    try {
      await adapter.resumeSubscription({ subscriptionId: externalSubId });
    } catch (adapterError) {
      return {
        success: false,
        error: adapterError instanceof Error ? adapterError.message : "Adapter error",
        code: "ADAPTER_ERROR",
      };
    }
  }

  // 4. Update DB via adminClient
  const { data: updatedSub, error: updateError } = await adminClient
    .from("tenant_subscriptions")
    .update({
      cancel_at_period_end: false,
      updated_at: new Date().toISOString(),
    })
    .eq("tenant_id", tenantId)
    .select(
      "id, tenant_id, plan_id, status, billing_cycle, current_period_start, current_period_end, cancel_at_period_end, canceled_at, trial_ends_at, grace_ends_at, external_subscription_id, external_customer_id, created_at, updated_at",
    )
    .single();

  if (updateError || !updatedSub) {
    return {
      success: false,
      error: updateError?.message ?? "Failed to update subscription",
      code: "UPDATE_FAILED",
    };
  }

  // 5. Write audit log
  void writeAuditLog(
    adminClient,
    tenantId,
    userId,
    "billing.subscription_reactivated",
    sub["id"] as string,
    {
      planId: sub["plan_id"] as string,
      initiatedBy: userId,
    },
  );

  // 6. Dispatch notification to owner + admins (non-blocking)
  try {
    const { data: recipients } = await adminClient
      .from("profiles")
      .select("id, email")
      .eq("tenant_id", tenantId)
      .in("role", ["owner", "admin"]);

    const recipientRows = (recipients ?? []) as Array<Record<string, unknown>>;
    const inputs = recipientRows.map((r) => ({
      tenantId,
      userId: r["id"] as string,
      type: "billing_activated" as const,
      category: "billing" as const,
      title: "Subscription reactivated",
      body: "Your subscription has been reactivated.",
      sourceEvent: "billing.subscription_reactivated",
      sourceEntityId: sub["id"] as string,
    }));
    const emailMap: Record<string, string> = {};
    for (const r of recipientRows) {
      emailMap[r["id"] as string] = r["email"] as string;
    }

    if (inputs.length > 0) {
      createBulkNotifications(
        adminClient,
        inputs,
        createNotificationEmailAdapter(),
        emailMap,
      ).catch((notifError) => {
        console.error("[billing] resumeSubscription: notification dispatch failed:", notifError);
      });
    }
  } catch (notifError) {
    console.error("[billing] resumeSubscription: notification dispatch failed:", notifError);
  }

  return { success: true, data: mapSubscriptionRow(updatedSub as SubscriptionRow) };
}

/**
 * Process an incoming webhook event — idempotent.
 * Checks external_event_id before inserting; no-op on duplicate.
 */
export async function processWebhookEvent(
  adminClient: SupabaseClient,
  event: WebhookEvent,
): Promise<ServiceResult<null>> {
  // 1. Idempotency check
  const { data: existingEvent, error: checkError } = await adminClient
    .from("billing_events")
    .select("id")
    .eq("external_event_id", event.externalEventId)
    .maybeSingle();

  if (checkError) {
    return { success: false, error: checkError.message, code: "WEBHOOK_CHECK_FAILED" };
  }

  if (existingEvent) {
    return {
      success: false,
      error: "Webhook event already processed",
      code: "WEBHOOK_ALREADY_PROCESSED",
    };
  }

  // 2. Resolve tenantId — either passed in or looked up via externalSubscriptionId
  let tenantId = event.tenantId;

  if (!tenantId && event.externalSubscriptionId) {
    const { data: subRow } = await adminClient
      .from("tenant_subscriptions")
      .select("tenant_id")
      .eq("external_subscription_id", event.externalSubscriptionId)
      .maybeSingle();

    tenantId = (subRow as SubscriptionRow | null)?.["tenant_id"] as string | undefined;
  }

  if (!tenantId) {
    return {
      success: false,
      error: "Could not resolve tenant for webhook event",
      code: "TENANT_NOT_FOUND",
    };
  }

  // 3. Get subscription row for the tenant
  const { data: subRow } = await adminClient
    .from("tenant_subscriptions")
    .select("id")
    .eq("tenant_id", tenantId)
    .maybeSingle();

  const subscriptionId = (subRow as SubscriptionRow | null)?.["id"] as string | undefined;

  // 4. Insert billing_events row
  const { error: insertError } = await adminClient.from("billing_events").insert({
    tenant_id: tenantId,
    subscription_id: subscriptionId ?? null,
    event_type: event.eventType,
    provider: event.provider,
    external_event_id: event.externalEventId,
    payload: JSON.stringify(event.payload),
    processed_at: new Date().toISOString(),
  });

  if (insertError) {
    // Handle race condition: UNIQUE constraint violation means duplicate
    if (insertError.code === "23505") {
      return {
        success: false,
        error: "Webhook event already processed",
        code: "WEBHOOK_ALREADY_PROCESSED",
      };
    }
    return { success: false, error: insertError.message, code: "WEBHOOK_INSERT_FAILED" };
  }

  // 5. Sync subscription state if data provided
  if (event.subscriptionData && subscriptionId) {
    await syncSubscriptionState(adminClient, tenantId, event.subscriptionData);
  }

  return { success: true, data: null };
}

/**
 * Get paginated billing history for a tenant.
 * Returns events ordered by created_at DESC.
 */
export async function getBillingHistory(
  client: SupabaseClient,
  tenantId: string,
  query: BillingHistoryQueryDto,
): Promise<ServiceResult<BillingEventRecord[]>> {
  const { limit, offset } = query;

  const { data, error } = await client
    .from("billing_events")
    .select(
      "id, tenant_id, subscription_id, event_type, provider, external_event_id, payload, processed_at, created_at",
    )
    .eq("tenant_id", tenantId)
    .order("created_at", { ascending: false })
    .range(offset, offset + limit - 1);

  if (error) {
    return { success: false, error: error.message, code: "BILLING_HISTORY_FAILED" };
  }

  type BillingEventRow = Record<string, unknown>;
  const events: BillingEventRecord[] = ((data ?? []) as BillingEventRow[]).map((row) => ({
    id: row["id"] as string,
    tenantId: row["tenant_id"] as string,
    subscriptionId: (row["subscription_id"] as string | null) ?? null,
    eventType: row["event_type"] as string,
    provider: row["provider"] as string,
    externalEventId: (row["external_event_id"] as string | null) ?? null,
    payload: (row["payload"] as string | null) ?? null,
    processedAt: (row["processed_at"] as string | null) ?? null,
    createdAt: row["created_at"] as string,
  }));

  return { success: true, data: events };
}

/**
 * Internal: sync subscription state from provider data.
 * Used by processWebhookEvent to apply status transitions.
 */
async function syncSubscriptionState(
  adminClient: SupabaseClient,
  tenantId: string,
  data: WebhookEvent["subscriptionData"],
): Promise<ServiceResult<SubscriptionRecord>> {
  if (!data) {
    return { success: false, error: "No subscription data to sync", code: "SYNC_NO_DATA" };
  }

  const updatePayload: Record<string, unknown> = {
    updated_at: new Date().toISOString(),
  };

  if (data.status !== undefined) updatePayload["status"] = data.status;
  if (data.currentPeriodStart !== undefined)
    updatePayload["current_period_start"] = data.currentPeriodStart;
  if (data.currentPeriodEnd !== undefined)
    updatePayload["current_period_end"] = data.currentPeriodEnd;
  if (data.cancelAtPeriodEnd !== undefined)
    updatePayload["cancel_at_period_end"] = data.cancelAtPeriodEnd;
  if (data.graceEndsAt !== undefined) updatePayload["grace_ends_at"] = data.graceEndsAt;

  const { data: updatedSub, error: updateError } = await adminClient
    .from("tenant_subscriptions")
    .update(updatePayload)
    .eq("tenant_id", tenantId)
    .select(
      "id, tenant_id, plan_id, status, billing_cycle, current_period_start, current_period_end, cancel_at_period_end, canceled_at, trial_ends_at, grace_ends_at, external_subscription_id, external_customer_id, created_at, updated_at",
    )
    .single();

  if (updateError || !updatedSub) {
    return {
      success: false,
      error: updateError?.message ?? "Failed to sync subscription",
      code: "SYNC_FAILED",
    };
  }

  // Write audit event based on new status
  const systemUserId = "00000000-0000-0000-0000-000000000000";
  const statusAuditMap: Record<string, string> = {
    active: "billing.subscription_activated",
    past_due: "billing.subscription_past_due",
    canceled: "billing.subscription_expired",
  };

  const auditEvent = data.status ? statusAuditMap[data.status] : undefined;
  if (auditEvent) {
    void writeAuditLog(adminClient, tenantId, systemUserId, auditEvent, updatedSub["id"] as string);
  }

  // Dispatch notifications based on status transition (non-blocking)
  if (data.status === "past_due" || data.status === "active" || data.status === "canceled") {
    try {
      const { data: recipients } = await adminClient
        .from("profiles")
        .select("id, email, role")
        .eq("tenant_id", tenantId)
        .in("role", ["owner", "admin"]);

      const recipientRows = (recipients ?? []) as Array<Record<string, unknown>>;
      const emailMap: Record<string, string> = {};
      for (const r of recipientRows) {
        emailMap[r["id"] as string] = r["email"] as string;
      }

      let notifInputs: Array<{
        tenantId: string;
        userId: string;
        type: "billing_past_due" | "billing_activated" | "billing_canceled";
        category: "billing";
        title: string;
        body: string;
        sourceEvent: string;
        sourceEntityId?: string;
      }> = [];

      if (data.status === "past_due") {
        // All owners + admins
        notifInputs = recipientRows.map((r) => ({
          tenantId,
          userId: r["id"] as string,
          type: "billing_past_due" as const,
          category: "billing" as const,
          title: "Payment past due",
          body: "Your subscription payment is past due. Please update your payment method.",
          sourceEvent: "billing.subscription_past_due",
          sourceEntityId: updatedSub["id"] as string,
        }));
      } else if (data.status === "active") {
        // Owner only (first owner found)
        const owner = recipientRows.find((r) => r["role"] === "owner");
        if (owner) {
          notifInputs = [
            {
              tenantId,
              userId: owner["id"] as string,
              type: "billing_activated" as const,
              category: "billing" as const,
              title: "Subscription activated",
              body: "Your subscription is now active.",
              sourceEvent: "billing.subscription_activated",
              sourceEntityId: updatedSub["id"] as string,
            },
          ];
        }
      } else if (data.status === "canceled") {
        // All owners + admins
        notifInputs = recipientRows.map((r) => ({
          tenantId,
          userId: r["id"] as string,
          type: "billing_canceled" as const,
          category: "billing" as const,
          title: "Subscription canceled",
          body: "Your subscription has been canceled.",
          sourceEvent: "billing.subscription_expired",
          sourceEntityId: updatedSub["id"] as string,
        }));
      }

      if (notifInputs.length > 0) {
        createBulkNotifications(
          adminClient,
          notifInputs,
          createNotificationEmailAdapter(),
          emailMap,
        ).catch((notifError) => {
          console.error(
            "[billing] syncSubscriptionState: notification dispatch failed:",
            notifError,
          );
        });
      }
    } catch (notifError) {
      console.error("[billing] syncSubscriptionState: notification dispatch failed:", notifError);
    }
  }

  return { success: true, data: mapSubscriptionRow(updatedSub as SubscriptionRow) };
}

/**
 * Initialize subscription for a new tenant — called from signup flow.
 * MUST be wrapped in try/catch — signup MUST NOT fail if billing init fails.
 */
export async function initializeSubscription(
  adminClient: SupabaseClient,
  tenantId: string,
  adapter: PaymentProviderPort,
  planSlug = "free",
): Promise<ServiceResult<SubscriptionRecord>> {
  try {
    // 1. Find free plan
    const { data: planData, error: planError } = await adminClient
      .from("plans")
      .select(
        "id, name, slug, description, price_monthly, price_yearly, currency, features, limits, is_active, display_order, trial_days, created_at, updated_at",
      )
      .eq("slug", planSlug)
      .eq("is_active", true)
      .maybeSingle();

    if (planError || !planData) {
      console.error("[billing] initializeSubscription: plan not found:", planSlug);
      return {
        success: false,
        error: planError?.message ?? `Plan not found: ${planSlug}`,
        code: "PLAN_NOT_FOUND",
      };
    }

    const plan = planData as PlanRow;

    // 2. Create customer via adapter (best-effort)
    let customerId: string;
    try {
      const customerResult = await adapter.createCustomer({
        tenantId,
        tenantName: tenantId, // Tenant name not available at this point — use tenantId as fallback
        email: `tenant-${tenantId}@platform.internal`,
      });
      customerId = customerResult.customerId;
    } catch (err) {
      console.error("[billing] initializeSubscription: createCustomer failed:", err);
      customerId = `local_${tenantId}`;
    }

    // 3. Create subscription via adapter (best-effort)
    let externalSubscriptionId: string;
    let currentPeriodStart: string;
    let currentPeriodEnd: string;
    try {
      const subResult = await adapter.createSubscription({
        customerId,
        planSlug: plan["slug"] as string,
        billingCycle: "monthly",
      });
      externalSubscriptionId = subResult.subscriptionId;
      currentPeriodStart = subResult.currentPeriodStart;
      currentPeriodEnd = subResult.currentPeriodEnd;
    } catch (err) {
      console.error("[billing] initializeSubscription: createSubscription failed:", err);
      const now = new Date();
      const periodEnd = new Date(now);
      periodEnd.setMonth(periodEnd.getMonth() + 1);
      externalSubscriptionId = `local_sub_${tenantId}`;
      currentPeriodStart = now.toISOString();
      currentPeriodEnd = periodEnd.toISOString();
    }

    // 4. Determine status (trialing if trial_days > 0)
    const trialDays = plan["trial_days"] as number;
    const now = new Date();
    const status: SubscriptionRecord["status"] = trialDays > 0 ? "trialing" : "active";
    const trialEndsAt =
      trialDays > 0
        ? new Date(now.getTime() + trialDays * 24 * 60 * 60 * 1000).toISOString()
        : null;

    // 5. Insert tenant_subscriptions row via adminClient
    const { data: newSub, error: insertError } = await adminClient
      .from("tenant_subscriptions")
      .insert({
        tenant_id: tenantId,
        plan_id: plan["id"] as string,
        status,
        billing_cycle: "monthly",
        current_period_start: currentPeriodStart,
        current_period_end: currentPeriodEnd,
        cancel_at_period_end: false,
        trial_ends_at: trialEndsAt,
        external_subscription_id: externalSubscriptionId,
        external_customer_id: customerId,
      })
      .select(
        "id, tenant_id, plan_id, status, billing_cycle, current_period_start, current_period_end, cancel_at_period_end, canceled_at, trial_ends_at, grace_ends_at, external_subscription_id, external_customer_id, created_at, updated_at",
      )
      .single();

    if (insertError || !newSub) {
      console.error("[billing] initializeSubscription: insert failed:", insertError);
      // Log audit event for failure
      void writeAuditLog(
        adminClient,
        tenantId,
        "00000000-0000-0000-0000-000000000000",
        "billing.webhook_processing_failed",
        undefined,
        { error: insertError?.message ?? "Insert failed", planSlug },
      );
      return {
        success: false,
        error: insertError?.message ?? "Failed to initialize subscription",
        code: "INIT_FAILED",
      };
    }

    return { success: true, data: mapSubscriptionRow(newSub as SubscriptionRow) };
  } catch (error) {
    console.error("[billing] initializeSubscription: unexpected error:", error);
    // Log failure to audit log (best-effort — do NOT rethrow)
    try {
      void writeAuditLog(
        adminClient,
        tenantId,
        "00000000-0000-0000-0000-000000000000",
        "billing.webhook_processing_failed",
        undefined,
        { error: error instanceof Error ? error.message : "Unknown error", planSlug },
      );
    } catch {
      // Swallow audit log error — signup must proceed
    }
    return {
      success: false,
      error: error instanceof Error ? error.message : "Unexpected error",
      code: "INIT_FAILED",
    };
  }
}
