/**
 * Theme mode utilities.
 *
 * Pure functions — no React, no next/headers, no side-effects.
 * Safe to import in Server Components, Client Components, AND Playwright helpers.
 */

export type ThemeMode = "light" | "dark";

/**
 * Derives the initial theme mode from a brand's `themeRef`.
 *
 * Rule (mirrors BrandProvider + layout.tsx SSR):
 *   themeRef.endsWith("light") → "light"
 *   otherwise                 → "dark"
 */
export function deriveThemeMode(themeRef: string): ThemeMode {
  return themeRef.endsWith("light") ? "light" : "dark";
}
