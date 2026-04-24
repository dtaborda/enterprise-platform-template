/**
 * Migration Parity Test — T3.3
 *
 * Safety net: verifies that theme-generated.css correctly produces
 * the full set of dark theme tokens matching the original globals.css values,
 * and that globals.css now imports theme-generated.css instead of
 * embedding inline @theme tokens.
 *
 * The dark theme values that were formerly in globals.css @theme block
 * must now appear in [data-theme="dark"] in theme-generated.css.
 *
 * These are the canonical dark mode hex values:
 */
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

// Path helpers
const UI_SRC = join(__dirname, "../..");
const GLOBALS_CSS = join(UI_SRC, "styles/globals.css");
const THEME_GENERATED_CSS = join(UI_SRC, "styles/theme-generated.css");

// ============================================================================
// The canonical dark theme tokens from the ORIGINAL globals.css @theme block
// These values MUST appear in [data-theme="dark"] in theme-generated.css
// ============================================================================

const CANONICAL_DARK_TOKENS: Record<string, string> = {
  "--color-background": "#111318",
  "--color-foreground": "#e2e2e8",
  "--color-card": "#1a1c20",
  "--color-card-foreground": "#e2e2e8",
  "--color-popover": "#1e2024",
  "--color-popover-foreground": "#e2e2e8",
  "--color-primary": "#00e5ff",
  "--color-primary-foreground": "#00626e",
  "--color-secondary": "#5203d5",
  "--color-secondary-foreground": "#c0acff",
  "--color-muted": "#282a2e",
  "--color-muted-foreground": "#bac9cc",
  "--color-accent": "#333539",
  "--color-accent-foreground": "#e2e2e8",
  "--color-destructive": "#ffb4ab",
  "--color-destructive-foreground": "#690005",
  "--color-border": "#3b494c",
  "--color-input": "#333539",
  "--color-ring": "#00e5ff",
  "--color-surface-dim": "#111318",
  "--color-surface-container-lowest": "#0c0e12",
  "--color-surface-container-low": "#1a1c20",
  "--color-surface-container": "#1e2024",
  "--color-surface-container-high": "#282a2e",
  "--color-surface-container-highest": "#333539",
  "--color-surface-bright": "#37393e",
  "--color-primary-fixed-dim": "#00daf3",
  "--color-primary-fixed": "#9cf0ff",
  "--color-primary-container": "#00e5ff",
  "--color-on-primary-container": "#00626e",
  "--color-secondary-container": "#5203d5",
  "--color-on-secondary-container": "#c0acff",
  "--color-tertiary": "#ffe7ea",
  "--color-tertiary-container": "#ffc0cc",
  "--color-on-tertiary-container": "#b1004f",
  "--color-error": "#ffb4ab",
  "--color-error-container": "#93000a",
  "--color-on-error-container": "#ffdad6",
  "--color-outline": "#849396",
  "--color-outline-variant": "#3b494c",
  "--color-inverse-surface": "#e2e2e8",
  "--color-inverse-on-surface": "#2f3035",
  "--color-success": "#4ade80",
  "--color-warning": "#fbbf24",
  "--color-info": "#00daf3",
};

const CANONICAL_RADIUS_TOKENS: Record<string, string> = {
  "--radius-sm": "0.25rem",
  "--radius-md": "0.5rem",
  "--radius-lg": "0.75rem",
  "--radius-xl": "1rem",
  "--radius-2xl": "1rem",
};

// ============================================================================
// Helpers
// ============================================================================

/**
 * Parse CSS custom property declarations from a string block.
 * Returns a map of "--token-name" → "value".
 */
function parseCssVars(cssBlock: string): Map<string, string> {
  const map = new Map<string, string>();
  const re = /(--[\w-]+)\s*:\s*([^;]+);/g;
  for (const match of cssBlock.matchAll(re)) {
    const name = match[1]?.trim();
    const value = match[2]?.trim();
    if (name && value) {
      map.set(name, value);
    }
  }
  return map;
}

/**
 * Extract content inside an @theme { } block from CSS.
 */
function extractThemeBlock(css: string): string {
  const match = /@theme\s*\{([^}]*(?:\{[^}]*\}[^}]*)*)\}/s.exec(css);
  return match?.[1] ?? "";
}

/**
 * Extract content inside [data-theme="dark"] { } block from CSS.
 */
function extractDarkBlock(css: string): string {
  const match = /\[data-theme="dark"\]\s*\{([^}]+)\}/s.exec(css);
  return match?.[1] ?? "";
}

// ============================================================================
// Tests
// ============================================================================

