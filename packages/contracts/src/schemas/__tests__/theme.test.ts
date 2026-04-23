import { describe, expect, it } from "vitest";
import {
  colorsSchema,
  primitiveColorSchema,
  semanticColorSchema,
  themeFoundationsSchema,
  themeLayoutSchema,
  themeMetadataSchema,
  themeSchema,
  typographySchema,
} from "../theme";

// ============================================================================
// Fixtures
// ============================================================================

const VALID_METADATA = {
  name: "Enterprise Dark",
  version: "1.0.0",
  mode: "dark" as const,
};

const VALID_METADATA_WITH_OPTIONALS = {
  name: "Enterprise Light",
  version: "2.3.1",
  mode: "light" as const,
  description: "Light theme for enterprise",
  tenantId: "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
};

const VALID_PRIMITIVE_COLORS = {
  cyan400: "#22D3EE",
  cyan500: "#06B6D4",
  white: "#FFFFFF",
  black: "#000000",
  shortHex: "#FFF",
  longHex: "#1A2B3C4D",
};

const VALID_SEMANTIC_COLORS = {
  primary: "{colors.primitive.cyan400}",
  background: "#111318",
  foreground: "#e2e2e8",
};

const VALID_COLORS = {
  primitive: VALID_PRIMITIVE_COLORS,
  semantic: VALID_SEMANTIC_COLORS,
};

const VALID_TYPOGRAPHY = {
  fontFamily: {
    sans: "Inter, ui-sans-serif, sans-serif",
    mono: "JetBrains Mono, monospace",
  },
  fontSize: {
    sm: "0.875rem",
    base: "1rem",
    lg: "1.125rem",
  },
  fontWeight: {
    normal: 400,
    bold: 700,
  },
  lineHeight: {
    tight: 1.25,
    normal: 1.5,
  },
};

const VALID_FOUNDATIONS = {
  colors: VALID_COLORS,
  typography: VALID_TYPOGRAPHY,
  spacing: { "4": "16px", "8": "32px" },
  sizing: { sm: "640px", md: "768px" },
  radius: { sm: "0.25rem", md: "0.5rem" },
  shadows: { sm: "0 1px 2px rgba(0,0,0,0.05)" },
  borders: { DEFAULT: "1px solid" },
  breakpoints: { sm: "640px", md: "768px" },
  zIndex: { modal: 100, tooltip: 200 },
};

const VALID_LAYOUT = {
  container: {
    maxWidth: "1280px",
    paddingX: "2rem",
    paddingXMobile: "1rem",
    sectionGap: "4rem",
  },
};

const VALID_LAYOUT_WITH_SIDEBAR = {
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
};

const VALID_THEME = {
  metadata: VALID_METADATA,
  foundations: VALID_FOUNDATIONS,
  layout: VALID_LAYOUT,
};

// ============================================================================
// themeMetadataSchema
// ============================================================================

describe("themeMetadataSchema", () => {
  it("accepts valid minimal metadata (name, version, mode)", () => {
    const result = themeMetadataSchema.safeParse(VALID_METADATA);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.name).toBe("Enterprise Dark");
      expect(result.data.version).toBe("1.0.0");
      expect(result.data.mode).toBe("dark");
    }
  });

  it("accepts metadata with optional fields (description, tenantId)", () => {
    const result = themeMetadataSchema.safeParse(VALID_METADATA_WITH_OPTIONALS);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.description).toBe("Light theme for enterprise");
      expect(result.data.tenantId).toBe("a1b2c3d4-e5f6-7890-abcd-ef1234567890");
    }
  });

  it("accepts both 'light' and 'dark' modes", () => {
    const light = themeMetadataSchema.safeParse({ ...VALID_METADATA, mode: "light" });
    const dark = themeMetadataSchema.safeParse({ ...VALID_METADATA, mode: "dark" });
    expect(light.success).toBe(true);
    expect(dark.success).toBe(true);
  });

  it("rejects empty name", () => {
    const result = themeMetadataSchema.safeParse({ ...VALID_METADATA, name: "" });
    expect(result.success).toBe(false);
  });

  it("rejects invalid semver — 'v1.0'", () => {
    const result = themeMetadataSchema.safeParse({ ...VALID_METADATA, version: "v1.0" });
    expect(result.success).toBe(false);
  });

  it("rejects invalid semver — '1.0'", () => {
    const result = themeMetadataSchema.safeParse({ ...VALID_METADATA, version: "1.0" });
    expect(result.success).toBe(false);
  });

  it("rejects invalid semver — 'latest'", () => {
    const result = themeMetadataSchema.safeParse({ ...VALID_METADATA, version: "latest" });
    expect(result.success).toBe(false);
  });

  it("rejects invalid mode — 'auto'", () => {
    const result = themeMetadataSchema.safeParse({ ...VALID_METADATA, mode: "auto" });
    expect(result.success).toBe(false);
  });

  it("rejects invalid mode — 'system'", () => {
    const result = themeMetadataSchema.safeParse({ ...VALID_METADATA, mode: "system" });
    expect(result.success).toBe(false);
  });

  it("rejects invalid tenantId (non-UUID)", () => {
    const result = themeMetadataSchema.safeParse({ ...VALID_METADATA, tenantId: "not-a-uuid" });
    expect(result.success).toBe(false);
  });

  it("optional description and tenantId work when omitted", () => {
    const result = themeMetadataSchema.safeParse(VALID_METADATA);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.description).toBeUndefined();
      expect(result.data.tenantId).toBeUndefined();
    }
  });
});

