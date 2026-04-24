import type { ResolvedTheme } from "@enterprise/contracts";
import { describe, expect, it } from "vitest";
import { generateCSS } from "../generate-css";

// ============================================================================
// Fixtures
// ============================================================================

function makeResolvedTheme(mode: "light" | "dark" = "dark"): ResolvedTheme {
  return {
    metadata: { name: "Enterprise Theme", version: "1.0.0", mode },
    foundations: {
      colors: {
        primitive: {
          cyan400: "#22D3EE",
          cyan500: "#06B6D4",
          navy900: "#111318",
          white: "#FFFFFF",
        },
        semantic: {
          // 19 core shadcn tokens
          background: "#111318",
          foreground: "#e2e2e8",
          card: "#1a1c20",
          cardForeground: "#e2e2e8",
          popover: "#1e2024",
          popoverForeground: "#e2e2e8",
          primary: "#00e5ff",
          primaryForeground: "#00626e",
          secondary: "#5203d5",
          secondaryForeground: "#c0acff",
          muted: "#282a2e",
          mutedForeground: "#bac9cc",
          accent: "#333539",
          accentForeground: "#e2e2e8",
          destructive: "#ffb4ab",
          destructiveForeground: "#690005",
          border: "#3b494c",
          input: "#333539",
          ring: "#00e5ff",
          // Extended tokens
          surfaceDim: "#111318",
          surfaceContainerLowest: "#0c0e12",
          surfaceContainerLow: "#1a1c20",
          surfaceContainer: "#1e2024",
          surfaceContainerHigh: "#282a2e",
          surfaceContainerHighest: "#333539",
          surfaceBright: "#37393e",
          primaryFixedDim: "#00daf3",
          primaryFixed: "#9cf0ff",
          primaryContainer: "#00e5ff",
          onPrimaryContainer: "#00626e",
          secondaryContainer: "#5203d5",
          onSecondaryContainer: "#c0acff",
          tertiary: "#ffe7ea",
          tertiaryContainer: "#ffc0cc",
          onTertiaryContainer: "#b1004f",
          errorContainer: "#93000a",
          onErrorContainer: "#ffdad6",
          outline: "#849396",
          outlineVariant: "#3b494c",
          inverseSurface: "#e2e2e8",
          inverseOnSurface: "#2f3035",
          success: "#4ade80",
          warning: "#fbbf24",
          info: "#00daf3",
        },
      },
      typography: {
        fontFamily: {
          sans: "Inter, ui-sans-serif, sans-serif",
          mono: "JetBrains Mono, monospace",
          display: "Plus Jakarta Sans, ui-sans-serif, sans-serif",
          heading: "Space Grotesk, ui-sans-serif, sans-serif",
        },
        fontSize: { sm: "0.875rem", base: "1rem" },
        fontWeight: { normal: 400, bold: 700 },
        lineHeight: { tight: 1.25, normal: 1.5 },
      },
      spacing: { "4": "16px", "8": "32px" },
      sizing: { sm: "640px" },
      radius: { sm: "0.25rem", md: "0.5rem", lg: "0.75rem" },
      shadows: { sm: "0 1px 2px rgba(0,0,0,0.05)" },
      borders: { DEFAULT: "1px solid" },
      breakpoints: { sm: "640px" },
      zIndex: { modal: 100 },
    },
    layout: {
      container: {
        maxWidth: "1280px",
        paddingX: "2rem",
        paddingXMobile: "1rem",
        sectionGap: "4rem",
      },
      sidebar: {
        width: "256px",
        widthCollapsed: "56px",
      },
    },
  };
}

const LIGHT_THEME = makeResolvedTheme("light");
const DARK_THEME = makeResolvedTheme("dark");

// ============================================================================
// generateCSS
// ============================================================================