describe("Migration Parity — globals.css swap + theme-generated.css correctness", () => {
  it("globals.css imports theme-generated.css (swap complete)", () => {
    const globals = readFileSync(GLOBALS_CSS, "utf-8");
    expect(globals).toContain('@import "./theme-generated.css"');
  });

  it("globals.css does NOT contain inline color tokens (migrated to theme-generated.css)", () => {
    const globals = readFileSync(GLOBALS_CSS, "utf-8");
    // Should not have color token definitions inline anymore
    expect(globals).not.toContain("--color-background: #111318");
    expect(globals).not.toContain("--color-primary: #00e5ff");
  });

  it("globals.css still has @keyframes fadeInUp", () => {
    const globals = readFileSync(GLOBALS_CSS, "utf-8");
    expect(globals).toContain("@keyframes fadeInUp");
  });

  it("globals.css still has --animate-fade-in-up in @theme block", () => {
    const globals = readFileSync(GLOBALS_CSS, "utf-8");
    expect(globals).toContain("--animate-fade-in-up");
  });

  it("globals.css has color-scheme: light dark (both modes supported)", () => {
    const globals = readFileSync(GLOBALS_CSS, "utf-8");
    expect(globals).toContain("color-scheme: light dark");
  });

  it("theme-generated.css exists and has content", () => {
    const css = readFileSync(THEME_GENERATED_CSS, "utf-8");
    expect(css.length).toBeGreaterThan(0);
  });

  it("theme-generated.css has AUTO-GENERATED header", () => {
    const css = readFileSync(THEME_GENERATED_CSS, "utf-8");
    expect(css).toContain("AUTO-GENERATED");
  });

  it("theme-generated.css has @theme block (light defaults)", () => {
    const css = readFileSync(THEME_GENERATED_CSS, "utf-8");
    expect(css).toContain("@theme {");
  });

  it('theme-generated.css has [data-theme="dark"] block', () => {
    const css = readFileSync(THEME_GENERATED_CSS, "utf-8");
    expect(css).toContain('[data-theme="dark"]');
  });

  it('every canonical dark token is present in [data-theme="dark"] with correct value', () => {
    const generated = readFileSync(THEME_GENERATED_CSS, "utf-8");
    const darkBlockContent = extractDarkBlock(generated);
    const darkVars = parseCssVars(darkBlockContent);

    const mismatches: string[] = [];

    for (const [token, expectedValue] of Object.entries(CANONICAL_DARK_TOKENS)) {
      const actualValue = darkVars.get(token);
      if (actualValue?.toLowerCase() !== expectedValue.toLowerCase()) {
        mismatches.push(
          `  ${token}:\n    expected = ${expectedValue}\n    actual   = ${actualValue ?? "undefined"}`,
        );
      }
    }

    if (mismatches.length > 0) {
      throw new Error(
        `${mismatches.length} token mismatch(es) in [data-theme="dark"]:\n${mismatches.join("\n")}`,
      );
    }
  });

  it("canonical radius tokens are present in @theme block of theme-generated.css", () => {
    const generated = readFileSync(THEME_GENERATED_CSS, "utf-8");
    const themeContent = extractThemeBlock(generated);
    const generatedVars = parseCssVars(themeContent);

    const mismatches: string[] = [];

    for (const [token, expectedValue] of Object.entries(CANONICAL_RADIUS_TOKENS)) {
      const actualValue = generatedVars.get(token);
      if (actualValue !== expectedValue) {
        mismatches.push(
          `  ${token}:\n    expected = ${expectedValue}\n    actual   = ${actualValue ?? "undefined"}`,
        );
      }
    }

    if (mismatches.length > 0) {
      throw new Error(`${mismatches.length} radius token mismatch(es):\n${mismatches.join("\n")}`);
    }
  });

  it("sidebar layout tokens are in @theme block of theme-generated.css", () => {
    const generated = readFileSync(THEME_GENERATED_CSS, "utf-8");
    const themeContent = extractThemeBlock(generated);
    const generatedVars = parseCssVars(themeContent);

    expect(generatedVars.get("--sidebar-width")).toBe("256px");
    expect(generatedVars.get("--sidebar-width-collapsed")).toBe("56px");
  });

  it("--animate-* tokens are NOT in theme-generated.css (stay in globals.css)", () => {
    const generated = readFileSync(THEME_GENERATED_CSS, "utf-8");
    expect(generated).not.toContain("--animate-");
    expect(generated).not.toContain("fadeInUp");
  });

  it("font aliases use resolved values (not var() references)", () => {
    const generated = readFileSync(THEME_GENERATED_CSS, "utf-8");
    const themeContent = extractThemeBlock(generated);
    const vars = parseCssVars(themeContent);

    const headline = vars.get("--font-headline");
    const label = vars.get("--font-label");

    expect(headline).toBeDefined();
    expect(label).toBeDefined();
    expect(headline).not.toContain("var(");
    expect(label).not.toContain("var(");
  });
});
