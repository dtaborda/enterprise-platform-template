"use client";

import type { BrandConfig } from "@enterprise/contracts";
import { ThemeProvider } from "@enterprise/ui/theme/provider";
import { useContext } from "react";
import { BrandContext } from "./context";
import { deriveThemeMode } from "./theme-mode";

// ============================================================================
// BrandProvider
// ============================================================================

export interface BrandProviderProps {
  children?: React.ReactNode;
  /**
   * The resolved BrandConfig — provided by the server boundary (root layout).
   * BrandProvider does NOT resolve the brand; resolution happens in resolveBrand().
   */
  brand: BrandConfig;
  /**
   * Initial theme mode before localStorage hydration.
   * Derived from the brand's themeRef: "light" or "dark" suffix.
   * Falls back to "dark" if themeRef does not end in "light".
   */
  defaultMode?: "light" | "dark";
}

export function BrandProvider({ children, brand, defaultMode }: BrandProviderProps) {
  // Derive initial theme mode from themeRef if not explicitly provided.
  // Uses the shared deriveThemeMode helper so layout.tsx and BrandProvider
  // always apply the same rule.
  const resolvedDefaultMode: "light" | "dark" = defaultMode ?? deriveThemeMode(brand.themeRef);

  return (
    <BrandContext value={{ brand }}>
      <ThemeProvider defaultMode={resolvedDefaultMode}>{children}</ThemeProvider>
    </BrandContext>
  );
}

// ============================================================================
// useBrand hook
// ============================================================================

/**
 * Returns the resolved BrandConfig from context.
 * Must be called inside a BrandProvider — throws with actionable guidance otherwise.
 */
export function useBrand(): BrandConfig {
  const ctx = useContext(BrandContext);
  if (ctx === null) {
    throw new Error(
      "useBrand() must be called inside a <BrandProvider>. " +
        "Ensure the root layout wraps its children with <BrandProvider brand={...}>.",
    );
  }
  return ctx.brand;
}
