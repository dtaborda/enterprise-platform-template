// Stripe payment adapter — production implementation using Stripe SDK
// Constructor receives stripeSecretKey and webhookSecret for signature verification
// Maps plan slugs to Stripe product/price IDs via metadata convention

import type {
  CancelSubscriptionParams,
  ChangePlanParams,
  CreateCustomerParams,
  CreateSubscriptionParams,
  PaymentProviderPort,
  PortalUrlParams,
  ResumeSubscriptionParams,
} from "../ports/payment-provider-port";

// Dynamic import type — avoids hard dependency if stripe is not installed
type StripeInstance = import("stripe").default;

export class StripePaymentAdapter implements PaymentProviderPort {
  private readonly stripeSecretKey: string;
  private readonly webhookSecret: string;
  private stripeInstance: StripeInstance | null = null;

  constructor(stripeSecretKey: string, webhookSecret = "") {
    this.stripeSecretKey = stripeSecretKey;
    this.webhookSecret = webhookSecret;
  }

  private async getStripe(): Promise<StripeInstance> {
    if (this.stripeInstance) return this.stripeInstance;

    const { default: Stripe } = await import("stripe");
    this.stripeInstance = new Stripe(this.stripeSecretKey, {
      apiVersion: "2025-02-24.acacia",
    });

    return this.stripeInstance;
  }

  async createCustomer(params: CreateCustomerParams): Promise<{ customerId: string }> {
    try {
      const stripe = await this.getStripe();
      const customer = await stripe.customers.create({
        name: params.tenantName,
        email: params.email,
        metadata: {
          tenant_id: params.tenantId,
        },
      });
      return { customerId: customer.id };
    } catch (err) {
      const message = err instanceof Error ? err.message : "Stripe createCustomer failed";
      throw new Error(`[StripePaymentAdapter] createCustomer error: ${message}`);
    }
  }

  async createSubscription(params: CreateSubscriptionParams): Promise<{
    subscriptionId: string;
    status: string;
    currentPeriodStart: string;
    currentPeriodEnd: string;
  }> {
    try {
      const stripe = await this.getStripe();

      // Look up Stripe price by plan slug and billing cycle via metadata
      const prices = await stripe.prices.search({
        query: `metadata["plan_slug"]:"${params.planSlug}" AND metadata["billing_cycle"]:"${params.billingCycle}" AND active:"true"`,
      });

      if (!prices.data[0]) {
        throw new Error(
          `No active Stripe price found for plan "${params.planSlug}" (${params.billingCycle})`,
        );
      }

      const priceId = prices.data[0].id;

      const subscription = await stripe.subscriptions.create({
        customer: params.customerId,
        items: [{ price: priceId }],
        metadata: {
          plan_slug: params.planSlug,
          billing_cycle: params.billingCycle,
        },
      });

      return {
        subscriptionId: subscription.id,
        status: subscription.status,
        currentPeriodStart: new Date(subscription.current_period_start * 1000).toISOString(),
        currentPeriodEnd: new Date(subscription.current_period_end * 1000).toISOString(),
      };
    } catch (err) {
      const message = err instanceof Error ? err.message : "Stripe createSubscription failed";
      throw new Error(`[StripePaymentAdapter] createSubscription error: ${message}`);
    }
  }

  async changePlan(params: ChangePlanParams): Promise<{ success: boolean }> {
    try {
      const stripe = await this.getStripe();

      // Load current subscription to get the existing item
      const subscription = await stripe.subscriptions.retrieve(params.subscriptionId);
      const subscriptionItemId = subscription.items.data[0]?.id;

      if (!subscriptionItemId) {
        throw new Error(`No subscription item found for subscription ${params.subscriptionId}`);
      }

      // Look up new price by plan slug (cycle inherited from current subscription)
      const currentInterval = subscription.items.data[0]?.price.recurring?.interval ?? "month";
      const billingCycle = currentInterval === "year" ? "yearly" : "monthly";

      const prices = await stripe.prices.search({
        query: `metadata["plan_slug"]:"${params.newPlanSlug}" AND metadata["billing_cycle"]:"${billingCycle}" AND active:"true"`,
      });

      if (!prices.data[0]) {
        throw new Error(`No active Stripe price found for plan "${params.newPlanSlug}"`);
      }

      await stripe.subscriptions.update(params.subscriptionId, {
        items: [{ id: subscriptionItemId, price: prices.data[0].id }],
        proration_behavior: "create_prorations",
        metadata: {
          plan_slug: params.newPlanSlug,
        },
      });

      return { success: true };
    } catch (err) {
      const message = err instanceof Error ? err.message : "Stripe changePlan failed";
      throw new Error(`[StripePaymentAdapter] changePlan error: ${message}`);
    }
  }

  async cancelSubscription(params: CancelSubscriptionParams): Promise<{ success: boolean }> {
    try {
      const stripe = await this.getStripe();

      if (params.cancelAtPeriodEnd) {
        await stripe.subscriptions.update(params.subscriptionId, {
          cancel_at_period_end: true,
        });
      } else {
        await stripe.subscriptions.cancel(params.subscriptionId);
      }

      return { success: true };
    } catch (err) {
      const message = err instanceof Error ? err.message : "Stripe cancelSubscription failed";
      throw new Error(`[StripePaymentAdapter] cancelSubscription error: ${message}`);
    }
  }

  async resumeSubscription(params: ResumeSubscriptionParams): Promise<{ success: boolean }> {
    try {
      const stripe = await this.getStripe();

      await stripe.subscriptions.update(params.subscriptionId, {
        cancel_at_period_end: false,
      });

      return { success: true };
    } catch (err) {
      const message = err instanceof Error ? err.message : "Stripe resumeSubscription failed";
      throw new Error(`[StripePaymentAdapter] resumeSubscription error: ${message}`);
    }
  }

  async getPortalUrl(params: PortalUrlParams): Promise<{ url: string }> {
    try {
      const stripe = await this.getStripe();

      const session = await stripe.billingPortal.sessions.create({
        customer: params.customerId,
        return_url: params.returnUrl,
      });

      return { url: session.url };
    } catch (err) {
      const message = err instanceof Error ? err.message : "Stripe getPortalUrl failed";
      throw new Error(`[StripePaymentAdapter] getPortalUrl error: ${message}`);
    }
  }

  async verifyWebhookSignature(payload: string, signature: string): Promise<boolean> {
    try {
      if (!this.webhookSecret) {
        console.warn(
          "[StripePaymentAdapter] verifyWebhookSignature: no webhookSecret configured — skipping verification",
        );
        return false;
      }

      const stripe = await this.getStripe();
      stripe.webhooks.constructEvent(payload, signature, this.webhookSecret);
      return true;
    } catch {
      return false;
    }
  }
}
