/**
 * Shared theme constants for Playwright E2E helpers.
 *
 * GATE-1 decision: getBrandRegistry() uses a dynamic require() that fails in the
 * Playwright Node.js runtime (ESM context).  We use the direct import fallback:
 * import the default enterprise brand config and call deriveThemeMode() on its
 * themeRef.  This is type-safe, deterministic, and tracks brand.themeRef changes.
 */

// Direct brand config import — avoids getBrandRegistry() require() in ESM runtime.
// Resolved via tsconfig paths: @enterprise/brand/* → packages/brand/src/*
import enterpriseBrand from "@enterprise/brand/brands/enterprise.brand";
// "type": "module" + @enterprise/brand/theme-mode is a pure function (no React,
// no next/headers) — safe in Playwright runtime once the tsconfig path is wired.
import { deriveThemeMode } from "@enterprise/brand/theme-mode";

/**
 * The expected data-theme value for a fresh (empty localStorage) page load.
 * Derived from the default brand's themeRef so it stays in sync with brand config.
 *
 * Enterprise brand:  themeRef = "light"  →  EXPECTED_DEFAULT_THEME = "light"
 */
export const EXPECTED_DEFAULT_THEME: "light" | "dark" = deriveThemeMode(enterpriseBrand.themeRef);
