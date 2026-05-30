// Brand registry — validates and stores all registered brand configs.
// This module is imported at server startup; any validation errors throw immediately,
// preventing the server from starting with invalid brand configuration.

import type { BrandConfig } from "@enterprise/contracts";

// ============================================================================
// Registry builder — pure function used by both module init and tests
// ============================================================================

/**
 * Builds an immutable Map<slug, BrandConfig> from an array of raw brand objects.
 * Throws on duplicate slugs.
 */
export function buildRegistry(brands: BrandConfig[]): Map<string, BrandConfig> {
  const registry = new Map<string, BrandConfig>();

  for (const brand of brands) {
    if (registry.has(brand.slug)) {
      throw new Error(
        `[brand] Duplicate brand slug "${brand.slug}" detected. ` +
          `Each brand must have a unique slug.`,
      );
    }
    registry.set(brand.slug, brand);
  }

  return registry;
}

// ============================================================================
// Registry helpers — operate on a Map parameter (testable, pure)
// ============================================================================

/**
 * Returns the brand with isDefault=true.
 * Falls back to the "enterprise" slug if no isDefault is declared.
 * Throws if neither is available.
 */
export function getDefaultBrand(registry: Map<string, BrandConfig>): BrandConfig {
  for (const brand of registry.values()) {
    if (brand.isDefault) return brand;
  }

  // Fallback: return the "enterprise" brand if no isDefault is declared
  const enterprise = registry.get("enterprise");
  if (!enterprise) {
    throw new Error(
      '[brand] No default brand found and no "enterprise" brand registered. ' +
        "Ensure at least one brand config exists in packages/ui/src/brands/.",
    );
  }
  return enterprise;
}

/**
 * Returns the brand for the given slug, or undefined if not found.
 */
export function getBrandBySlug(
  registry: Map<string, BrandConfig>,
  slug: string,
): BrandConfig | undefined {
  return registry.get(slug);
}

/**
 * Returns all registered brands as an array.
 */
export function getAllBrands(registry: Map<string, BrandConfig>): BrandConfig[] {
  return Array.from(registry.values());
}

// ============================================================================
// Module-level registry — populated at startup from brands/index.ts
// ============================================================================

// Lazy-import to avoid circular deps and allow testing registry helpers in isolation.
// The actual populated registry is exported below for server-side use.
let _registry: Map<string, BrandConfig> | null = null;

/**
 * Returns the singleton brand registry, initializing it on first access.
 * The registry is populated from all brand configs exported by brands/index.ts.
 */
export function getBrandRegistry(): Map<string, BrandConfig> {
  if (_registry !== null) return _registry;

  // Dynamic require to allow test isolation without triggering the real import chain.
  // In production builds, Next.js statically resolves this.
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const brandsModule = require("../brands/index") as Record<string, unknown>;
  const configs: BrandConfig[] = [];

  for (const [, mod] of Object.entries(brandsModule)) {
    const raw = (mod as { default?: unknown }).default ?? mod;
    configs.push(raw as BrandConfig);
  }

  _registry = buildRegistry(configs);
  return _registry;
}

// Named re-export of the singleton for server-side access (used by resolve.ts)
export const brandRegistry: Map<string, BrandConfig> = new Map();

/**
 * Re-initialize the singleton — intended for testing only.
 * Do NOT call this in production code.
 */
export function _resetRegistryForTesting(): void {
  _registry = null;
  brandRegistry.clear();
}
