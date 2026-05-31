import type { BrandConfig } from "@enterprise/contracts";
import { describe, expect, it } from "vitest";
import { generateBrandMetadata } from "../metadata";

// ============================================================================
// Fixtures
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

const validMetadata = {
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
    metadata: validMetadata,
    legal: baseLegal,
    themeRef: "light",
    isDefault: true,
    ...overrides,
  };
}

// ============================================================================
// Tests
// ============================================================================

describe("generateBrandMetadata", () => {
  it("maps all fields correctly from a full BrandConfig", () => {
    const brand = makeBrand();
    const result = generateBrandMetadata(brand);

    expect(result.title).toEqual({
      template: "%s | Enterprise Platform",
      default: "Enterprise Platform",
    });
    expect(result.description).toBe("The enterprise-grade SaaS platform template.");
    expect(result.icons).toEqual({ icon: "/images/enterprise/favicon.svg" });
    expect(result.openGraph).toMatchObject({
      title: "Enterprise Platform",
      description: "The enterprise-grade SaaS platform template.",
      images: ["/images/enterprise/og-image.png"],
    });
  });

  it("sets openGraph.images = [] when ogImage is empty string", () => {
    const brand = makeBrand({
      metadata: { ...validMetadata, ogImage: "" },
    });
    const result = generateBrandMetadata(brand);
    expect(result.openGraph?.images).toEqual([]);
  });

  it("uses titleTemplate and defaultTitle for title object", () => {
    const brand = makeBrand({
      metadata: {
        ...validMetadata,
        titleTemplate: "%s | Acme",
        defaultTitle: "Acme Platform",
      },
    });
    const result = generateBrandMetadata(brand);
    expect(result.title).toEqual({
      template: "%s | Acme",
      default: "Acme Platform",
    });
  });

  it("uses brand favicon for icons.icon", () => {
    const brand = makeBrand({ favicon: "/acme/favicon.ico" });
    const result = generateBrandMetadata(brand);
    expect(result.icons).toEqual({ icon: "/acme/favicon.ico" });
  });
});
