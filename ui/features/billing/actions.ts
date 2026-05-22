"use server";

import type { ActionResult, BillingHistoryQueryDto } from "@enterprise/contracts";
import { cancelSubscriptionSchema, changePlanSchema } from "@enterprise/contracts";
import { createPaymentAdapter } from "@enterprise/core/services/adapters/payment-adapter-factory";
import type { BillingEventRecord } from "@enterprise/core/services/billing-service";
import {
  cancelSubscription,
  changePlan,
  getBillingHistory,
  getSubscription,
  resumeSubscription,
} from "@enterprise/core/services/billing-service";
import { getAdminClient } from "@enterprise/core/supabase/admin";
import { getServerClient } from "@enterprise/core/supabase/server";
import { getAppUrl } from "@enterprise/core/utils/env";
import { revalidatePath } from "next/cache";
import { ROUTES } from "@/lib/routes";
import { captureActionError } from "@/lib/sentry";

// ─── Auth Context ─────────────────────────────────────────────────────────────

async function getAuthContext(supabase: Awaited<ReturnType<typeof getServerClient>>) {
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return null;
  }

  const tenantId = (user.app_metadata?.["tenant_id"] as string | undefined) ?? null;
  const role = (user.app_metadata?.["role"] as string | undefined) ?? null;

  return { userId: user.id, tenantId, role };
}

// ─── Actions ──────────────────────────────────────────────────────────────────

export async function changePlanAction(
  _prevState: ActionResult | null,
  formData: FormData,
): Promise<ActionResult> {
  const raw = Object.fromEntries(formData.entries());
  const parsed = changePlanSchema.safeParse(raw);

  if (!parsed.success) {
    return {
      success: false,
      error: {
        code: "VALIDATION_ERROR",
        message: "Invalid input",
        details: parsed.error.flatten().fieldErrors as Record<string, unknown>,
      },
    };
  }

  const supabase = await getServerClient();
  const auth = await getAuthContext(supabase);

  if (!auth?.tenantId || !auth.role) {
    return {
      success: false,
      error: { code: "UNAUTHORIZED", message: "Authentication required" },
    };
  }

  if (auth.role !== "owner") {
    return {
      success: false,
      error: { code: "FORBIDDEN", message: "Only workspace owners can change plans" },
    };
  }

  try {
    const adminClient = getAdminClient();
    const adapter = createPaymentAdapter();
    const result = await changePlan(
      supabase,
      adminClient,
      auth.tenantId,
      auth.userId,
      parsed.data,
      adapter,
    );

    if (!result.success) {
      return {
        success: false,
        error: { code: result.code ?? "CHANGE_PLAN_FAILED", message: result.error },
      };
    }

    revalidatePath(ROUTES.billing);
    return { success: true, data: result.data };
  } catch (err) {
    captureActionError(err, {
      actionName: "changePlanAction",
      area: "billing",
      tenantId: auth.tenantId,
      userId: auth.userId,
      userRole: auth.role,
      inputShape: Object.keys(parsed.data),
    });

    return {
      success: false,
      error: { code: "UNEXPECTED_ERROR", message: "An unexpected error occurred" },
    };
  }
}

export async function cancelSubscriptionAction(
  _prevState: ActionResult | null,
  formData: FormData,
): Promise<ActionResult> {
  const raw = Object.fromEntries(formData.entries());
  // cancelAtPeriodEnd comes as a string from FormData; coerce it
  const coerced = {
    cancelAtPeriodEnd:
      raw["cancelAtPeriodEnd"] === "false" ? false : raw["cancelAtPeriodEnd"] !== "false",
  };
  const parsed = cancelSubscriptionSchema.safeParse(coerced);

  if (!parsed.success) {
    return {
      success: false,
      error: {
        code: "VALIDATION_ERROR",
        message: "Invalid input",
        details: parsed.error.flatten().fieldErrors as Record<string, unknown>,
      },
    };
  }

  const supabase = await getServerClient();
  const auth = await getAuthContext(supabase);

  if (!auth?.tenantId || !auth.role) {
    return {
      success: false,
      error: { code: "UNAUTHORIZED", message: "Authentication required" },
    };
  }

  if (auth.role !== "owner") {
    return {
      success: false,
      error: { code: "FORBIDDEN", message: "Only workspace owners can cancel subscriptions" },
    };
  }

  try {
    const adminClient = getAdminClient();
    const adapter = createPaymentAdapter();
    const result = await cancelSubscription(
      supabase,
      adminClient,
      auth.tenantId,
      auth.userId,
      parsed.data,
      adapter,
    );

    if (!result.success) {
      return {
        success: false,
        error: { code: result.code ?? "CANCEL_FAILED", message: result.error },
      };
    }

    revalidatePath(ROUTES.billing);
    return { success: true, data: result.data };
  } catch (err) {
    captureActionError(err, {
      actionName: "cancelSubscriptionAction",
      area: "billing",
      tenantId: auth.tenantId,
      userId: auth.userId,
      userRole: auth.role,
    });

    return {
      success: false,
      error: { code: "UNEXPECTED_ERROR", message: "An unexpected error occurred" },
    };
  }
}

