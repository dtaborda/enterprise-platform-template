import { describe, expect, it } from "vitest";
import {
  brandConfigSchema,
  brandLegalSchema,
  brandLogoSchema,
  brandLogoVariantSchema,
  brandMetadataSchema,
  brandSocialSchema,
} from "../schemas/brand";

// ============================================================================
// Shared fixtures
// ============================================================================

const validLogoVariant = {
  src: "/images/enterprise/logo-light.svg",
  alt: "Enterprise Platform",
  width: 160,
  height: 32,
} as const;

const validLogo = {
  light: validLogoVariant,
  dark: { ...validLogoVariant, src: "/images/enterprise/logo-dark.svg" },
} as const;

const validMetadata = {
  titleTemplate: "%s | Enterprise Platform",
  defaultTitle: "Enterprise Platform",
  description: "The enterprise-grade SaaS platform template.",
  ogImage: "/images/enterprise/og-image.png",
} as const;

const validLegal = {
  privacyUrl: "https://example.com/privacy",
  termsUrl: "https://example.com/terms",
} as const;

const validSocial = {
  github: "https://github.com/your-org",
  twitter: "https://twitter.com/your-org",
  linkedin: "https://linkedin.com/company/your-org",
} as const;

const validFullConfig = {
  slug: "enterprise",
  name: "enterprise",
  displayName: "Enterprise Platform",
  description: "The enterprise-grade SaaS platform template.",
  logo: validLogo,
  favicon: "/images/enterprise/favicon.svg",
  metadata: validMetadata,
  legal: validLegal,
  social: validSocial,
  themeRef: "light",
  features: { showPoweredBy: true },
  isDefault: true,
} as const;

const validMinimalConfig = {
  slug: "enterprise",
  name: "enterprise",
  displayName: "Enterprise Platform",
  description: "The enterprise-grade SaaS platform template.",
  logo: validLogo,
  favicon: "/images/enterprise/favicon.svg",
  metadata: validMetadata,
  legal: validLegal,
  themeRef: "light",
} as const;

// ============================================================================
// brandLogoVariantSchema
// ============================================================================

describe("brandLogoVariantSchema", () => {
  it("accepts a valid logo variant", () => {
    expect(brandLogoVariantSchema.safeParse(validLogoVariant).success).toBe(true);
  });

  it("accepts empty src (text fallback)", () => {
    expect(brandLogoVariantSchema.safeParse({ src: "", alt: "Logo" }).success).toBe(true);
  });

  it("rejects missing alt text", () => {
    const result = brandLogoVariantSchema.safeParse({ src: "/logo.svg", alt: "" });
    expect(result.success).toBe(false);
  });

  it("rejects negative width", () => {
    const result = brandLogoVariantSchema.safeParse({ src: "/logo.svg", alt: "Logo", width: -1 });
    expect(result.success).toBe(false);
  });
});

// ============================================================================
// brandLogoSchema
// ============================================================================

describe("brandLogoSchema", () => {
  it("accepts valid light + dark variants", () => {
    expect(brandLogoSchema.safeParse(validLogo).success).toBe(true);
  });

  it("rejects missing dark variant", () => {
    const result = brandLogoSchema.safeParse({ light: validLogoVariant });
    expect(result.success).toBe(false);
  });
});

// ============================================================================
// brandMetadataSchema
// ============================================================================

describe("brandMetadataSchema", () => {
  it("accepts valid metadata", () => {
    expect(brandMetadataSchema.safeParse(validMetadata).success).toBe(true);
  });

  it("rejects empty titleTemplate", () => {
    const result = brandMetadataSchema.safeParse({ ...validMetadata, titleTemplate: "" });
    expect(result.success).toBe(false);
  });

  it("rejects empty defaultTitle", () => {
    const result = brandMetadataSchema.safeParse({ ...validMetadata, defaultTitle: "" });
    expect(result.success).toBe(false);
  });

  it("accepts empty ogImage (optional URL)", () => {
    const result = brandMetadataSchema.safeParse({ ...validMetadata, ogImage: "" });
    expect(result.success).toBe(true);
  });
});

// ============================================================================
// brandLegalSchema
// ============================================================================

