import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { BrandConfig } from "@enterprise/contracts";

// ============================================================================
// Mock next/headers before importing resolve
// ============================================================================

vi.mock("next/headers", () => ({
  headers: vi.fn(),
}));

// ============================================================================
// Fixture factories
// ============================================================================

const baseLogoVariant = {
  src: "/images/enterprise/logo.svg",
  alt: "Enterprise Platform",
  width: 160,
  height: 32,
};

const baseLogo = {
  light: baseLogoVariant,
  dark: { ...baseLogoVariant, src: "/images/enterprise/logo-dark.svg" },
};

const baseMetadata = {
  titleTemplate: "%s | Enterprise Platform",
  defaultTitle: "Enterprise Platform",
  description: "Enterprise Platform template.",
  ogImage: "/images/enterprise/og-image.png",
};

const baseLegal = {
  privacyUrl: "https://example.com/privacy",
  termsUrl: "https://example.com/terms",
};

function makeBrand(overrides: Partial<BrandConfig> = {}): BrandConfig {
  return {
    slug: "enterprise",
    name: "enterprise",
    displayName: "Enterprise Platform",
    description: "Enterprise Platform template.",
    logo: baseLogo,
    favicon: "/images/enterprise/favicon.svg",
    metadata: baseMetadata,
    legal: baseLegal,
    themeRef: "light",
    isDefault: true,
    ...overrides,
  };
}

// ============================================================================
// Tests for resolveBrand()
// ============================================================================

describe("resolveBrand", () => {
  const originalEnv = process.env;

  beforeEach(() => {
    process.env = { ...originalEnv };
    vi.clearAllMocks();
  });

  afterEach(() => {
    process.env = originalEnv;
  });

  it("BRAND_SLUG env var forces the matching brand", async () => {
    process.env["BRAND_SLUG"] = "enterprise";

    const enterprise = makeBrand();
    const registry = new Map<string, BrandConfig>([["enterprise", enterprise]]);

    const { resolveBrandFromRegistry } = await import("../resolve");
    const result = await resolveBrandFromRegistry(registry, { host: "localhost", pathname: "/" });
    expect(result.slug).toBe("enterprise");
  });

  it("BRAND_SLUG env var overrides subdomain context", async () => {
    process.env["BRAND_SLUG"] = "enterprise";

    const enterprise = makeBrand();
    const acme = makeBrand({ slug: "acme", name: "acme", isDefault: false });
    const registry = new Map<string, BrandConfig>([
      ["enterprise", enterprise],
      ["acme", acme],
    ]);

    const { resolveBrandFromRegistry } = await import("../resolve");
    // even though host has acme subdomain, env var wins
    const result = await resolveBrandFromRegistry(registry, {
      host: "acme.platform.com",
      pathname: "/",
    });
    expect(result.slug).toBe("enterprise");
  });

  it("unknown BRAND_SLUG throws with available slugs listed", async () => {
    process.env["BRAND_SLUG"] = "unknown-brand";

    const enterprise = makeBrand();
    const registry = new Map<string, BrandConfig>([["enterprise", enterprise]]);

    const { resolveBrandFromRegistry } = await import("../resolve");
    await expect(
      resolveBrandFromRegistry(registry, { host: "localhost", pathname: "/" }),
    ).rejects.toThrow(/enterprise/);
  });

  it("subdomain resolves to matching brand", async () => {
    delete process.env["BRAND_SLUG"];

    const enterprise = makeBrand();
    const acme = makeBrand({ slug: "acme", name: "acme", isDefault: false });
    const registry = new Map<string, BrandConfig>([
      ["enterprise", enterprise],
      ["acme", acme],
    ]);

    const { resolveBrandFromRegistry } = await import("../resolve");
    const result = await resolveBrandFromRegistry(registry, {
      host: "acme.platform.com",
      pathname: "/",
    });
    expect(result.slug).toBe("acme");
  });

  it("unrecognized subdomain warns and falls back to default", async () => {
    delete process.env["BRAND_SLUG"];
    const warnSpy = vi.spyOn(console, "warn").mockImplementation(() => undefined);

    const enterprise = makeBrand();
    const registry = new Map<string, BrandConfig>([["enterprise", enterprise]]);

    const { resolveBrandFromRegistry } = await import("../resolve");
    const result = await resolveBrandFromRegistry(registry, {
      host: "unknown.platform.com",
      pathname: "/",
    });
    expect(result.slug).toBe("enterprise");
    expect(warnSpy).toHaveBeenCalledWith(expect.stringContaining("unknown"));

    warnSpy.mockRestore();
  });

  it("host with only 2 segments (no qualifying subdomain) falls back to default", async () => {
    delete process.env["BRAND_SLUG"];

    const enterprise = makeBrand();
    const registry = new Map<string, BrandConfig>([["enterprise", enterprise]]);

    const { resolveBrandFromRegistry } = await import("../resolve");
    const result = await resolveBrandFromRegistry(registry, {
      host: "platform.com",
      pathname: "/",
    });
    expect(result.slug).toBe("enterprise");
  });

  it("path prefix resolves to matching brand", async () => {
    delete process.env["BRAND_SLUG"];

    const enterprise = makeBrand();
    const acme = makeBrand({ slug: "acme", name: "acme", isDefault: false });
    const registry = new Map<string, BrandConfig>([
      ["enterprise", enterprise],
      ["acme", acme],
    ]);

    const { resolveBrandFromRegistry } = await import("../resolve");
    const result = await resolveBrandFromRegistry(registry, {
      host: "localhost",
      pathname: "/acme/dashboard",
    });
    expect(result.slug).toBe("acme");
  });

  it("static asset path /favicon.ico does not emit brand warning", async () => {
    delete process.env["BRAND_SLUG"];
    const warnSpy = vi.spyOn(console, "warn").mockImplementation(() => undefined);

    const enterprise = makeBrand();
    const registry = new Map<string, BrandConfig>([["enterprise", enterprise]]);

    const { resolveBrandFromRegistry } = await import("../resolve");
    await resolveBrandFromRegistry(registry, { host: "localhost", pathname: "/favicon.ico" });
    expect(warnSpy).not.toHaveBeenCalled();

    warnSpy.mockRestore();
  });

  it("unknown path prefix emits warn and falls back to default", async () => {
    delete process.env["BRAND_SLUG"];
    const warnSpy = vi.spyOn(console, "warn").mockImplementation(() => undefined);

    const enterprise = makeBrand();
    const registry = new Map<string, BrandConfig>([["enterprise", enterprise]]);

    const { resolveBrandFromRegistry } = await import("../resolve");
    const result = await resolveBrandFromRegistry(registry, {
      host: "localhost",
      pathname: "/unknown-brand/page",
    });
    expect(result.slug).toBe("enterprise");
    expect(warnSpy).toHaveBeenCalledWith(expect.stringContaining("unknown-brand"));

    warnSpy.mockRestore();
  });
});
