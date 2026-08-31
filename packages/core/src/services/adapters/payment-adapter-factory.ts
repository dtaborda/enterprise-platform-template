// Payment adapter factory — selects the correct adapter based on env vars
// BILLING_PROVIDER: "stripe" (default) → StripePaymentAdapter, requires STRIPE_SECRET_KEY
//                   "local"            → LocalPaymentAdapter (no real signature verification)
// Adapter is singleton-cached per process (serverless-safe — each cold start gets fresh selection)

import type { PaymentProviderPort } from "../ports/payment-provider-port";
import { LocalPaymentAdapter } from "./local-payment-adapter";
import { StripePaymentAdapter } from "./stripe-payment-adapter";

/** Supported billing providers, selected via the BILLING_PROVIDER env var. */
const BILLING_PROVIDERS = {
  STRIPE: "stripe",
  LOCAL: "local",
} as const;

type BillingProvider = (typeof BILLING_PROVIDERS)[keyof typeof BILLING_PROVIDERS];

const SUPPORTED_BILLING_PROVIDERS: readonly BillingProvider[] = [
  BILLING_PROVIDERS.STRIPE,
  BILLING_PROVIDERS.LOCAL,
];

let cachedAdapter: PaymentProviderPort | null = null;

function isBillingProvider(value: string): value is BillingProvider {
  return (SUPPORTED_BILLING_PROVIDERS as readonly string[]).includes(value);
}

/**
 * Returns the appropriate payment adapter.
 *
 * Selection is driven by env vars:
 *   BILLING_PROVIDER   — "stripe" (default) | "local"
 *   STRIPE_SECRET_KEY  — required when BILLING_PROVIDER is "stripe" in production
 *   STRIPE_WEBHOOK_SECRET — signing secret used to verify inbound webhooks
 *
 * Why NODE_ENV is checked here even though adapter selection is normally
 * env-var driven: LocalPaymentAdapter.verifyWebhookSignature() accepts every
 * payload by design. Silently falling back to it in production would leave the
 * public, unauthenticated billing webhook route open to forged requests. So the
 * production fallback is a hard failure, and opting into the local adapter in
 * production must be explicit via BILLING_PROVIDER=local.
 *
 * Cached per process — multiple calls return the same instance.
 */
export function createPaymentAdapter(): PaymentProviderPort {
  if (cachedAdapter) return cachedAdapter;

  const provider = process.env["BILLING_PROVIDER"] ?? BILLING_PROVIDERS.STRIPE;
  const isProduction = process.env["NODE_ENV"] === "production";

  if (!isBillingProvider(provider)) {
    throw new Error(
      `[createPaymentAdapter] Unknown BILLING_PROVIDER: "${provider}". ` +
        `Supported values: "stripe", "local". Use "stripe" with STRIPE_SECRET_KEY set, ` +
        `or "local" to ship without a payment provider.`,
    );
  }

  if (provider === BILLING_PROVIDERS.LOCAL) {
    if (isProduction) {
      warnLocalProviderInProduction();
    }

    cachedAdapter = new LocalPaymentAdapter();
    return cachedAdapter;
  }

  const stripeKey = process.env["STRIPE_SECRET_KEY"];

  if (!stripeKey) {
    if (isProduction) {
      throw new Error(
        "Missing STRIPE_SECRET_KEY in production. Set STRIPE_SECRET_KEY and " +
          "STRIPE_WEBHOOK_SECRET to enable Stripe billing, or set BILLING_PROVIDER=local " +
          "to explicitly ship without a payment provider. Falling back to the local " +
          "adapter silently would accept unverified billing webhooks.",
      );
    }

    cachedAdapter = new LocalPaymentAdapter();
    return cachedAdapter;
  }

  const webhookSecret = process.env["STRIPE_WEBHOOK_SECRET"] ?? "";

  cachedAdapter = new StripePaymentAdapter(stripeKey, webhookSecret);
  return cachedAdapter;
}

let warnedAboutLocalProviderInProduction = false;

function warnLocalProviderInProduction(): void {
  if (warnedAboutLocalProviderInProduction) return;
  warnedAboutLocalProviderInProduction = true;

  console.warn(
    "[createPaymentAdapter] BILLING_PROVIDER=local is active in production. " +
      "The local payment adapter does NOT verify webhook signatures — every payload " +
      "sent to the billing webhook route is accepted. Only keep this setting if the " +
      "billing webhook route is unreachable or billing is disabled for this deployment.",
  );
}