describe("brandLegalSchema", () => {
  it("accepts valid legal URLs", () => {
    expect(brandLegalSchema.safeParse(validLegal).success).toBe(true);
  });

  it("accepts empty strings (suppresses links)", () => {
    const result = brandLegalSchema.safeParse({ privacyUrl: "", termsUrl: "" });
    expect(result.success).toBe(true);
  });
});

// ============================================================================
// brandSocialSchema
// ============================================================================

describe("brandSocialSchema", () => {
  it("accepts valid social URLs", () => {
    expect(brandSocialSchema.safeParse(validSocial).success).toBe(true);
  });

  it("accepts empty object (all optional)", () => {
    expect(brandSocialSchema.safeParse({}).success).toBe(true);
  });

  it("rejects invalid twitter URL", () => {
    const result = brandSocialSchema.safeParse({ twitter: "not-a-url" });
    expect(result.success).toBe(false);
    if (!result.success) {
      const paths = result.error.issues.map((i) => i.path.join("."));
      expect(paths).toContain("twitter");
    }
  });

  it("rejects invalid linkedin URL", () => {
    const result = brandSocialSchema.safeParse({ linkedin: "not-a-url" });
    expect(result.success).toBe(false);
  });
});

// ============================================================================
// brandConfigSchema — full contract tests
// ============================================================================

describe("brandConfigSchema", () => {
  it("accepts a valid full config", () => {
    const result = brandConfigSchema.safeParse(validFullConfig);
    expect(result.success).toBe(true);
  });

  it("accepts a minimal config (only required fields)", () => {
    const result = brandConfigSchema.safeParse(validMinimalConfig);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.social).toBeUndefined();
      expect(result.data.features).toBeUndefined();
      expect(result.data.isDefault).toBeUndefined();
    }
  });

  it("rejects invalid slug (spaces)", () => {
    const result = brandConfigSchema.safeParse({ ...validMinimalConfig, slug: "My Brand" });
    expect(result.success).toBe(false);
    if (!result.success) {
      const paths = result.error.issues.map((i) => i.path.join("."));
      expect(paths).toContain("slug");
    }
  });

  it("rejects invalid slug (uppercase)", () => {
    const result = brandConfigSchema.safeParse({ ...validMinimalConfig, slug: "Enterprise" });
    expect(result.success).toBe(false);
  });

  it("rejects empty slug", () => {
    const result = brandConfigSchema.safeParse({ ...validMinimalConfig, slug: "" });
    expect(result.success).toBe(false);
    if (!result.success) {
      const paths = result.error.issues.map((i) => i.path.join("."));
      expect(paths).toContain("slug");
    }
  });

  it("rejects missing nested field logo.light.alt", () => {
    const badLogo = {
      light: { src: "/logo.svg", alt: "" },
      dark: { src: "/logo-dark.svg", alt: "Logo" },
    };
    const result = brandConfigSchema.safeParse({ ...validMinimalConfig, logo: badLogo });
    expect(result.success).toBe(false);
    if (!result.success) {
      const paths = result.error.issues.map((i) => i.path.join("."));
      expect(paths.some((p) => p.includes("logo"))).toBe(true);
    }
  });

  it("rejects features with non-boolean value", () => {
    const result = brandConfigSchema.safeParse({
      ...validMinimalConfig,
      features: { enabled: 1 },
    });
    expect(result.success).toBe(false);
  });

  it("rejects social.twitter with invalid URL", () => {
    const result = brandConfigSchema.safeParse({
      ...validMinimalConfig,
      social: { twitter: "not-a-url" },
    });
    expect(result.success).toBe(false);
    if (!result.success) {
      const paths = result.error.issues.map((i) => i.path.join("."));
      expect(paths.some((p) => p.includes("twitter"))).toBe(true);
    }
  });

  it("rejects empty themeRef", () => {
    const result = brandConfigSchema.safeParse({ ...validMinimalConfig, themeRef: "" });
    expect(result.success).toBe(false);
  });

  it("rejects empty metadata.titleTemplate", () => {
    const result = brandConfigSchema.safeParse({
      ...validMinimalConfig,
      metadata: { ...validMetadata, titleTemplate: "" },
    });
    expect(result.success).toBe(false);
  });
});