// ============================================================================
// primitiveColorSchema
// ============================================================================

describe("primitiveColorSchema", () => {
  it("accepts valid hex colors (3, 6, 8 chars)", () => {
    const result = primitiveColorSchema.safeParse({
      short: "#FFF",
      full: "#FFFFFF",
      withAlpha: "#FFFFFF80",
    });
    expect(result.success).toBe(true);
  });

  it("accepts lowercase hex", () => {
    const result = primitiveColorSchema.safeParse({ color: "#aabbcc" });
    expect(result.success).toBe(true);
  });

  it("accepts mixed case hex", () => {
    const result = primitiveColorSchema.safeParse({ color: "#22D3EE" });
    expect(result.success).toBe(true);
  });

  it("rejects rgb() format — 'rgb(255,255,255)'", () => {
    const result = primitiveColorSchema.safeParse({ color: "rgb(255,255,255)" });
    expect(result.success).toBe(false);
  });

  it("rejects named color — 'white'", () => {
    const result = primitiveColorSchema.safeParse({ color: "white" });
    expect(result.success).toBe(false);
  });

  it("rejects hex without # prefix", () => {
    const result = primitiveColorSchema.safeParse({ color: "FFFFFF" });
    expect(result.success).toBe(false);
  });

  it("rejects hex with 5 chars (invalid length)", () => {
    const result = primitiveColorSchema.safeParse({ color: "#FFFFF" });
    expect(result.success).toBe(false);
  });
});

// ============================================================================
// semanticColorSchema
// ============================================================================

describe("semanticColorSchema", () => {
  it("accepts hex color values", () => {
    const result = semanticColorSchema.safeParse({ primary: "#22D3EE" });
    expect(result.success).toBe(true);
  });

  it("accepts {ref} string patterns", () => {
    const result = semanticColorSchema.safeParse({ primary: "{colors.primitive.cyan400}" });
    expect(result.success).toBe(true);
  });

  it("accepts mixed hex and ref values", () => {
    const result = semanticColorSchema.safeParse(VALID_SEMANTIC_COLORS);
    expect(result.success).toBe(true);
  });
});

// ============================================================================
// colorsSchema
// ============================================================================

describe("colorsSchema", () => {
  it("accepts valid colors object with primitive and semantic", () => {
    const result = colorsSchema.safeParse(VALID_COLORS);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.primitive["cyan400"]).toBe("#22D3EE");
    }
  });
});

// ============================================================================
// typographySchema
// ============================================================================

describe("typographySchema", () => {
  it("accepts valid typography with numeric fontWeight and lineHeight", () => {
    const result = typographySchema.safeParse(VALID_TYPOGRAPHY);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.fontWeight["bold"]).toBe(700);
      expect(result.data.lineHeight["normal"]).toBe(1.5);
    }
  });

  it("rejects fontWeight as string — should be number", () => {
    const result = typographySchema.safeParse({
      ...VALID_TYPOGRAPHY,
      fontWeight: { bold: "700" },
    });
    expect(result.success).toBe(false);
  });

  it("rejects lineHeight as string — should be number", () => {
    const result = typographySchema.safeParse({
      ...VALID_TYPOGRAPHY,
      lineHeight: { normal: "1.5" },
    });
    expect(result.success).toBe(false);
  });
});

// ============================================================================
// themeFoundationsSchema
// ============================================================================