export async function resumeSubscriptionAction(
  _prevState: ActionResult | null,
  _formData: FormData,
): Promise<ActionResult> {
  const supabase = await getServerClient();
  const auth = await getAuthContext(supabase);

  if (!auth?.tenantId || !auth.role) {
    return {
      success: false,
      error: { code: "UNAUTHORIZED", message: "Authentication required" },
    };
  }

  if (auth.role !== "owner") {
    return {
      success: false,
      error: { code: "FORBIDDEN", message: "Only workspace owners can resume subscriptions" },
    };
  }

  try {
    const adminClient = getAdminClient();
    const adapter = createPaymentAdapter();
    const result = await resumeSubscription(
      supabase,
      adminClient,
      auth.tenantId,
      auth.userId,
      adapter,
    );

    if (!result.success) {
      return {
        success: false,
        error: { code: result.code ?? "RESUME_FAILED", message: result.error },
      };
    }

    revalidatePath(ROUTES.billing);
    return { success: true, data: result.data };
  } catch (err) {
    captureActionError(err, {
      actionName: "resumeSubscriptionAction",
      area: "billing",
      tenantId: auth.tenantId,
      userId: auth.userId,
      userRole: auth.role,
    });

    return {
      success: false,
      error: { code: "UNEXPECTED_ERROR", message: "An unexpected error occurred" },
    };
  }
}

export async function getPortalUrlAction(): Promise<ActionResult<{ url: string }>> {
  const supabase = await getServerClient();
  const auth = await getAuthContext(supabase);

  if (!auth?.tenantId || !auth.role) {
    return {
      success: false,
      error: { code: "UNAUTHORIZED", message: "Authentication required" },
    };
  }

  if (auth.role !== "owner") {
    return {
      success: false,
      error: { code: "FORBIDDEN", message: "Only workspace owners can access the billing portal" },
    };
  }

  try {
    // Get subscription to extract the external customer ID
    const subResult = await getSubscription(supabase, auth.tenantId);

    if (!subResult.success || !subResult.data) {
      return {
        success: false,
        error: {
          code: subResult.success
            ? "SUBSCRIPTION_NOT_FOUND"
            : (subResult.code ?? "SUBSCRIPTION_FETCH_FAILED"),
          message: subResult.success ? "No active subscription found" : subResult.error,
        },
      };
    }

    const customerId = subResult.data.externalCustomerId ?? `local_${auth.tenantId}`;
    const returnUrl = `${getAppUrl()}${ROUTES.billing}`;

    const adapter = createPaymentAdapter();
    const portalResult = await adapter.getPortalUrl({ customerId, returnUrl });

    return { success: true, data: { url: portalResult.url } };
  } catch (err) {
    captureActionError(err, {
      actionName: "getPortalUrlAction",
      area: "billing",
      tenantId: auth.tenantId,
      userId: auth.userId,
      userRole: auth.role,
    });

    return {
      success: false,
      error: { code: "UNEXPECTED_ERROR", message: "An unexpected error occurred" },
    };
  }
}

// ---------------------------------------------------------------------------
// Billing History (pagination from Client Component)
// ---------------------------------------------------------------------------

export async function fetchBillingHistoryAction(
  tenantId: string,
  query: BillingHistoryQueryDto,
): Promise<BillingEventRecord[]> {
  const supabase = await getServerClient();
  const result = await getBillingHistory(supabase, tenantId, query);
  if (!result.success) return [];
  return result.data;
}
