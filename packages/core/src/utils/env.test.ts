import { afterEach, describe, expect, it, vi } from "vitest";

const REQUIRED_ENV = {
  NEXT_PUBLIC_SUPABASE_URL: "https://example.supabase.co",
  NEXT_PUBLIC_SUPABASE_ANON_KEY: "anon-key",
};

async function loadEnvUtils() {
  vi.resetModules();
  return import("./env");
}

const originalEnv = process.env;

afterEach(() => {
  process.env = originalEnv;
});

describe("getEnv", () => {
  it("throws when NEXT_PUBLIC_SUPABASE_URL is missing/invalid", async () => {
    process.env = {
      NEXT_PUBLIC_SUPABASE_ANON_KEY: "anon-key",
      NODE_ENV: "development",
    };

    const { getEnv } = await loadEnvUtils();
    expect(() => getEnv()).toThrowError("Invalid environment variables");

    process.env = {
      ...REQUIRED_ENV,
      NEXT_PUBLIC_SUPABASE_URL: "not-a-url",
      NODE_ENV: "development",
    };

    const { getEnv: getInvalidUrlEnv } = await loadEnvUtils();
    expect(() => getInvalidUrlEnv()).toThrowError("Invalid environment variables");
  });

  it("throws when NEXT_PUBLIC_SUPABASE_ANON_KEY is missing", async () => {
    process.env = {
      NEXT_PUBLIC_SUPABASE_URL: "https://example.supabase.co",
      NODE_ENV: "development",
    };

    const { getEnv } = await loadEnvUtils();
    expect(() => getEnv()).toThrowError("Invalid environment variables");
  });

  it("parses valid env and returns expected fields", async () => {
    process.env = {
      ...REQUIRED_ENV,
      NODE_ENV: "test",
      NEXT_PUBLIC_APP_URL: "https://app.enterprise.dev",
      SUPABASE_SERVICE_ROLE_KEY: "service-role-key",
    };

    const { getEnv } = await loadEnvUtils();
    const env = getEnv();

    expect(env).toMatchObject({
      NEXT_PUBLIC_SUPABASE_URL: "https://example.supabase.co",
      NEXT_PUBLIC_SUPABASE_ANON_KEY: "anon-key",
      NODE_ENV: "test",
      NEXT_PUBLIC_APP_URL: "https://app.enterprise.dev",
      SUPABASE_SERVICE_ROLE_KEY: "service-role-key",
    });
  });

  it("caches parsed result (subsequent call returns same object reference)", async () => {
    process.env = {
      ...REQUIRED_ENV,
      NODE_ENV: "development",
    };

    const { getEnv } = await loadEnvUtils();
    const first = getEnv();
    const second = getEnv();

    expect(first).toBe(second);
  });
});

describe("environment predicates", () => {
  it("isProduction() true only for NODE_ENV=production", async () => {
    process.env = { ...REQUIRED_ENV, NODE_ENV: "production" };
    let envUtils = await loadEnvUtils();
    expect(envUtils.isProduction()).toBe(true);

    process.env = { ...REQUIRED_ENV, NODE_ENV: "development" };
    envUtils = await loadEnvUtils();
    expect(envUtils.isProduction()).toBe(false);
  });

  it("isDevelopment() true only for NODE_ENV=development", async () => {
    process.env = { ...REQUIRED_ENV, NODE_ENV: "development" };
    let envUtils = await loadEnvUtils();
    expect(envUtils.isDevelopment()).toBe(true);

    process.env = { ...REQUIRED_ENV, NODE_ENV: "test" };
    envUtils = await loadEnvUtils();
    expect(envUtils.isDevelopment()).toBe(false);
  });

  it("isTest() true only for NODE_ENV=test", async () => {
    process.env = { ...REQUIRED_ENV, NODE_ENV: "test" };
    let envUtils = await loadEnvUtils();
    expect(envUtils.isTest()).toBe(true);

    process.env = { ...REQUIRED_ENV, NODE_ENV: "production" };
    envUtils = await loadEnvUtils();
    expect(envUtils.isTest()).toBe(false);
  });
});