describe("generateCSS", () => {
  it("generates CSS containing an @theme block", () => {
    const css = generateCSS(LIGHT_THEME, DARK_THEME);
    expect(css).toContain("@theme {");
  });

  it('generates CSS containing a [data-theme="dark"] block', () => {
    const css = generateCSS(LIGHT_THEME, DARK_THEME);
    expect(css).toContain('[data-theme="dark"]');
  });

  it("contains AUTO-GENERATED header comment", () => {
    const css = generateCSS(LIGHT_THEME, DARK_THEME);
    expect(css).toContain("AUTO-GENERATED");
  });

  it("all 19 core shadcn color tokens are present in @theme block", () => {
    const css = generateCSS(LIGHT_THEME, DARK_THEME);
    const coreTokens = [
      "--color-background",
      "--color-foreground",
      "--color-card",
      "--color-card-foreground",
      "--color-popover",
      "--color-popover-foreground",
      "--color-primary",
      "--color-primary-foreground",
      "--color-secondary",
      "--color-secondary-foreground",
      "--color-muted",
      "--color-muted-foreground",
      "--color-accent",
      "--color-accent-foreground",
      "--color-destructive",
      "--color-destructive-foreground",
      "--color-border",
      "--color-input",
      "--color-ring",
    ];
    for (const token of coreTokens) {
      expect(css).toContain(token);
    }
  });

  it("extended tokens are present in @theme block", () => {
    const css = generateCSS(LIGHT_THEME, DARK_THEME);
    const extendedTokens = [
      "--color-primary-fixed",
      "--color-primary-fixed-dim",
      "--color-primary-container",
      "--color-on-primary-container",
      "--color-secondary-container",
      "--color-on-secondary-container",
      "--color-tertiary",
      "--color-tertiary-container",
      "--color-on-tertiary-container",
      "--color-on-error-container",
    ];
    for (const token of extendedTokens) {
      expect(css).toContain(token);
    }
  });

  it("dark block has ONLY color variables (no --font-*, --radius-*, --spacing-*)", () => {
    const css = generateCSS(LIGHT_THEME, DARK_THEME);
    // Extract [data-theme="dark"] block content
    const darkBlockMatch = /\[data-theme="dark"\]\s*\{([^}]+)\}/s.exec(css);
    expect(darkBlockMatch).not.toBeNull();
    const darkContent = darkBlockMatch?.[1];
    // Should have colors
    expect(darkContent).toContain("--color-");
    // Should NOT have non-color tokens
    expect(darkContent).not.toContain("--font-");
    expect(darkContent).not.toContain("--radius-");
    expect(darkContent).not.toContain("--spacing-");
    expect(darkContent).not.toContain("--sidebar-");
  });

  it("does NOT include --animate-* tokens in output", () => {
    const css = generateCSS(LIGHT_THEME, DARK_THEME);
    expect(css).not.toContain("--animate-");
  });

  it("camelCase token names are correctly converted to kebab-case", () => {
    const css = generateCSS(LIGHT_THEME, DARK_THEME);
    // cardForeground → --color-card-foreground
    expect(css).toContain("--color-card-foreground");
    // primaryForeground → --color-primary-foreground
    expect(css).toContain("--color-primary-foreground");
    // mutedForeground → --color-muted-foreground
    expect(css).toContain("--color-muted-foreground");
    // surfaceContainerHigh → --color-surface-container-high
    expect(css).toContain("--color-surface-container-high");
  });

  it("font alias tokens are present with resolved values", () => {
    const css = generateCSS(LIGHT_THEME, DARK_THEME);
    // --font-headline should resolve to heading font family value (not var())
    expect(css).toContain("--font-headline");
    expect(css).toContain("--font-label");
    // Must NOT use var() for these aliases
    const headlineMatch = /--font-headline:\s*([^;]+);/.exec(css);
    expect(headlineMatch).not.toBeNull();
    if (!headlineMatch) throw new Error("headlineMatch is null — should not happen");
    const headlineValue = headlineMatch[1]?.trim() ?? "";
    expect(headlineValue).not.toContain("var(");
    expect(headlineValue).toBe("Space Grotesk, ui-sans-serif, sans-serif");
  });

  it("sidebar layout tokens are present", () => {
    const css = generateCSS(LIGHT_THEME, DARK_THEME);
    expect(css).toContain("--sidebar-width");
    expect(css).toContain("--sidebar-width-collapsed");
    expect(css).toContain("256px");
    expect(css).toContain("56px");
  });

  it("typography tokens are present in @theme block", () => {
    const css = generateCSS(LIGHT_THEME, DARK_THEME);
    expect(css).toContain("--font-sans");
    expect(css).toContain("--font-mono");
  });

  it("radius tokens are present in @theme block", () => {
    const css = generateCSS(LIGHT_THEME, DARK_THEME);
    expect(css).toContain("--radius-sm");
    expect(css).toContain("--radius-md");
  });
});
