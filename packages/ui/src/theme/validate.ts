import type { ThemeConfig } from "@enterprise/contracts";
import { themeSchema } from "@enterprise/contracts";

// ============================================================================
// validateTheme
// ============================================================================

/**
 * Validate and parse an unknown JSON value against the themeSchema.
 *
 * Wraps `themeSchema.parse()` and rethrows any ZodError directly.
 * Returns a fully typed ThemeConfig on success.
 *
 * @throws {ZodError} if the input does not match the theme schema
 */
export function validateTheme(json: unknown): ThemeConfig {
  return themeSchema.parse(json);
}

// ============================================================================
// validateThemeStructure
// ============================================================================

/**
 * Validate structural parity between a light and dark theme.
 *
 * Ensures both themes define the exact same set of semantic color keys.
 * Throws an Error with a descriptive message if there is a mismatch.
 *
 * @throws {Error} if semantic color key sets differ between light and dark
 */
export function validateThemeStructure(light: ThemeConfig, dark: ThemeConfig): void {
  const lightKeys = new Set(Object.keys(light.foundations.colors.semantic));
  const darkKeys = new Set(Object.keys(dark.foundations.colors.semantic));

  const missingInDark = [...lightKeys].filter((k) => !darkKeys.has(k));
  const missingInLight = [...darkKeys].filter((k) => !lightKeys.has(k));

  if (missingInDark.length > 0 || missingInLight.length > 0) {
    const parts: string[] = [];
    if (missingInDark.length > 0) {
      parts.push(`Keys in light but missing in dark: ${missingInDark.join(", ")}`);
    }
    if (missingInLight.length > 0) {
      parts.push(`Keys in dark but missing in light: ${missingInLight.join(", ")}`);
    }
    throw new Error(`Theme structure mismatch — semantic color keys differ.\n${parts.join("\n")}`);
  }
}
