// Local payment adapter — in-memory implementation for development and testing
// Returns deterministic local_ prefixed IDs, logs all operations to console
// Zero external dependencies — safe for local dev without Stripe credentials

import type {
  CancelSubscriptionParams,
  ChangePlanParams,
  CreateCustomerParams,
  CreateSubscriptionParams,
  PaymentProviderPort,
  PortalUrlParams,
  ResumeSubscriptionParams,
} from "../ports/payment-provider-port";

export class LocalPaymentAdapter implements PaymentProviderPort {
  async createCustomer(params: CreateCustomerParams): Promise<{ customerId: string }> {
    const customerId = `local_${params.tenantId}`;
    console.log("[LocalPaymentAdapter] createCustomer:", {
      tenantId: params.tenantId,
      tenantName: params.tenantName,
      email: params.email,
      customerId,
    });
    return { customerId };
  }

  async createSubscription(params: CreateSubscriptionParams): Promise<{
    subscriptionId: string;
    status: string;
    currentPeriodStart: string;
    currentPeriodEnd: string;
  }> {
    const now = new Date();
    const periodEnd = new Date(now);
    periodEnd.setMonth(periodEnd.getMonth() + (params.billingCycle === "yearly" ? 12 : 1));

    const subscriptionId = `local_sub_${params.customerId}_${params.planSlug}`;
    const result = {
      subscriptionId,
      status: "active",
      currentPeriodStart: now.toISOString(),
      currentPeriodEnd: periodEnd.toISOString(),
    };

    console.log("[LocalPaymentAdapter] createSubscription:", {
      customerId: params.customerId,
      planSlug: params.planSlug,
      billingCycle: params.billingCycle,
      ...result,
    });

    return result;
  }

  async changePlan(params: ChangePlanParams): Promise<{ success: boolean }> {
    console.log("[LocalPaymentAdapter] changePlan:", {
      subscriptionId: params.subscriptionId,
      newPlanSlug: params.newPlanSlug,
    });
    return { success: true };
  }

  async cancelSubscription(params: CancelSubscriptionParams): Promise<{ success: boolean }> {
    console.log("[LocalPaymentAdapter] cancelSubscription:", {
      subscriptionId: params.subscriptionId,
      cancelAtPeriodEnd: params.cancelAtPeriodEnd,
    });
    return { success: true };
  }

  async resumeSubscription(params: ResumeSubscriptionParams): Promise<{ success: boolean }> {
    console.log("[LocalPaymentAdapter] resumeSubscription:", {
      subscriptionId: params.subscriptionId,
    });
    return { success: true };
  }

  async getPortalUrl(_params: PortalUrlParams): Promise<{ url: string }> {
    const url = "http://localhost:3000/billing?portal=local";
    console.log("[LocalPaymentAdapter] getPortalUrl:", { url });
    return { url };
  }

  /**
   * NOT a signature check. This is a no-op stub that accepts every payload so
   * local development works without Stripe credentials.
   *
   * It must never run in production behind a reachable webhook route:
   * createPaymentAdapter() throws in production unless BILLING_PROVIDER=local is
   * set explicitly, which is the only supported way to reach this method there.
   */
  async verifyWebhookSignature(_payload: string, _signature: string): Promise<boolean> {
    console.warn(
      "[LocalPaymentAdapter] verifyWebhookSignature: NO signature verification performed. " +
        "The payload is accepted unconditionally. This is a local-development stub only.",
    );
    return true;
  }
}
