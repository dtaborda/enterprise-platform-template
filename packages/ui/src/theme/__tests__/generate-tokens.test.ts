import type { ResolvedTheme } from "@enterprise/contracts";
import { describe, expect, it } from "vitest";
import { generateTokens } from "../generate-tokens";

// ============================================================================
// Fixtures
// ============================================================================

function makeResolvedTheme(): ResolvedTheme {
  return {
    metadata: { name: "Enterprise Theme", version: "1.0.0", mode: "dark" },
    foundations: {
      colors: {
        primitive: { cyan400: "#22D3EE" },
        semantic: {
          background: "#111318",
          foreground: "#e2e2e8",
          primary: "#00e5ff",
          primaryForeground: "#00626e",
        },
      },
      typography: {
        fontFamily: { sans: "Inter, sans-serif", mono: "JetBrains Mono, monospace" },
        fontSize: { base: "1rem", sm: "0.875rem" },
        fontWeight: { normal: 400, bold: 700 },
        lineHeight: { normal: 1.5 },
      },
      spacing: { "4": "16px", "8": "32px" },
      sizing: { sm: "640px" },
      radius: { sm: "0.25rem", md: "0.5rem", lg: "0.75rem" },
      shadows: { sm: "0 1px 2px rgba(0,0,0,0.05)" },
      borders: { DEFAULT: "1px solid" },
      breakpoints: { sm: "640px" },
      zIndex: { modal: 100, tooltip: 200 },
    },
    layout: {
      container: {
        maxWidth: "1280px",
        paddingX: "2rem",
        paddingXMobile: "1rem",
        sectionGap: "4rem",
      },
    },
  };
}

// ============================================================================
// generateTokens
// ============================================================================

describe("generateTokens", () => {
  it("returns a string (TypeScript source)", () => {
    const result = generateTokens(makeResolvedTheme());
    expect(typeof result).toBe("string");
    expect(result.length).toBeGreaterThan(0);
  });

  it("contains AUTO-GENERATED header comment", () => {
    const result = generateTokens(makeResolvedTheme());
    expect(result).toContain("AUTO-GENERATED");
  });

  it("exports named 'colors' const", () => {
    const result = generateTokens(makeResolvedTheme());
    expect(result).toContain("export const colors");
  });

  it("exports named 'typography' const", () => {
    const result = generateTokens(makeResolvedTheme());
    expect(result).toContain("export const typography");
  });

  it("exports named 'spacing' const", () => {
    const result = generateTokens(makeResolvedTheme());
    expect(result).toContain("export const spacing");
  });

  it("exports named 'radius' const", () => {
    const result = generateTokens(makeResolvedTheme());
    expect(result).toContain("export const radius");
  });

  it("exports named 'shadows' const", () => {
    const result = generateTokens(makeResolvedTheme());
    expect(result).toContain("export const shadows");
  });

  it("exports named 'zIndex' const", () => {
    const result = generateTokens(makeResolvedTheme());
    expect(result).toContain("export const zIndex");
  });

  it("exports composite 'tokens' const", () => {
    const result = generateTokens(makeResolvedTheme());
    expect(result).toContain("export const tokens");
  });

  it("all values are var(--css-variable-name) strings", () => {
    const result = generateTokens(makeResolvedTheme());
    // background → var(--color-background)
    expect(result).toContain("var(--color-background)");
    expect(result).toContain("var(--color-foreground)");
  });

  it("camelCase color keys are converted to kebab-case CSS vars", () => {
    const result = generateTokens(makeResolvedTheme());
    // primaryForeground → var(--color-primary-foreground)
    expect(result).toContain("var(--color-primary-foreground)");
  });

  it("spacing keys are properly referenced as CSS vars", () => {
    const result = generateTokens(makeResolvedTheme());
    expect(result).toContain("var(--spacing-");
  });

  it("uses 'as const' for type narrowing", () => {
    const result = generateTokens(makeResolvedTheme());
    expect(result).toContain("as const");
  });

  it("does NOT contain a default export", () => {
    const result = generateTokens(makeResolvedTheme());
    expect(result).not.toContain("export default");
  });

  it("zIndex values use CSS var references", () => {
    const result = generateTokens(makeResolvedTheme());
    expect(result).toContain("var(--z-");
  });
});
