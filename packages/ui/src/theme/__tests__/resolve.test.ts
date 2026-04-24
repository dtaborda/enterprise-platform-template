import type { ThemeConfig } from "@enterprise/contracts";
import { describe, expect, it } from "vitest";
import { resolveReferences, ThemeResolutionError } from "../resolve";

// ============================================================================
// Helpers
// ============================================================================

function makeTheme(overrides: Partial<ThemeConfig["foundations"]> = {}): ThemeConfig {
  return {
    metadata: { name: "Test", version: "1.0.0", mode: "dark" },
    foundations: {
      colors: {
        primitive: {
          cyan400: "#22D3EE",
          black: "#000000",
        },
        semantic: {
          primary: "{colors.primitive.cyan400}",
          background: "#111318",
        },
      },
      typography: {
        fontFamily: { sans: "Inter, sans-serif" },
        fontSize: { base: "1rem" },
        fontWeight: { normal: 400 },
        lineHeight: { normal: 1.5 },
      },
      spacing: { "4": "16px", "8": "32px" },
      sizing: { sm: "640px" },
      radius: { md: "0.5rem" },
      shadows: { sm: "0 1px 2px rgba(0,0,0,0.05)" },
      borders: { DEFAULT: "1px solid" },
      breakpoints: { sm: "640px" },
      zIndex: { modal: 100 },
      ...overrides,
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
// resolveReferences
// ============================================================================

describe("resolveReferences", () => {
  it("resolves a direct reference to a primitive color", () => {
    const theme = makeTheme();
    const resolved = resolveReferences(theme);
    // {colors.primitive.cyan400} → "#22D3EE"
    expect(resolved.foundations.colors.semantic["primary"]).toBe("#22D3EE");
  });

  it("passes through raw hex values unchanged", () => {
    const theme = makeTheme();
    const resolved = resolveReferences(theme);
    expect(resolved.foundations.colors.semantic["background"]).toBe("#111318");
  });

  it("passes through primitive colors unchanged", () => {
    const theme = makeTheme();
    const resolved = resolveReferences(theme);
    expect(resolved.foundations.colors.primitive["cyan400"]).toBe("#22D3EE");
  });

  it("resolves chained reference: semantic → primitive → hex", () => {
    const theme = makeTheme({
      colors: {
        primitive: { cyan400: "#22D3EE", black: "#000000" },
        semantic: {
          primary: "{colors.primitive.cyan400}",
          // accent references semantic primary (chained)
          accent: "{colors.semantic.primary}",
          background: "#111318",
        },
      },
    });
    const resolved = resolveReferences(theme);
    expect(resolved.foundations.colors.semantic["accent"]).toBe("#22D3EE");
    expect(resolved.foundations.colors.semantic["primary"]).toBe("#22D3EE");
  });

  it("resolves layout reference to spacing token", () => {
    const theme: ThemeConfig = {
      ...makeTheme(),
      layout: {
        container: {
          maxWidth: "1280px",
          paddingX: "{spacing.4}",
          paddingXMobile: "1rem",
          sectionGap: "4rem",
        },
      },
    };
    const resolved = resolveReferences(theme);
    expect(resolved.layout.container.paddingX).toBe("16px");
  });

  it("throws ThemeResolutionError for missing reference", () => {
    const theme = makeTheme({
      colors: {
        primitive: { cyan400: "#22D3EE", black: "#000000" },
        semantic: {
          primary: "{colors.primitive.nonExistent}",
          background: "#111318",
        },
      },
    });
    expect(() => resolveReferences(theme)).toThrow(ThemeResolutionError);
  });

  it("missing reference error contains the bad path", () => {
    const theme = makeTheme({
      colors: {
        primitive: { cyan400: "#22D3EE", black: "#000000" },
        semantic: {
          primary: "{colors.primitive.nonExistent}",
          background: "#111318",
        },
      },
    });
    try {
      resolveReferences(theme);
      expect.fail("Should have thrown");
    } catch (err) {
      expect(err).toBeInstanceOf(ThemeResolutionError);
      const resErr = err as ThemeResolutionError;
      expect(resErr.reference).toContain("colors.primitive.nonExistent");
    }
  });

  it("throws ThemeResolutionError for circular reference", () => {
    const theme = makeTheme({
      colors: {
        primitive: { cyan400: "#22D3EE", black: "#000000" },
        semantic: {
          // a → b → a (cycle)
          a: "{colors.semantic.b}",
          b: "{colors.semantic.a}",
          background: "#111318",
        },
      },
    });
    expect(() => resolveReferences(theme)).toThrow(ThemeResolutionError);
  });

  it("throws ThemeResolutionError for depth > 5 (deep chain)", () => {
    // Build a 6-level chain: s1 → s2 → s3 → s4 → s5 → s6 → s7 (7 hops = depth 6)
    const theme = makeTheme({
      colors: {
        primitive: { base: "#000000", black: "#000000" },
        semantic: {
          s1: "{colors.semantic.s2}",
          s2: "{colors.semantic.s3}",
          s3: "{colors.semantic.s4}",
          s4: "{colors.semantic.s5}",
          s5: "{colors.semantic.s6}",
          s6: "#000000",
          background: "#111318",
        },
      },
    });
    // 5 hops (s1→s2→s3→s4→s5→s6) — this exceeds depth 5
    expect(() => resolveReferences(theme)).toThrow(ThemeResolutionError);
  });

  it("resolves non-ref strings (raw values) without modification", () => {
    const theme = makeTheme({
      spacing: { "4": "16px", gap: "1rem" },
    });
    const resolved = resolveReferences(theme);
    expect(resolved.foundations.spacing["gap"]).toBe("1rem");
    expect(resolved.foundations.spacing["4"]).toBe("16px");
  });

  it("metadata is preserved unchanged after resolution", () => {
    const theme = makeTheme();
    const resolved = resolveReferences(theme);
    expect(resolved.metadata).toEqual(theme.metadata);
  });
});