describe("env accessors", () => {
  it("getSupabaseUrl() returns NEXT_PUBLIC_SUPABASE_URL", async () => {
    process.env = { ...REQUIRED_ENV, NODE_ENV: "development" };
    const { getSupabaseUrl } = await loadEnvUtils();
    expect(getSupabaseUrl()).toBe("https://example.supabase.co");
  });

  it("getSupabaseAnonKey() returns NEXT_PUBLIC_SUPABASE_ANON_KEY", async () => {
    process.env = { ...REQUIRED_ENV, NODE_ENV: "development" };
    const { getSupabaseAnonKey } = await loadEnvUtils();
    expect(getSupabaseAnonKey()).toBe("anon-key");
  });

  it("getServiceRoleKey() returns optional service role key or undefined", async () => {
    process.env = {
      ...REQUIRED_ENV,
      NODE_ENV: "development",
      SUPABASE_SERVICE_ROLE_KEY: "service-role-key",
    };
    let envUtils = await loadEnvUtils();
    expect(envUtils.getServiceRoleKey()).toBe("service-role-key");

    process.env = {
      ...REQUIRED_ENV,
      NODE_ENV: "development",
    };
    envUtils = await loadEnvUtils();
    expect(envUtils.getServiceRoleKey()).toBeUndefined();
  });
});

describe("getAppUrl", () => {
  it("priority order is NEXT_PUBLIC_APP_URL > NEXT_PUBLIC_SITE_URL > APP_URL > localhost fallback (non-production)", async () => {
    process.env = {
      ...REQUIRED_ENV,
      NODE_ENV: "development",
      NEXT_PUBLIC_APP_URL: "https://app.enterprise.dev",
      NEXT_PUBLIC_SITE_URL: "https://site.enterprise.dev",
      APP_URL: "https://legacy.enterprise.dev",
    };
    let envUtils = await loadEnvUtils();
    expect(envUtils.getAppUrl()).toBe("https://app.enterprise.dev");

    process.env = {
      ...REQUIRED_ENV,
      NODE_ENV: "development",
      NEXT_PUBLIC_SITE_URL: "https://site.enterprise.dev",
      APP_URL: "https://legacy.enterprise.dev",
    };
    envUtils = await loadEnvUtils();
    expect(envUtils.getAppUrl()).toBe("https://site.enterprise.dev");

    process.env = {
      ...REQUIRED_ENV,
      NODE_ENV: "development",
      APP_URL: "https://legacy.enterprise.dev",
    };
    envUtils = await loadEnvUtils();
    expect(envUtils.getAppUrl()).toBe("https://legacy.enterprise.dev");

    process.env = {
      ...REQUIRED_ENV,
      NODE_ENV: "development",
    };
    envUtils = await loadEnvUtils();
    expect(envUtils.getAppUrl()).toBe("http://localhost:3000");
  });

  it("production accepts non-localhost canonical hostnames", async () => {
    process.env = {
      ...REQUIRED_ENV,
      NODE_ENV: "production",
      NEXT_PUBLIC_APP_URL: "https://app.enterprise.dev",
    };

    const { getAppUrl } = await loadEnvUtils();
    expect(getAppUrl()).toBe("https://app.enterprise.dev");
  });

  it("production rejects missing canonical URL and localhost-like URLs", async () => {
    process.env = {
      ...REQUIRED_ENV,
      NODE_ENV: "production",
    };

    let envUtils = await loadEnvUtils();
    expect(() => envUtils.getAppUrl()).toThrowError(
      "Missing canonical application URL in production",
    );

    process.env = {
      ...REQUIRED_ENV,
      NODE_ENV: "production",
      NEXT_PUBLIC_APP_URL: "http://localhost:3000",
    };

    envUtils = await loadEnvUtils();
    expect(() => envUtils.getAppUrl()).toThrowError("Localhost-style URLs are not allowed");
  });

  it("production can allow localhost-like URL when explicit override is enabled", async () => {
    process.env = {
      ...REQUIRED_ENV,
      NODE_ENV: "production",
      NEXT_PUBLIC_APP_URL: "http://127.0.0.1:3000",
      ALLOW_LOCALHOST_APP_URL_IN_PRODUCTION: "true",
    };

    const { getAppUrl } = await loadEnvUtils();
    expect(getAppUrl()).toBe("http://127.0.0.1:3000");
  });
});
