import { describe, expect, it } from "vitest";
import type { BrandConfig } from "@enterprise/contracts";

// ============================================================================
// Fixture brand configs
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
  description: "The enterprise-grade SaaS platform template.",
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
    description: "The enterprise-grade SaaS platform template.",
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
// Tests for buildRegistry() and related helpers
// ============================================================================

describe("buildRegistry", () => {
  it("builds a registry with a single valid brand", async () => {
    const { buildRegistry } = await import("../registry");
    const brand = makeBrand();
    const registry = buildRegistry([brand]);
    expect(registry.size).toBe(1);
    expect(registry.get("enterprise")).toEqual(brand);
  });

  it("builds a registry with multiple valid brands", async () => {
    const { buildRegistry } = await import("../registry");
    const acme = makeBrand({ slug: "acme", name: "acme", isDefault: false });
    const enterprise = makeBrand();
    const registry = buildRegistry([enterprise, acme]);
    expect(registry.size).toBe(2);
    expect(registry.has("acme")).toBe(true);
  });

  it("throws on duplicate slug", async () => {
    const { buildRegistry } = await import("../registry");
    const brand1 = makeBrand();
    const brand2 = makeBrand({ name: "enterprise-copy" });
    expect(() => buildRegistry([brand1, brand2])).toThrow(/duplicate/i);
  });
});

describe("getDefaultBrand", () => {
  it("returns the brand with isDefault=true", async () => {
    const { getDefaultBrand } = await import("../registry");
    const acme = makeBrand({ slug: "acme", name: "acme", isDefault: false });
    const enterprise = makeBrand({ isDefault: true });
    const registry = new Map<string, BrandConfig>([
      ["acme", acme],
      ["enterprise", enterprise],
    ]);
    expect(getDefaultBrand(registry).slug).toBe("enterprise");
  });

  it("falls back to 'enterprise' slug when no isDefault is declared", async () => {
    const { getDefaultBrand } = await import("../registry");
    const enterprise = makeBrand({ isDefault: undefined });
    const registry = new Map<string, BrandConfig>([["enterprise", enterprise]]);
    expect(getDefaultBrand(registry).slug).toBe("enterprise");
  });

  it("throws when no brands are registered", async () => {
    const { getDefaultBrand } = await import("../registry");
    const empty = new Map<string, BrandConfig>();
    expect(() => getDefaultBrand(empty)).toThrow();
  });

  it("throws when no isDefault and no 'enterprise' slug", async () => {
    const { getDefaultBrand } = await import("../registry");
    const acme = makeBrand({ slug: "acme", name: "acme", isDefault: undefined });
    const registry = new Map<string, BrandConfig>([["acme", acme]]);
    expect(() => getDefaultBrand(registry)).toThrow(/enterprise/i);
  });
});

describe("getBrandBySlug", () => {
  it("returns brand for matching slug", async () => {
    const { getBrandBySlug } = await import("../registry");
    const brand = makeBrand();
    const registry = new Map<string, BrandConfig>([["enterprise", brand]]);
    expect(getBrandBySlug(registry, "enterprise")).toEqual(brand);
  });

  it("returns undefined for unknown slug", async () => {
    const { getBrandBySlug } = await import("../registry");
    const registry = new Map<string, BrandConfig>();
    expect(getBrandBySlug(registry, "unknown")).toBeUndefined();
  });
});

describe("getAllBrands", () => {
  it("returns all registered brands as array", async () => {
    const { getAllBrands } = await import("../registry");
    const brand = makeBrand();
    const acme = makeBrand({ slug: "acme", name: "acme", isDefault: false });
    const registry = new Map<string, BrandConfig>([
      ["enterprise", brand],
      ["acme", acme],
    ]);
    expect(getAllBrands(registry)).toHaveLength(2);
  });
});
