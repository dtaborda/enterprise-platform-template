// Brand resolution — server-only utility.
// Determines which brand to render based on: env var → subdomain → path prefix → default.
// This file MUST only be imported from Server Components or Server Actions.

import type { BrandConfig } from "@enterprise/contracts";
import { getBrandBySlug, getBrandRegistry, getDefaultBrand } from "./registry";

// ============================================================================
// Internal resolution logic (pure, testable)
// ============================================================================

interface ResolutionContext {
  host: string;
  pathname: string;
}

/**
 * Pure resolution function that operates on an explicit registry Map.
 * This signature is exported for testing without real next/headers.
 */
export async function resolveBrandFromRegistry(
  registry: Map<string, BrandConfig>,
  ctx: ResolutionContext,
): Promise<BrandConfig> {
  // Priority 1: BRAND_SLUG environment variable
  const envSlug = process.env["BRAND_SLUG"];
  if (envSlug) {
    const brand = getBrandBySlug(registry, envSlug);
    if (!brand) {
      const available = Array.from(registry.keys()).join(", ");
      throw new Error(
        `[brand] BRAND_SLUG="${envSlug}" does not match any registered brand. ` +
          `Available slugs: ${available}`,
      );
    }
    return brand;
  }

  const { host, pathname } = ctx;

  // Priority 2: Subdomain matching
  // Strip port from host, split by ".", take first segment if > 2 parts
  const hostWithoutPort = host.split(":")[0] ?? "";
  const subdomainSegments = hostWithoutPort.split(".");
  if (subdomainSegments.length > 2) {
    const subdomainSlug = subdomainSegments[0] ?? "";
    const brand = getBrandBySlug(registry, subdomainSlug);
    if (brand) return brand;
    console.warn(
      `[brand] Unrecognized subdomain slug: "${subdomainSlug}". Falling back to default brand.`,
    );
  }

  // Priority 3: Path prefix matching
  const firstPathSegment = pathname.split("/")[1] ?? "";
  if (firstPathSegment) {
    const brand = getBrandBySlug(registry, firstPathSegment);
    if (brand) return brand;
    // Only warn if the segment looks like an intentional brand slug (no dots → not a file extension)
    if (!firstPathSegment.includes(".")) {
      console.warn(
        `[brand] Path prefix "${firstPathSegment}" did not match any brand slug. ` +
          `Falling back to default brand.`,
      );
    }
  }

  // Priority 4: Default brand
  return getDefaultBrand(registry);
}

// ============================================================================
// Public server-side API
// ============================================================================

/**
 * Resolves the active brand for the current request.
 * Reads env vars and Next.js request headers.
 * Server-only — do NOT import in Client Components.
 *
 * Resolution priority:
 * 1. BRAND_SLUG env var
 * 2. Subdomain matching (acme.platform.com → "acme")
 * 3. Path prefix matching (/acme/dashboard → "acme")
 * 4. Default brand (isDefault=true or "enterprise" slug)
 */
export async function resolveBrand(): Promise<BrandConfig> {
  const { headers } = await import("next/headers");
  const headerList = await headers();
  const host = headerList.get("host") ?? "";
  const pathname = headerList.get("x-invoke-path") ?? "/";

  const registry = getBrandRegistry();
  return resolveBrandFromRegistry(registry, { host, pathname });
}
