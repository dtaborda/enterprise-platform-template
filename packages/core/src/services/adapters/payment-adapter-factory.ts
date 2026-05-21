// Payment adapter factory — selects the correct adapter based on env var presence
// STRIPE_SECRET_KEY present → StripePaymentAdapter; absent → LocalPaymentAdapter
// Adapter is singleton-cached per process (serverless-safe — each cold start gets fresh selection)

import type { PaymentProviderPort } from "../ports/payment-provider-port";
import { LocalPaymentAdapter } from "./local-payment-adapter";
import { StripePaymentAdapter } from "./stripe-payment-adapter";

let cachedAdapter: PaymentProviderPort | null = null;

/**
 * Returns the appropriate payment adapter based on env var presence.
 * Cached per process — multiple calls return the same instance.
 */
export function createPaymentAdapter(): PaymentProviderPort {
  if (cachedAdapter) return cachedAdapter;

  const stripeKey = process.env["STRIPE_SECRET_KEY"];
  const webhookSecret = process.env["STRIPE_WEBHOOK_SECRET"] ?? "";

  cachedAdapter = stripeKey
    ? new StripePaymentAdapter(stripeKey, webhookSecret)
    : new LocalPaymentAdapter();

  return cachedAdapter;
}
