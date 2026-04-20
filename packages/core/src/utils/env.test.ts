import { afterEach, describe, expect, it, vi } from "vitest";

const REQUIRED_ENV = {
  NEXT_PUBLIC_SUPABASE_URL: "https://example.supabase.co",
  NEXT_PUBLIC_SUPABASE_ANON_KEY: "anon-key",
};

async function loadEnvUtils() {
  vi.resetModules();
  return import("./env");
}

describe("getAppUrl", () => {
  const originalEnv = process.env;

  afterEach(() => {
    process.env = originalEnv;
  });

  it("fails fast in production when canonical URL is missing", async () => {
    process.env = {
      ...REQUIRED_ENV,
      NODE_ENV: "production",
    };

    const { getAppUrl } = await loadEnvUtils();

    expect(() => getAppUrl()).toThrowError("Missing canonical application URL in production");
  });

  it("fails fast in production for localhost-like URLs", async () => {
    process.env = {
      ...REQUIRED_ENV,
      NODE_ENV: "production",
      NEXT_PUBLIC_APP_URL: "http://localhost:3000",
    };

    const { getAppUrl } = await loadEnvUtils();

    expect(() => getAppUrl()).toThrowError("Localhost-style URLs are not allowed");
  });

  it("fails fast in production for bracketed IPv6 loopback URLs", async () => {
    process.env = {
      ...REQUIRED_ENV,
      NODE_ENV: "production",
      NEXT_PUBLIC_APP_URL: "http://[::1]:3000",
    };

    const { getAppUrl } = await loadEnvUtils();

    expect(() => getAppUrl()).toThrowError("Localhost-style URLs are not allowed");
  });

  it("returns localhost fallback in development when canonical URL is missing", async () => {
    process.env = {
      ...REQUIRED_ENV,
      NODE_ENV: "development",
    };

    const { getAppUrl } = await loadEnvUtils();

    expect(getAppUrl()).toBe("http://localhost:3000");
  });
});
