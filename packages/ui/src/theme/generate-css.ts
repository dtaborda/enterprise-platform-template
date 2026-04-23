import type { ResolvedTheme } from "@enterprise/contracts";

// ============================================================================
// Helpers
// ============================================================================

/**
 * Convert camelCase to kebab-case.
 * e.g. "primaryForeground" → "primary-foreground"
 *      "surfaceContainerHigh" → "surface-container-high"
 */
function camelToKebab(str: string): string {
  return str.replace(/([A-Z])/g, (match) => `-${match.toLowerCase()}`);
}

/**
 * Format a CSS custom property declaration with indent.
 */
function cssVar(name: string, value: string, indent = "  "): string {
  return `${indent}${name}: ${value};`;
}

// ============================================================================
// Color token generation
// ============================================================================

/**
 * Normalize a CSS value — lowercase hex color strings for consistent output.
 * Non-hex values are returned as-is.
 */
function normalizeValue(value: string): string {
  return value.replace(/#([0-9A-F]{3,8})\b/gi, (_, hex: string) => `#${hex.toLowerCase()}`);
}

/**
 * Generate --color-* CSS variables from semantic color map.
 * camelCase keys are converted to kebab-case. Hex values are lowercased.
 */
function generateColorVars(semantic: Record<string, string>, indent = "  "): string[] {
  return Object.entries(semantic).map(([key, value]) => {
    const cssName = `--color-${camelToKebab(key)}`;
    return cssVar(cssName, normalizeValue(value), indent);
  });
}

// ============================================================================
// @theme block generation
// ============================================================================

function generateThemeBlock(light: ResolvedTheme): string {
  const lines: string[] = [];

  lines.push("@theme {");

  // ── Colors (semantic) ──────────────────────────────────────────────────────
  lines.push("  /* ─── Color tokens ─── */");
  lines.push(...generateColorVars(light.foundations.colors.semantic));

  // ── Typography ─────────────────────────────────────────────────────────────
  lines.push("");
  lines.push("  /* ─── Typography ─── */");

  for (const [key, value] of Object.entries(light.foundations.typography.fontFamily)) {
    lines.push(cssVar(`--font-${camelToKebab(key)}`, value));
  }

  // Font aliases — resolved to actual font family values (not var() refs)
  const headingFamily = light.foundations.typography.fontFamily["heading"] ?? "";
  const displayFamily = light.foundations.typography.fontFamily["display"] ?? "";
  if (headingFamily) {
    lines.push(cssVar("--font-headline", headingFamily));
  }
  if (displayFamily) {
    lines.push(cssVar("--font-label", displayFamily));
  }

  for (const [key, value] of Object.entries(light.foundations.typography.fontSize)) {
    lines.push(cssVar(`--font-size-${camelToKebab(key)}`, value));
  }

  // ── Radius ─────────────────────────────────────────────────────────────────
  lines.push("");
  lines.push("  /* ─── Radius ─── */");
  for (const [key, value] of Object.entries(light.foundations.radius)) {
    lines.push(cssVar(`--radius-${camelToKebab(key)}`, value));
  }

  // ── Shadows ────────────────────────────────────────────────────────────────
  lines.push("");
  lines.push("  /* ─── Shadows ─── */");
  for (const [key, value] of Object.entries(light.foundations.shadows)) {
    const tokenKey = key === "DEFAULT" ? "shadow" : `shadow-${camelToKebab(key)}`;
    lines.push(cssVar(`--${tokenKey}`, value));
  }

  // ── Spacing ────────────────────────────────────────────────────────────────
  lines.push("");
  lines.push("  /* ─── Spacing ─── */");
  for (const [key, value] of Object.entries(light.foundations.spacing)) {
    lines.push(cssVar(`--spacing-${camelToKebab(key)}`, value));
  }

  // ── Layout ─────────────────────────────────────────────────────────────────
  lines.push("");
  lines.push("  /* ─── Layout ─── */");
  lines.push(cssVar("--container-max-width", light.layout.container.maxWidth));
  lines.push(cssVar("--container-padding-x", light.layout.container.paddingX));
  lines.push(cssVar("--container-padding-x-mobile", light.layout.container.paddingXMobile));
  lines.push(cssVar("--container-section-gap", light.layout.container.sectionGap));

  if (light.layout.sidebar) {
    lines.push(cssVar("--sidebar-width", light.layout.sidebar.width));
    lines.push(cssVar("--sidebar-width-collapsed", light.layout.sidebar.widthCollapsed));
  }

  lines.push("}");

  return lines.join("\n");
}

// ============================================================================
// [data-theme="dark"] block generation — ONLY color overrides
// ============================================================================

function generateDarkBlock(dark: ResolvedTheme): string {
  const lines: string[] = [];

  lines.push('[data-theme="dark"] {');
  lines.push("  /* ─── Dark mode color overrides ─── */");
  lines.push(...generateColorVars(dark.foundations.colors.semantic));
  lines.push("}");

  return lines.join("\n");
}

// ============================================================================
// Public API
// ============================================================================

/**
 * Generate a complete CSS string from resolved light and dark themes.
 *
 * Output structure:
 *   - AUTO-GENERATED header comment with timestamp
 *   - @theme { } block with ALL light tokens (colors + typography + radius + shadows + spacing + layout)
 *   - [data-theme="dark"] { } block with ONLY dark color overrides
 *
 * Rules:
 *   - Typography, radius, spacing, shadows, layout are mode-independent (only in @theme)
 *   - No --animate-* tokens are generated (those stay in globals.css)
 *   - Font aliases (--font-headline, --font-label) resolve to actual font-family strings
 *   - Sidebar layout tokens (--sidebar-width, --sidebar-width-collapsed) are included
 */
export function generateCSS(light: ResolvedTheme, dark: ResolvedTheme): string {
  const timestamp = new Date().toISOString();

  const header = [
    "/*",
    " * AUTO-GENERATED — Do not edit manually.",
    ` * Generated: ${timestamp}`,
    " * Source: packages/ui/src/themes/{light,dark}.json",
    " * Run `pnpm build:theme` to regenerate.",
    " */",
  ].join("\n");

  const themeBlock = generateThemeBlock(light);
  const darkBlock = generateDarkBlock(dark);

  return [header, "", themeBlock, "", darkBlock, ""].join("\n");
}
