// Theme system types — re-exported from schemas + extended resolved types

export type {
  ThemeConfig,
  ThemeFoundations,
  ThemeLayout,
  ThemeMetadata,
  ThemeMode,
} from "../schemas/theme";

// ============================================================================
// Resolved Theme
// ============================================================================

/**
 * ResolvedTheme is a ThemeConfig where all {ref} token references in semantic
 * colors and layout have been replaced with their actual string values.
 * No `{path.to.token}` patterns remain — all values are plain strings or numbers.
 */
export interface ResolvedTheme {
  metadata: {
    name: string;
    version: string;
    mode: "light" | "dark";
    description?: string;
    tenantId?: string;
  };
  foundations: {
    colors: {
      primitive: Record<string, string>;
      semantic: Record<string, string>;
    };
    typography: {
      fontFamily: Record<string, string>;
      fontSize: Record<string, string>;
      fontWeight: Record<string, number>;
      lineHeight: Record<string, number>;
    };
    spacing: Record<string, string>;
    sizing: Record<string, string>;
    radius: Record<string, string>;
    shadows: Record<string, string>;
    borders: Record<string, string>;
    breakpoints: Record<string, string>;
    zIndex: Record<string, number>;
  };
  layout: {
    container: {
      maxWidth: string;
      paddingX: string;
      paddingXMobile: string;
      sectionGap: string;
    };
    sidebar?: {
      width: string;
      widthCollapsed: string;
    };
  };
}
