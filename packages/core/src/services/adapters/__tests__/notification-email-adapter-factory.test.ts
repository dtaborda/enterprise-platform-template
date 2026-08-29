/**
 * notification-email-adapter-factory.test.ts — validates createNotificationEmailAdapter()
 *
 * Tests verify:
 * 1. RESEND_API_KEY absent → console adapter, no EMAIL_FROM required
 * 2. RESEND_API_KEY present with EMAIL_FROM → Resend adapter
 * 3. RESEND_API_KEY present without EMAIL_FROM → throws instead of sending from
 *    an unverified fallback domain
 *
 * The factory caches its selection in a module-level variable, so every test
 * re-imports the module through vi.resetModules() to get a clean singleton.
 * The adapter classes are re-imported from that same fresh module graph —
 * a statically imported class would be a different identity after a reset.
 */
import { afterEach, describe, expect, it, vi } from "vitest";

const originalEnv = process.env;

// getEmailFrom() goes through getEnv(), which validates the Supabase contract.
const REQUIRED_ENV = {
  NEXT_PUBLIC_SUPABASE_URL: "https://example.supabase.co",
  NEXT_PUBLIC_SUPABASE_ANON_KEY: "anon-key",
  NODE_ENV: "test",
} as const;

/** Imports a fresh factory plus matching adapter classes from one module graph. */
async function importFreshFactory() {
  vi.resetModules();

  const [factoryModule, consoleModule, resendModule] = await Promise.all([
    import("../notification-email-adapter-factory"),
    import("../console-notification-email"),
    import("../resend-notification-email"),
  ]);

  return {
    createNotificationEmailAdapter: factoryModule.createNotificationEmailAdapter,
    ConsoleNotificationEmailAdapter: consoleModule.ConsoleNotificationEmailAdapter,
    ResendNotificationEmailAdapter: resendModule.ResendNotificationEmailAdapter,
  };
}

afterEach(() => {
  process.env = originalEnv;
});

describe("createNotificationEmailAdapter", () => {
  it("returns the console adapter when RESEND_API_KEY is absent", async () => {
    process.env = { ...REQUIRED_ENV };

    const { createNotificationEmailAdapter, ConsoleNotificationEmailAdapter } =
      await importFreshFactory();

    expect(createNotificationEmailAdapter()).toBeInstanceOf(ConsoleNotificationEmailAdapter);
  });

  it("does not require EMAIL_FROM when the console adapter is selected", async () => {
    process.env = { ...REQUIRED_ENV };

    const { createNotificationEmailAdapter } = await importFreshFactory();

    expect(() => createNotificationEmailAdapter()).not.toThrow();
  });

  it("returns the Resend adapter when RESEND_API_KEY and EMAIL_FROM are set", async () => {
    process.env = {
      ...REQUIRED_ENV,
      RESEND_API_KEY: "re_test_key",
      EMAIL_FROM: "noreply@verified.example",
    };

    const { createNotificationEmailAdapter, ResendNotificationEmailAdapter } =
      await importFreshFactory();

    expect(createNotificationEmailAdapter()).toBeInstanceOf(ResendNotificationEmailAdapter);
  });

  it("throws when RESEND_API_KEY is set but EMAIL_FROM is missing", async () => {
    process.env = { ...REQUIRED_ENV, RESEND_API_KEY: "re_test_key" };

    const { createNotificationEmailAdapter } = await importFreshFactory();

    expect(() => createNotificationEmailAdapter()).toThrow(
      /Missing outbound email sender address.+EMAIL_FROM/s,
    );
  });

  // A blank EMAIL_FROM= must raise the specific sender-address error, not a
  // schema-wide getEnv() failure that would break unrelated consumers.
  it("throws the sender-address error when EMAIL_FROM is set to an empty string", async () => {
    process.env = { ...REQUIRED_ENV, RESEND_API_KEY: "re_test_key", EMAIL_FROM: "" };

    const { createNotificationEmailAdapter } = await importFreshFactory();

    expect(() => createNotificationEmailAdapter()).toThrow(
      /Missing outbound email sender address.+EMAIL_FROM/s,
    );
  });

  it("returns the same instance across calls", async () => {
    process.env = { ...REQUIRED_ENV };

    const { createNotificationEmailAdapter } = await importFreshFactory();

    expect(createNotificationEmailAdapter()).toBe(createNotificationEmailAdapter());
  });
});
