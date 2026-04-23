import type { ResolvedTheme } from "@enterprise/contracts";

// ============================================================================
// Helpers
// ============================================================================

/**
 * Convert camelCase to kebab-case.
 * e.g. "primaryForeground" → "primary-foreground"
 */
function camelToKebab(str: string): string {
  return str.replace(/([A-Z])/g, (match) => `-${match.toLowerCase()}`);
}

/**
 * Indent each line of a multi-line string.
 */
function indent(str: string, spaces = 2): string {
  return str
    .split("\n")
    .map((line) => (line.trim() === "" ? "" : " ".repeat(spaces) + line))
    .join("\n");
}

/**
 * Generate a TypeScript object literal body from a record of key → CSS var strings.
 */
function objectBody(entries: [string, string][]): string {
  const lines = entries.map(([key, varName]) => {
    // Quote keys that start with a digit or contain special chars
    const safeKey = /^[a-zA-Z_$][a-zA-Z0-9_$]*$/.test(key) ? key : JSON.stringify(key);
    return `${safeKey}: "${varName}",`;
  });
  return lines.join("\n");
}

// ============================================================================
// Section generators
// ============================================================================

function generateColorsSection(semantic: Record<string, string>): string {
  const entries: [string, string][] = Object.keys(semantic).map((key) => [
    key,
    `var(--color-${camelToKebab(key)})`,
  ]);
  return `export const colors = {\n${indent(objectBody(entries))}\n} as const;`;
}

function generateTypographySection(typography: ResolvedTheme["foundations"]["typography"]): string {
  const fontFamilyEntries: [string, string][] = Object.keys(typography.fontFamily).map((key) => [
    key,
    `var(--font-${camelToKebab(key)})`,
  ]);
  const fontSizeEntries: [string, string][] = Object.keys(typography.fontSize).map((key) => [
    key,
    `var(--font-size-${camelToKebab(key)})`,
  ]);

  const fontFamilyBody = objectBody(fontFamilyEntries);
  const fontSizeBody = objectBody(fontSizeEntries);

  return [
    "export const typography = {",
    `  fontFamily: {\n${indent(fontFamilyBody, 4)}\n  } as const,`,
    `  fontSize: {\n${indent(fontSizeBody, 4)}\n  } as const,`,
    "} as const;",
  ].join("\n");
}

function generateSpacingSection(spacing: Record<string, string>): string {
  const entries: [string, string][] = Object.keys(spacing).map((key) => [
    key,
    `var(--spacing-${camelToKebab(key)})`,
  ]);
  return `export const spacing = {\n${indent(objectBody(entries))}\n} as const;`;
}

function generateRadiusSection(radius: Record<string, string>): string {
  const entries: [string, string][] = Object.keys(radius).map((key) => [
    key,
    `var(--radius-${camelToKebab(key)})`,
  ]);
  return `export const radius = {\n${indent(objectBody(entries))}\n} as const;`;
}

function generateShadowsSection(shadows: Record<string, string>): string {
  const entries: [string, string][] = Object.keys(shadows).map((key) => {
    const varName = key === "DEFAULT" ? "var(--shadow)" : `var(--shadow-${camelToKebab(key)})`;
    return [key, varName];
  });
  return `export const shadows = {\n${indent(objectBody(entries))}\n} as const;`;
}

function generateZIndexSection(zIndex: Record<string, number>): string {
  const entries: [string, string][] = Object.keys(zIndex).map((key) => [
    key,
    `var(--z-${camelToKebab(key)})`,
  ]);
  return `export const zIndex = {\n${indent(objectBody(entries))}\n} as const;`;
}

// ============================================================================
// Public API
// ============================================================================

/**
 * Generate a TypeScript source string containing named `as const` exports for
 * all design token categories. Each value is a CSS variable reference string
 * (e.g. `var(--color-primary)`).
 *
 * Output contains NO default export.
 */
export function generateTokens(resolved: ResolvedTheme): string {
  const timestamp = new Date().toISOString();

  const header = [
    "/**",
    " * AUTO-GENERATED — Do not edit manually.",
    ` * Generated: ${timestamp}`,
    " * Source: packages/ui/src/themes/light.json",
    " * Run `pnpm build:theme` to regenerate.",
    " */",
  ].join("\n");

  const colorsSection = generateColorsSection(resolved.foundations.colors.semantic);
  const typographySection = generateTypographySection(resolved.foundations.typography);
  const spacingSection = generateSpacingSection(resolved.foundations.spacing);
  const radiusSection = generateRadiusSection(resolved.foundations.radius);
  const shadowsSection = generateShadowsSection(resolved.foundations.shadows);
  const zIndexSection = generateZIndexSection(resolved.foundations.zIndex);

  const tokensComposite = [
    "export const tokens = {",
    "  colors,",
    "  typography,",
    "  spacing,",
    "  radius,",
    "  shadows,",
    "  zIndex,",
    "} as const;",
  ].join("\n");

  return [
    header,
    "",
    colorsSection,
    "",
    typographySection,
    "",
    spacingSection,
    "",
    radiusSection,
    "",
    shadowsSection,
    "",
    zIndexSection,
    "",
    tokensComposite,
    "",
  ].join("\n");
}