describe("themeFoundationsSchema", () => {
  it("accepts valid complete foundations", () => {
    const result = themeFoundationsSchema.safeParse(VALID_FOUNDATIONS);
    expect(result.success).toBe(true);
  });

  it("rejects zIndex as string value", () => {
    const result = themeFoundationsSchema.safeParse({
      ...VALID_FOUNDATIONS,
      zIndex: { modal: "100" },
    });
    expect(result.success).toBe(false);
  });

  it("rejects missing required colors field", () => {
    const { colors: _colors, ...withoutColors } = VALID_FOUNDATIONS;
    const result = themeFoundationsSchema.safeParse(withoutColors);
    expect(result.success).toBe(false);
  });
});

// ============================================================================
// themeLayoutSchema
// ============================================================================

describe("themeLayoutSchema", () => {
  it("accepts valid layout without sidebar", () => {
    const result = themeLayoutSchema.safeParse(VALID_LAYOUT);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.sidebar).toBeUndefined();
    }
  });

  it("accepts valid layout with sidebar", () => {
    const result = themeLayoutSchema.safeParse(VALID_LAYOUT_WITH_SIDEBAR);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.sidebar?.width).toBe("256px");
      expect(result.data.sidebar?.widthCollapsed).toBe("56px");
    }
  });

  it("optional sidebar works when omitted", () => {
    const result = themeLayoutSchema.safeParse(VALID_LAYOUT);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.sidebar).toBeUndefined();
    }
  });
});

// ============================================================================
// themeSchema (full)
// ============================================================================

describe("themeSchema", () => {
  it("accepts a valid complete theme", () => {
    const result = themeSchema.safeParse(VALID_THEME);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.metadata.name).toBe("Enterprise Dark");
      expect(result.data.metadata.mode).toBe("dark");
      expect(result.data.foundations.colors.primitive["cyan400"]).toBe("#22D3EE");
      expect(result.data.layout.container.maxWidth).toBe("1280px");
    }
  });

  it("accepts theme with sidebar layout", () => {
    const result = themeSchema.safeParse({ ...VALID_THEME, layout: VALID_LAYOUT_WITH_SIDEBAR });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.layout.sidebar?.width).toBe("256px");
    }
  });

  it("accepts theme with all optional metadata fields", () => {
    const result = themeSchema.safeParse({
      ...VALID_THEME,
      metadata: VALID_METADATA_WITH_OPTIONALS,
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.metadata.tenantId).toBe("a1b2c3d4-e5f6-7890-abcd-ef1234567890");
    }
  });

  it("rejects invalid hex color in primitive colors", () => {
    const result = themeSchema.safeParse({
      ...VALID_THEME,
      foundations: {
        ...VALID_FOUNDATIONS,
        colors: {
          ...VALID_COLORS,
          primitive: { bad: "rgb(255,255,255)" },
        },
      },
    });
    expect(result.success).toBe(false);
  });

  it("rejects named color string in primitive colors", () => {
    const result = themeSchema.safeParse({
      ...VALID_THEME,
      foundations: {
        ...VALID_FOUNDATIONS,
        colors: {
          ...VALID_COLORS,
          primitive: { bad: "white" },
        },
      },
    });
    expect(result.success).toBe(false);
  });

  it("rejects invalid semver version", () => {
    const result = themeSchema.safeParse({
      ...VALID_THEME,
      metadata: { ...VALID_METADATA, version: "v1.0" },
    });
    expect(result.success).toBe(false);
  });

  it("rejects invalid mode", () => {
    const result = themeSchema.safeParse({
      ...VALID_THEME,
      metadata: { ...VALID_METADATA, mode: "auto" },
    });
    expect(result.success).toBe(false);
  });

  it("rejects zIndex as string", () => {
    const result = themeSchema.safeParse({
      ...VALID_THEME,
      foundations: { ...VALID_FOUNDATIONS, zIndex: { modal: "100" } },
    });
    expect(result.success).toBe(false);
  });

  it("rejects fontWeight as string", () => {
    const result = themeSchema.safeParse({
      ...VALID_THEME,
      foundations: {
        ...VALID_FOUNDATIONS,
        typography: { ...VALID_TYPOGRAPHY, fontWeight: { bold: "700" } },
      },
    });
    expect(result.success).toBe(false);
  });

  it("rejects missing required metadata field (name)", () => {
    const { name: _name, ...withoutName } = VALID_METADATA;
    const result = themeSchema.safeParse({ ...VALID_THEME, metadata: withoutName });
    expect(result.success).toBe(false);
  });

  it("rejects missing required foundations field (colors)", () => {
    const { colors: _colors, ...withoutColors } = VALID_FOUNDATIONS;
    const result = themeSchema.safeParse({ ...VALID_THEME, foundations: withoutColors });
    expect(result.success).toBe(false);
  });
});
