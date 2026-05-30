"use client";

import { cn } from "../lib/utils";
import { useTheme } from "../theme/provider";
import { useBrand } from "./provider";

// ============================================================================
// BrandLogo
// ============================================================================

export interface BrandLogoProps {
  /**
   * Optional Tailwind class(es) to apply to the root element.
   * Applied to both the <img> and the text fallback <span>.
   */
  className?: string;
}

/**
 * BrandLogo — renders the correct logo variant for the active theme mode.
 *
 * - In "light" mode: renders brand.logo.light
 * - In "dark" mode: renders brand.logo.dark
 * - When the active variant's src is empty: renders a <span> with displayName as text fallback
 *
 * Must be rendered inside a BrandProvider (inherits from useBrand()) and a
 * ThemeProvider (inherits from useTheme()).
 */
export function BrandLogo({ className }: BrandLogoProps) {
  const brand = useBrand();
  const { mode } = useTheme();

  const logoVariant = mode === "light" ? brand.logo.light : brand.logo.dark;

  // Text fallback when src is empty or undefined
  if (!logoVariant.src) {
    return (
      // role="img" allows aria-label on the text fallback container
      <span role="img" className={cn(className)} aria-label={logoVariant.alt}>
        {brand.displayName}
      </span>
    );
  }

  return (
    // biome-ignore lint/performance/noImgElement: packages/ui cannot use next/image (no Next.js dep in source)
    <img
      src={logoVariant.src}
      alt={logoVariant.alt}
      width={logoVariant.width}
      height={logoVariant.height}
      className={cn(className)}
    />
  );
}
