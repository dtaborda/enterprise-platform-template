/**
 * payment-adapter-factory.test.ts — validates createPaymentAdapter() selection rules
 *
 * Tests verify:
 * 1. Production without STRIPE_SECRET_KEY throws instead of silently falling back
 *    to LocalPaymentAdapter, whose verifyWebhookSignature() accepts every payload
 * 2. Production with STRIPE_SECRET_KEY returns the Stripe adapter
 * 3. Production with BILLING_PROVIDER=local returns the local adapter and warns
 * 4. Development without STRIPE_SECRET_KEY returns the local adapter
 * 5. An unknown BILLING_PROVIDER value fails loudly
 *
 * process.env is replaced wholesale per test because NODE_ENV is a read-only
 * property and cannot be assigned in place — same approach as
 * packages/core/src/utils/env.test.ts.
 *
 * The factory caches its selection in a module-level variable, so every test
 * re-imports the module through vi.resetModules() to get a clean singleton.
 * The adapter classes are re-imported from that same fresh module graph —
 * a statically imported class would be a different identity after a reset and
 * would break every `toBeInstanceOf` assertion.
 */
import { afterEach, describe, expect, it, vi } from "vitest";

const originalEnv = process.env;

/** Imports a fresh factory plus matching adapter classes from one module graph. */
async function importFreshFactory() {
  vi.resetModules();

  const [factoryModule, localModule, stripeModule] = await Promise.all([
    import("../payment-adapter-factory"),
    import("../local-payment-adapter"),
    import("../stripe-payment-adapter"),
  ]);

  return {
    createPaymentAdapter: factoryModule.createPaymentAdapter,
    LocalPaymentAdapter: localModule.LocalPaymentAdapter,
    StripePaymentAdapter: stripeModule.StripePaymentAdapter,
  };
}

afterEach(() => {
  process.env = originalEnv;
  vi.restoreAllMocks();
});

describe("createPaymentAdapter", () => {
  describe("production", () => {
    it("throws when STRIPE_SECRET_KEY is missing and no explicit opt-out is set", async () => {
      process.env = { NODE_ENV: "production" };

      const { createPaymentAdapter } = await importFreshFactory();

      expect(() => createPaymentAdapter()).toThrow(/Missing STRIPE_SECRET_KEY in production/);
    });

    it("names the explicit opt-out in the error message", async () => {
      process.env = { NODE_ENV: "production" };

      const { createPaymentAdapter } = await importFreshFactory();

      expect(() => createPaymentAdapter()).toThrow(/BILLING_PROVIDER=local/);
    });

    it("returns the Stripe adapter when STRIPE_SECRET_KEY is set", async () => {
      process.env = {
        NODE_ENV: "production",
        STRIPE_SECRET_KEY: "sk_test_key",
        STRIPE_WEBHOOK_SECRET: "whsec_test",
      };

      const { createPaymentAdapter, StripePaymentAdapter } = await importFreshFactory();

      expect(createPaymentAdapter()).toBeInstanceOf(StripePaymentAdapter);
    });

    it("returns the local adapter when BILLING_PROVIDER=local opts out explicitly", async () => {
      process.env = { NODE_ENV: "production", BILLING_PROVIDER: "local" };

      const { createPaymentAdapter, LocalPaymentAdapter } = await importFreshFactory();

      expect(createPaymentAdapter()).toBeInstanceOf(LocalPaymentAdapter);
    });

    it("logs a warning once when BILLING_PROVIDER=local is used in production", async () => {
      process.env = { NODE_ENV: "production", BILLING_PROVIDER: "local" };
      const warnSpy = vi.spyOn(console, "warn").mockImplementation(() => undefined);

      const { createPaymentAdapter } = await importFreshFactory();
      createPaymentAdapter();
      createPaymentAdapter();

      expect(warnSpy).toHaveBeenCalledTimes(1);
      expect(warnSpy.mock.calls[0]?.[0]).toContain("does NOT verify webhook signatures");
    });

    it("prefers Stripe over the local fallback when the key is present", async () => {
      process.env = {
        NODE_ENV: "production",
        BILLING_PROVIDER: "stripe",
        STRIPE_SECRET_KEY: "sk_test_key",
      };

      const { createPaymentAdapter, StripePaymentAdapter } = await importFreshFactory();

      expect(createPaymentAdapter()).toBeInstanceOf(StripePaymentAdapter);
    });
  });

  describe("development", () => {
    it("returns the local adapter when STRIPE_SECRET_KEY is missing", async () => {
      process.env = { NODE_ENV: "development" };

      const { createPaymentAdapter, LocalPaymentAdapter } = await importFreshFactory();

      expect(createPaymentAdapter()).toBeInstanceOf(LocalPaymentAdapter);
    });

    it("does not warn about the local adapter outside production", async () => {
      process.env = { NODE_ENV: "development" };
      const warnSpy = vi.spyOn(console, "warn").mockImplementation(() => undefined);

      const { createPaymentAdapter } = await importFreshFactory();
      createPaymentAdapter();

      expect(warnSpy).not.toHaveBeenCalled();
    });

    it("returns the Stripe adapter when STRIPE_SECRET_KEY is set", async () => {
      process.env = { NODE_ENV: "development", STRIPE_SECRET_KEY: "sk_test_key" };

      const { createPaymentAdapter, StripePaymentAdapter } = await importFreshFactory();

      expect(createPaymentAdapter()).toBeInstanceOf(StripePaymentAdapter);
    });
  });

  describe("invalid configuration", () => {
    it("throws a descriptive error for an unknown BILLING_PROVIDER", async () => {
      process.env = { NODE_ENV: "development", BILLING_PROVIDER: "paypal" };

      const { createPaymentAdapter } = await importFreshFactory();

      expect(() => createPaymentAdapter()).toThrow(
        /Unknown BILLING_PROVIDER: "paypal".+"stripe", "local"/s,
      );
    });
  });

  describe("caching", () => {
    it("returns the same instance across calls", async () => {
      process.env = { NODE_ENV: "development" };

      const { createPaymentAdapter } = await importFreshFactory();

      expect(createPaymentAdapter()).toBe(createPaymentAdapter());
    });
  });
});
