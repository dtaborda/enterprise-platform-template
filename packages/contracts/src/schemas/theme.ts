// Theme system schemas — single source of truth for theme configuration shapes

import { z } from "zod";

// ============================================================================
// Semver regex: matches MAJOR.MINOR.PATCH (with optional pre-release/build)
// ============================================================================

const SEMVER_REGEX =
  /^(0|[1-9]\d*)\.(0|[1-9]\d*)\.(0|[1-9]\d*)(?:-((?:0|[1-9]\d*|\d*[a-zA-Z-][0-9a-zA-Z-]*)(?:\.(?:0|[1-9]\d*|\d*[a-zA-Z-][0-9a-zA-Z-]*))*))?(?:\+([0-9a-zA-Z-]+(?:\.[0-9a-zA-Z-]+)*))?$/;

// Hex color regex: #RGB, #RGBA, #RRGGBB, #RRGGBBAA (3, 4, 6, or 8 hex chars after #)
const HEX_COLOR_REGEX = /^#([0-9A-Fa-f]{3}|[0-9A-Fa-f]{4}|[0-9A-Fa-f]{6}|[0-9A-Fa-f]{8})$/;

// ============================================================================
// Theme Metadata
// ============================================================================

export const themeMetadataSchema = z.object({
  /** Display name of the theme */
  name: z.string().min(1),
  /** Semantic version string (e.g. "1.0.0") */
  version: z.string().regex(SEMVER_REGEX, "Version must be a valid semver (e.g. 1.0.0)"),
  /** Color scheme mode */
  mode: z.enum(["light", "dark"]),
  /** Optional human-readable description */
  description: z.string().optional(),
  /** Optional tenant UUID for tenant-specific themes */
  tenantId: z.string().uuid().optional(),
});

// ============================================================================
// Color Schemas
// ============================================================================

/** Primitive color palette — only valid hex values allowed */
export const primitiveColorSchema = z.record(
  z.string(),
  z.string().regex(HEX_COLOR_REGEX, "Primitive color must be a valid hex value (e.g. #22D3EE)"),
);

/** Semantic color mapping — accepts both hex values and {ref} token references */
export const semanticColorSchema = z.record(z.string(), z.string());

/** Combined colors structure */
export const colorsSchema = z.object({
  primitive: primitiveColorSchema,
  semantic: semanticColorSchema,
});

// ============================================================================
// Typography Schema
// ============================================================================

export const typographySchema = z.object({
  /** Font family stacks keyed by variant (e.g. "sans", "mono") */
  fontFamily: z.record(z.string(), z.string()),
  /** Font size values (e.g. "0.875rem") */
  fontSize: z.record(z.string(), z.string()),
  /** Font weight values — must be numeric */
  fontWeight: z.record(z.string(), z.number()),
  /** Line height values — must be numeric */
  lineHeight: z.record(z.string(), z.number()),
});

// ============================================================================
// Utility Token Schemas (spacing, sizing, radius, shadows, borders, breakpoints)
// ============================================================================

/** Generic string-keyed, string-valued token map */
const stringTokenMapSchema = z.record(z.string(), z.string());

// ============================================================================
// Theme Foundations
// ============================================================================

export const themeFoundationsSchema = z.object({
  colors: colorsSchema,
  typography: typographySchema,
  spacing: stringTokenMapSchema,
  sizing: stringTokenMapSchema,
  radius: stringTokenMapSchema,
  shadows: stringTokenMapSchema,
  borders: stringTokenMapSchema,
  breakpoints: stringTokenMapSchema,
  /** z-index values — must be numeric */
  zIndex: z.record(z.string(), z.number()),
});

// ============================================================================
// Theme Layout
// ============================================================================

export const themeLayoutSchema = z.object({
  container: z.object({
    maxWidth: z.string(),
    paddingX: z.string(),
    paddingXMobile: z.string(),
    sectionGap: z.string(),
  }),
  sidebar: z
    .object({
      width: z.string(),
      widthCollapsed: z.string(),
    })
    .optional(),
});

// ============================================================================
// Theme (top-level)
// ============================================================================

export const themeSchema = z.object({
  metadata: themeMetadataSchema,
  foundations: themeFoundationsSchema,
  layout: themeLayoutSchema,
});

// ============================================================================
// Inferred TypeScript Types
// ============================================================================

export type ThemeMode = z.infer<typeof themeMetadataSchema>["mode"];
export type ThemeMetadata = z.infer<typeof themeMetadataSchema>;
export type ThemeFoundations = z.infer<typeof themeFoundationsSchema>;
export type ThemeLayout = z.infer<typeof themeLayoutSchema>;
export type ThemeConfig = z.infer<typeof themeSchema>;
