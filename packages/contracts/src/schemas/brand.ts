// Brand system schemas — single source of truth for brand identity configuration

import { z } from "zod";

// ============================================================================
// Logo variant — a single light or dark logo asset
// ============================================================================

export const brandLogoVariantSchema = z.object({
  /** Absolute path or full CDN URL for the logo image. Empty string triggers text fallback. */
  src: z.string(),
  /** Alt text for the <img> element — required for accessibility. */
  alt: z.string().min(1, "Logo alt text must not be empty"),
  /** Optional explicit width in pixels. Used to prevent layout shift. */
  width: z.number().int().positive().optional(),
  /** Optional explicit height in pixels. */
  height: z.number().int().positive().optional(),
});

// ============================================================================
// Logo — light + dark variants
// ============================================================================

export const brandLogoSchema = z.object({
  light: brandLogoVariantSchema,
  dark: brandLogoVariantSchema,
});

// ============================================================================
// Metadata — Open Graph and page title configuration
// ============================================================================

export const brandMetadataSchema = z.object({
  /**
   * Next.js title template. Use "%s" as the placeholder for the page title.
   * Example: "%s | Acme Platform"
   */
  titleTemplate: z.string().min(1),
  /**
   * Default page title used when no per-page title is set.
   * Also used for the home page <title> tag.
   */
  defaultTitle: z.string().min(1),
  /**
   * Default meta description. Used as og:description when no page-level
   * description is provided.
   */
  description: z.string().min(1),
  /**
   * Absolute path or full URL for the Open Graph image.
   * Used as og:image on all pages unless overridden per-page.
   */
  ogImage: z.string(),
});

// ============================================================================
// Legal — privacy policy and terms of service URLs
// ============================================================================

export const brandLegalSchema = z.object({
  /** Full URL to the privacy policy page. Empty string suppresses the link. */
  privacyUrl: z.string(),
  /** Full URL to the terms of service page. Empty string suppresses the link. */
  termsUrl: z.string(),
});

// ============================================================================
// Social links — optional external profile URLs
// ============================================================================

export const brandSocialSchema = z.object({
  /** Twitter / X profile URL */
  twitter: z.string().url().optional(),
  /** LinkedIn company page URL */
  linkedin: z.string().url().optional(),
  /** GitHub organization or user profile URL */
  github: z.string().url().optional(),
});

// ============================================================================
// BrandConfig — top-level schema
// ============================================================================

export const brandConfigSchema = z.object({
  /**
   * URL-safe unique identifier. Must be lowercase, alphanumeric with hyphens.
   * Used for subdomain matching, path prefix matching, and the BRAND_SLUG env var.
   * Example: "enterprise", "acme", "acme-eu"
   */
  slug: z
    .string()
    .min(1)
    .regex(
      /^[a-z0-9]+(?:-[a-z0-9]+)*$/,
      'Slug must be lowercase alphanumeric with optional hyphens (e.g. "acme-eu")',
    ),

  /**
   * Internal identifier used in audit events, Sentry tags, and log output.
   * Human-readable but not shown to end users.
   */
  name: z.string().min(1),

  /**
   * Human-readable brand name shown in UI headings, footers, and browser tabs.
   * Example: "Acme Platform", "Enterprise"
   */
  displayName: z.string().min(1),

  /**
   * Short description of the brand. Used in internal docs and meta tags
   * when no page-level description is provided.
   */
  description: z.string().min(1),

  /** Light and dark logo variants. */
  logo: brandLogoSchema,

  /**
   * Path or URL to the favicon asset.
   * Recommended: SVG or 32×32 ICO. Example: "/images/enterprise/favicon.svg"
   */
  favicon: z.string().min(1),

  /** Open Graph and page title configuration. */
  metadata: brandMetadataSchema,

  /** Legal link URLs for privacy policy and terms of service. */
  legal: brandLegalSchema,

  /** Optional external social profile links. */
  social: brandSocialSchema.optional(),

  /**
   * Key that references which theme JSON file to apply.
   * Must match the "metadata.name" field of a theme JSON in packages/ui/src/themes/.
   * Examples: "light", "dark", "acme-light"
   * The brand layer does not embed token values — it declares which token set to use.
   */
  themeRef: z.string().min(1),

  /**
   * Optional brand-scoped feature toggles.
   * Keys are feature names; values are boolean flags.
   * Example: { "showPoweredBy": true, "enablePublicApi": false }
   */
  features: z.record(z.string(), z.boolean()).optional(),

  /**
   * When true, this brand is returned as the fallback when no slug matches.
   * At most one brand in the registry should set this to true.
   * If no brand has isDefault=true, the "enterprise" slug is used as the default.
   */
  isDefault: z.boolean().optional(),
});

// ============================================================================
// Inferred TypeScript types
// ============================================================================

export type BrandConfig = z.infer<typeof brandConfigSchema>;
export type BrandLogoVariant = z.infer<typeof brandLogoVariantSchema>;
export type BrandLogo = z.infer<typeof brandLogoSchema>;
export type BrandMetadata = z.infer<typeof brandMetadataSchema>;
export type BrandLegal = z.infer<typeof brandLegalSchema>;
export type BrandSocial = z.infer<typeof brandSocialSchema>;
