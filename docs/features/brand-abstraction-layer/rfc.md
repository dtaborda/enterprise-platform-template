---
title: "Brand abstraction layer RFC"
description: "Defines the implementation-ready technical architecture for a provider-agnostic brand abstraction layer that lets the Enterprise Platform template host multiple visual identities from a single codebase."
owner: "Engineering"
lastUpdated: "2026-05-11"
---

# Brand abstraction layer RFC

## Purpose

Define an implementation-ready technical approach for a brand abstraction layer that sits above the existing theme system, aligned with the service layer, contracts, and traceability conventions of the Enterprise Platform. The brand layer owns everything that makes a visual identity distinct beyond design tokens: name, logo, favicon, Open Graph metadata, legal links, social links, and brand-scoped feature toggles. The theme system remains the authoritative source of design tokens; the brand layer selects which token set to apply.

## Scope

- Included: `brandConfigSchema` Zod schema in `@enterprise/contracts`, `BrandConfig` TypeScript types, brand config files in `packages/ui/src/brands/`, `BrandProvider` React context, `useBrand()` hook, brand resolution strategy (`resolveBrand()` utility), `BrandLogo` component, `BrandMeta` server-side metadata helper, `BrandFooter` component, brand registry with startup validation, integration with the existing `ThemeProvider`, a default `enterprise.brand.ts` config, an example `acme.brand.ts` commented-out file, audit events at startup, Sentry instrumentation for the `brand` area, and E2E coverage for brand rendering.
- Excluded: runtime brand switching per authenticated user session, admin UI for editing brand configs without a code deploy, database-driven brand config storage, per-tenant brand assignment, brand-level A/B experimentation, brand inheritance or partial override from a parent brand, automated asset optimization or CDN upload, brand-specific routing namespaces or sitemaps, and visual brand editor tooling.

---

## Summary

Implement the brand abstraction layer as a purely static, code-driven module living in `@enterprise/ui`. Brand identity is declared in TypeScript config files (`*.brand.ts`) that are validated against a `brandConfigSchema` Zod schema defined in `@enterprise/contracts`. At application startup, a brand registry loads all configs, validates them, and exposes a `resolveBrand(request?)` utility that determines which brand to render per request using a priority chain: `BRAND_SLUG` environment variable → subdomain extraction → path prefix → default brand. The resolved `BrandConfig` is passed as a prop to `BrandProvider`, which is a React Server Component wrapper that seeds `BrandContext` and internally renders the existing `ThemeProvider` with the `themeRef` value from the config. Client components consume brand context through the `useBrand()` hook. The template ships with exactly one functional brand (`"enterprise"`) so adopters have a working starting point; adding a second brand requires only a new config file.

## Technical objectives

- `brandConfigSchema` in `@enterprise/contracts` is the single source of truth for what a brand is — all fields typed, all constraints enforced at startup.
- Brand resolution is pure in-memory lookup with no I/O, no database calls, and no per-request overhead beyond a map lookup.
- The `BrandProvider` / `useBrand()` boundary is explicit and safe: calling `useBrand()` outside a provider throws a descriptive error with guidance.
- Theme integration is declarative: `BrandProvider` passes `themeRef` to `ThemeProvider`; no brand-specific CSS is written manually.
- Adding a second brand requires creating one `*.brand.ts` file — zero changes to shared code.
- Invalid brand configs are caught at startup with a Zod error that identifies the brand slug and the failing field path, before any request is served.
- All brand-related instrumentation (startup audit, resolution fallback, provider throw) is captured by Sentry under the `brand` area.
- The `BRAND_SLUG` environment variable allows single-brand deployments without any subdomain or path configuration.

---

## Data model

The brand abstraction layer does not own a database table. Brand configuration is static — committed TypeScript files. There is no Drizzle schema for this feature in MVP. The persistence layer is the git repository itself.

### Brand config registry (runtime, in-memory)

At module initialization, `packages/ui/src/brand/registry.ts` imports all `*.brand.ts` files from `packages/ui/src/brands/`, validates each against `brandConfigSchema`, checks for duplicate slugs, and exposes an immutable `Map<string, BrandConfig>` keyed by slug.

```typescript
// packages/ui/src/brand/registry.ts

import type { BrandConfig } from "@enterprise/contracts";
import { brandConfigSchema } from "@enterprise/contracts";

// Static import of all brand config modules
// Build tools (Next.js + Webpack) resolve this at bundle time
import * as brandModules from "./brands/index";

function buildRegistry(): Map<string, BrandConfig> {
  const registry = new Map<string, BrandConfig>();

  for (const [moduleName, mod] of Object.entries(brandModules)) {
    const raw = (mod as { default?: unknown }).default ?? mod;
    const result = brandConfigSchema.safeParse(raw);

    if (!result.success) {
      throw new Error(
        `[brand] Invalid brand config in module "${moduleName}":\n${result.error.toString()}`,
      );
    }

    const config = result.data;

    if (registry.has(config.slug)) {
      throw new Error(
        `[brand] Duplicate brand slug "${config.slug}" detected. ` +
          `Each brand must have a unique slug.`,
      );
    }

    registry.set(config.slug, config);
  }

  return registry;
}

export const brandRegistry: Map<string, BrandConfig> = buildRegistry();

export function getDefaultBrand(): BrandConfig {
  for (const brand of brandRegistry.values()) {
    if (brand.isDefault) return brand;
  }
  // Fallback: return the "enterprise" brand if no isDefault is declared
  const enterprise = brandRegistry.get("enterprise");
  if (!enterprise) {
    throw new Error(
      '[brand] No default brand found and no "enterprise" brand registered. ' +
        "Ensure at least one brand config exists in packages/ui/src/brands/.",
    );
  }
  return enterprise;
}
```

### Indexes

Not applicable — in-memory `Map` keyed by slug. O(1) lookup per request.

### Constraints

- Slug uniqueness is enforced at registry initialization. Duplicate slugs throw before the process serves any request.
- All registered brand configs are validated against `brandConfigSchema`. A single invalid config prevents startup.
- `themeRef` is validated to resolve against an existing theme JSON file at startup (see the resolution section).

### Type exports

```typescript
// Inferred from brandConfigSchema in @enterprise/contracts
export type BrandConfig = z.infer<typeof brandConfigSchema>;
export type BrandLogoVariant = z.infer<typeof brandLogoVariantSchema>;
export type BrandLogo = z.infer<typeof brandLogoSchema>;
export type BrandMetadata = z.infer<typeof brandMetadataSchema>;
export type BrandLegal = z.infer<typeof brandLegalSchema>;
export type BrandSocial = z.infer<typeof brandSocialSchema>;
```

---

## Contracts

Location: `packages/contracts/src/schemas/brand.ts`

### Schemas (Zod)

```typescript
import { z } from "zod";

// ============================================================================
// Logo variant — a single light or dark logo asset
// ============================================================================

export const brandLogoVariantSchema = z.object({
  /** Absolute path or full CDN URL for the logo image. Empty string triggers text fallback. */
  src: z.string(),
  /** Alt text for the <img> element — required for accessibility. */
  alt: z.string().min(1, "Logo alt text must not be empty"),
  /** Optional explicit width in pixels. Used to prevent layout shift. */
  width: z.number().int().positive().optional(),
  /** Optional explicit height in pixels. */
  height: z.number().int().positive().optional(),
});

// ============================================================================
// Logo — light + dark variants
// ============================================================================

export const brandLogoSchema = z.object({
  light: brandLogoVariantSchema,
  dark: brandLogoVariantSchema,
});

// ============================================================================
// Metadata — Open Graph and page title configuration
// ============================================================================

export const brandMetadataSchema = z.object({
  /**
   * Next.js title template. Use "%s" as the placeholder for the page title.
   * Example: "%s | Acme Platform"
   */
  titleTemplate: z.string().min(1),
  /**
   * Default page title used when no per-page title is set.
   * Also used for the home page <title> tag.
   */
  defaultTitle: z.string().min(1),
  /**
   * Default meta description. Used as og:description when no page-level
   * description is provided.
   */
  description: z.string().min(1),
  /**
   * Absolute path or full URL for the Open Graph image.
   * Used as og:image on all pages unless overridden per-page.
   */
  ogImage: z.string(),
});

// ============================================================================
// Legal — privacy policy and terms of service URLs
// ============================================================================

export const brandLegalSchema = z.object({
  /** Full URL to the privacy policy page. Empty string suppresses the link. */
  privacyUrl: z.string(),
  /** Full URL to the terms of service page. Empty string suppresses the link. */
  termsUrl: z.string(),
});

// ============================================================================
// Social links — optional external profile URLs
// ============================================================================

export const brandSocialSchema = z.object({
  /** Twitter / X profile URL */
  twitter: z.string().url().optional(),
  /** LinkedIn company page URL */
  linkedin: z.string().url().optional(),
  /** GitHub organization or user profile URL */
  github: z.string().url().optional(),
});

// ============================================================================
// BrandConfig — top-level schema
// ============================================================================

export const brandConfigSchema = z.object({
  /**
   * URL-safe unique identifier. Must be lowercase, alphanumeric with hyphens.
   * Used for subdomain matching, path prefix matching, and the BRAND_SLUG env var.
   * Example: "enterprise", "acme", "acme-eu"
   */
  slug: z
    .string()
    .min(1)
    .regex(
      /^[a-z0-9]+(?:-[a-z0-9]+)*$/,
      "Slug must be lowercase alphanumeric with optional hyphens (e.g. \"acme-eu\")",
    ),

  /**
   * Internal identifier used in audit events, Sentry tags, and log output.
   * Human-readable but not shown to end users.
   */
  name: z.string().min(1),

  /**
   * Human-readable brand name shown in UI headings, footers, and browser tabs.
   * Example: "Acme Platform", "Enterprise"
   */
  displayName: z.string().min(1),

  /**
   * Short description of the brand. Used in internal docs and meta tags
   * when no page-level description is provided.
   */
  description: z.string().min(1),

  /** Light and dark logo variants. */
  logo: brandLogoSchema,

  /**
   * Path or URL to the favicon asset.
   * Recommended: SVG or 32×32 ICO. Example: "/images/enterprise/favicon.svg"
   */
  favicon: z.string().min(1),

  /** Open Graph and page title configuration. */
  metadata: brandMetadataSchema,

  /** Legal link URLs for privacy policy and terms of service. */
  legal: brandLegalSchema,

  /** Optional external social profile links. */
  social: brandSocialSchema.optional(),

  /**
   * Key that references which theme JSON file to apply.
   * Must match the "metadata.name" field of a theme JSON in packages/ui/src/themes/.
   * Examples: "light", "dark", "acme-light"
   * The brand layer does not embed token values — it declares which token set to use.
   */
  themeRef: z.string().min(1),

  /**
   * Optional brand-scoped feature toggles.
   * Keys are feature names; values are boolean flags.
   * Example: { "showPoweredBy": true, "enablePublicApi": false }
   * These control structural UI differences between brands — not rollout/experimentation,
   * which belongs to the feature-flags system.
   */
  features: z.record(z.string(), z.boolean()).optional(),

  /**
   * When true, this brand is returned as the fallback when no slug matches.
   * At most one brand in the registry should set this to true.
   * If no brand has isDefault=true, the "enterprise" slug is used as the default.
   */
  isDefault: z.boolean().optional(),
});
```

### Type exports

```typescript
// packages/contracts/src/schemas/brand.ts — colocated type exports

export type BrandConfig = z.infer<typeof brandConfigSchema>;
export type BrandLogoVariant = z.infer<typeof brandLogoVariantSchema>;
export type BrandLogo = z.infer<typeof brandLogoSchema>;
export type BrandMetadata = z.infer<typeof brandMetadataSchema>;
export type BrandLegal = z.infer<typeof brandLegalSchema>;
export type BrandSocial = z.infer<typeof brandSocialSchema>;
```

Export from the contracts barrel (`packages/contracts/src/index.ts`):

```typescript
// Brand system — schemas and types
export {
  brandConfigSchema,
  brandLegalSchema,
  brandLogoSchema,
  brandLogoVariantSchema,
  brandMetadataSchema,
  brandSocialSchema,
} from "./schemas/brand";

export type {
  BrandConfig,
  BrandLegal,
  BrandLogo,
  BrandLogoVariant,
  BrandMetadata,
  BrandSocial,
} from "./schemas/brand";
```

---

## Service layer

The brand abstraction layer does not define a service in `@enterprise/core`. There is no business logic, no database I/O, and no mutation pathway. The resolution logic is a pure utility (`resolveBrand`) that lives in `@enterprise/ui/src/brand/resolve.ts` and is called directly from the Next.js root layout server component.

If future iterations introduce database-driven brand config (runtime admin management), a `brand-service.ts` in `@enterprise/core` would be the correct home for that logic. The registry and resolution utilities would then become adapters consumed by the service.

---

## Server Actions

No Server Actions are defined for this feature in MVP. Brand configuration is code-driven (committed files). There are no mutations exposed to the UI. All interaction with brand config is read-only via `useBrand()` on the client and `resolveBrand()` on the server.

---

## UI routes and components

### Routes

The brand abstraction layer has no dedicated route in MVP. It is infrastructure that affects every rendered page. The brand layer does not add any entry to `ui/lib/routes.ts`.

### Components

| Component | Location | Exported from | Purpose |
|-----------|----------|---------------|---------|
| `BrandProvider` | `packages/ui/src/brand/provider.tsx` | `@enterprise/ui/brand/provider` | Root wrapper that seeds `BrandContext` and renders `ThemeProvider` with `themeRef` |
| `BrandContext` | `packages/ui/src/brand/context.ts` | `@enterprise/ui/brand/context` | React context object for brand config |
| `useBrand()` | `packages/ui/src/brand/provider.tsx` | `@enterprise/ui/brand/provider` | Client hook to read `BrandConfig` from context |
| `BrandLogo` | `packages/ui/src/brand/brand-logo.tsx` | `@enterprise/ui/brand/brand-logo` | Renders the correct logo variant for the active theme mode |
| `BrandFooter` | `packages/ui/src/brand/brand-footer.tsx` | `@enterprise/ui/brand/brand-footer` | Renders `displayName`, legal links, and social icon links |

### Feature module structure (file tree)

```
packages/ui/src/brand/
├── context.ts                    # BrandContext — React context object and type
├── provider.tsx                  # BrandProvider + useBrand()
├── resolve.ts                    # resolveBrand() — server-side brand resolution utility
├── registry.ts                   # buildRegistry() — loads and validates all *.brand.ts files
├── brand-logo.tsx                # BrandLogo — light/dark logo switcher
├── brand-footer.tsx              # BrandFooter — legal links and social icons
├── brand-meta.ts                 # generateBrandMetadata() — Next.js Metadata helper
└── __tests__/
    ├── resolve.test.ts           # Unit tests for resolveBrand()
    ├── registry.test.ts          # Unit tests for buildRegistry() and validation
    └── brand-logo.test.tsx       # Unit tests for BrandLogo component

packages/ui/src/brands/
├── index.ts                      # Re-exports all brand configs for registry consumption
├── enterprise.brand.ts           # Default brand — required, ships with the template
└── acme.brand.ts                 # Example second brand — commented out; adopter reference
```

### App routes (file tree)

```
ui/app/
└── layout.tsx                    # Root layout — calls resolveBrand(), wraps with BrandProvider
```

No new page or route files are added. The root layout is modified to call `resolveBrand()` and wrap its children with `BrandProvider`.

---

## Package structure

Brand functionality lives entirely within `@enterprise/ui`. No new package is created in MVP. The rationale: `@enterprise/ui` already owns `ThemeProvider` and the design token pipeline — `BrandProvider` is a natural neighbor. If the brand API grows significantly in future iterations (e.g., database-driven admin, brand-level analytics, per-tenant assignment), extracting to an `@enterprise/brand` package is a clean follow-up step that the dependency direction already permits.

### Full brand directory within `@enterprise/ui`

```
packages/ui/
├── src/
│   ├── brand/                            # Brand abstraction layer
│   │   ├── context.ts
│   │   ├── provider.tsx
│   │   ├── resolve.ts
│   │   ├── registry.ts
│   │   ├── brand-logo.tsx
│   │   ├── brand-footer.tsx
│   │   ├── brand-meta.ts
│   │   └── __tests__/
│   ├── brands/                           # Brand config files
│   │   ├── index.ts
│   │   ├── enterprise.brand.ts
│   │   └── acme.brand.ts                 # (commented-out example)
│   ├── theme/                            # Existing theme system (unchanged)
│   │   ├── provider.tsx
│   │   ├── context.ts
│   │   └── ...
│   └── themes/                           # Theme JSON sources (existing)
│       ├── light.json
│       └── dark.json
```

### Subpath exports (`packages/ui/package.json`)

```json
{
  "exports": {
    "./brand/provider": "./src/brand/provider.tsx",
    "./brand/context": "./src/brand/context.ts",
    "./brand/brand-logo": "./src/brand/brand-logo.tsx",
    "./brand/brand-footer": "./src/brand/brand-footer.tsx",
    "./brand/brand-meta": "./src/brand/brand-meta.ts",
    "./brand/resolve": "./src/brand/resolve.ts"
  }
}
```

Client Components that call `useBrand()` import from `@enterprise/ui/brand/provider`. Server utilities import from `@enterprise/ui/brand/resolve`. The barrel (`@enterprise/ui`) also re-exports the brand symbols:

```typescript
// packages/ui/src/index.ts — additions
export type { BrandConfig } from "@enterprise/contracts";
export { BrandContext } from "./brand/context";
export type { BrandContextValue } from "./brand/context";
export { BrandFooter } from "./brand/brand-footer";
export { BrandLogo } from "./brand/brand-logo";
export { BrandProvider, useBrand } from "./brand/provider";
```

---

## Integration with theme system

The brand layer selects a theme; the theme system applies it. This separation is enforced by a single-direction dependency: `BrandProvider` reads `themeRef` from `BrandConfig` and passes it as the `defaultMode` — or more precisely, as a theme name — to `ThemeProvider`.

### How `BrandProvider` connects to `ThemeProvider`

```typescript
// packages/ui/src/brand/provider.tsx

"use client";

import type { BrandConfig } from "@enterprise/contracts";
import { createContext, useContext } from "react";
import { ThemeProvider } from "../theme/provider";

export interface BrandContextValue {
  brand: BrandConfig;
}

export const BrandContext = createContext<BrandContextValue | null>(null);

export interface BrandProviderProps {
  children: React.ReactNode;
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
  // Derive initial theme mode from themeRef if not explicitly provided
  const resolvedDefaultMode: "light" | "dark" =
    defaultMode ?? (brand.themeRef.endsWith("light") ? "light" : "dark");

  return (
    <BrandContext value={{ brand }}>
      <ThemeProvider defaultMode={resolvedDefaultMode}>{children}</ThemeProvider>
    </BrandContext>
  );
}

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
```

### Wrapping order in root layout

```tsx
// ui/app/layout.tsx (relevant portion)
import { BrandProvider } from "@enterprise/ui/brand/provider";
import { resolveBrand } from "@enterprise/ui/brand/resolve";
import { generateBrandMetadata } from "@enterprise/ui/brand/brand-meta";

export async function generateMetadata() {
  const brand = await resolveBrand();
  return generateBrandMetadata(brand);
}

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const brand = await resolveBrand();

  return (
    <html lang="en" data-theme="dark" suppressHydrationWarning>
      <body>
        {/* BrandProvider wraps ThemeProvider internally */}
        <BrandProvider brand={brand}>
          {children}
        </BrandProvider>
      </body>
    </html>
  );
}
```

### Custom theme per brand

Brands that share the default platform theme point `themeRef` to `"light"` or `"dark"`. Brands that need a distinct visual identity create a new theme JSON file in `packages/ui/src/themes/` and reference it by its `metadata.name` value. The existing theme build pipeline (`pnpm build:theme`) generates CSS and TypeScript tokens from all theme JSONs in that directory.

Example for a brand with a custom theme:

1. Create `packages/ui/src/themes/acme-light.json` with custom color primitives and semantics.
2. Set `"metadata": { "name": "acme-light", "mode": "light", ... }` in the JSON.
3. Run `pnpm --filter @enterprise/ui build:theme` to regenerate `theme-generated.css` with the new `[data-theme="acme-light"]` selector block.
4. Set `themeRef: "acme-light"` in `acme.brand.ts`.

The `ThemeProvider` already handles `setMode()` — for brand-specific themes with a `"light"` default mode, the theme toggle would switch to the platform `"dark"` theme unless a corresponding `acme-dark.json` is also created and the toggle logic is extended per brand. In MVP, brands that use custom themes are expected to provide both light and dark variants if they want theme toggling to remain brand-consistent. This is documented in `packages/ui/AGENTS.md`.

---

## Brand resolution strategy

`resolveBrand()` is a server-side async utility. It reads environment variables, inspects the Next.js `headers()` object for the hostname and path, and performs a pure in-memory lookup against the brand registry.

### Resolution algorithm

```
Priority 1 — BRAND_SLUG env var
  if process.env.BRAND_SLUG is set:
    look up slug in registry
    if found → return brand config
    if not found → throw Error with slug and list of available slugs (startup-time fail)

Priority 2 — Subdomain matching
  read Host header from request
  extract first subdomain segment (hostname.split(".")[0])
  if segment exists in registry → return brand config
  emit console.warn("[brand] Unrecognized subdomain slug: {slug}. Falling back to default brand.")

Priority 3 — Path prefix matching
  read pathname from URL (Next.js headers() or Request.url)
  extract first path segment (pathname.split("/")[1])
  if segment exists in registry → return brand config
  emit console.warn("[brand] Unrecognized path prefix slug: {slug}. Falling back to default brand.")

Priority 4 — Default brand
  call getDefaultBrand() from registry
  return the brand with isDefault=true, or "enterprise" if none declared
```

### Implementation

```typescript
// packages/ui/src/brand/resolve.ts

import { headers } from "next/headers";
import type { BrandConfig } from "@enterprise/contracts";
import { brandRegistry, getDefaultBrand } from "./registry";

export async function resolveBrand(): Promise<BrandConfig> {
  // Priority 1: BRAND_SLUG environment variable
  const envSlug = process.env["BRAND_SLUG"];
  if (envSlug) {
    const brand = brandRegistry.get(envSlug);
    if (!brand) {
      const available = Array.from(brandRegistry.keys()).join(", ");
      throw new Error(
        `[brand] BRAND_SLUG="${envSlug}" does not match any registered brand. ` +
          `Available slugs: ${available}`,
      );
    }
    return brand;
  }

  const headerList = await headers();
  const host = headerList.get("host") ?? "";
  const pathname = headerList.get("x-invoke-path") ?? "/";

  // Priority 2: Subdomain matching
  // Strip port from host, split by ".", take first segment
  const hostWithoutPort = host.split(":")[0] ?? "";
  const subdomainSegments = hostWithoutPort.split(".");
  if (subdomainSegments.length > 2) {
    const subdomainSlug = subdomainSegments[0] ?? "";
    const brand = brandRegistry.get(subdomainSlug);
    if (brand) return brand;
    console.warn(
      `[brand] Unrecognized subdomain slug: "${subdomainSlug}". Falling back to default brand.`,
    );
  }

  // Priority 3: Path prefix matching
  const firstPathSegment = pathname.split("/")[1] ?? "";
  if (firstPathSegment) {
    const brand = brandRegistry.get(firstPathSegment);
    if (brand) return brand;
    // Only warn if the segment looks like an intentional brand slug (no dots, no file extension)
    if (!firstPathSegment.includes(".")) {
      console.warn(
        `[brand] Path prefix "${firstPathSegment}" did not match any brand slug. ` +
          `Falling back to default brand.`,
      );
    }
  }

  // Priority 4: Default brand
  return getDefaultBrand();
}
```

### Resolution strategy per environment

| Environment | Recommended approach | Example |
|-------------|---------------------|---------|
| Local development (single brand) | Set `BRAND_SLUG=enterprise` in `.env.local` | Simplest — no subdomain config needed |
| Local development (multi-brand) | Use path prefix: `/acme/dashboard` | Subdomains require hosts file edits; path prefix requires no system config |
| Staging (single brand) | Set `BRAND_SLUG` in deployment env vars | Forces the brand regardless of subdomain |
| Production (multi-brand) | Wildcard subdomain DNS (`*.platform.com`) + no `BRAND_SLUG` | Canonical multi-brand production setup |
| Vercel preview deployments | Set `BRAND_SLUG` per deployment or use path prefix | Avoids needing per-preview DNS wildcard |

### Localhost subdomain alternative

For local multi-brand development without editing `/etc/hosts`, developers can use path prefix resolution. The `BRAND_SLUG` env var is the simplest override for local single-brand work. Documentation in `packages/ui/AGENTS.md` covers both approaches with examples.

---

## Default brand config

```typescript
// packages/ui/src/brands/enterprise.brand.ts

import type { BrandConfig } from "@enterprise/contracts";

const enterpriseBrand: BrandConfig = {
  slug: "enterprise",
  name: "enterprise",
  displayName: "Enterprise Platform",
  description: "The enterprise-grade SaaS platform template.",
  logo: {
    light: {
      src: "/images/enterprise/logo-light.svg",
      alt: "Enterprise Platform",
      width: 160,
      height: 32,
    },
    dark: {
      src: "/images/enterprise/logo-dark.svg",
      alt: "Enterprise Platform",
      width: 160,
      height: 32,
    },
  },
  favicon: "/images/enterprise/favicon.svg",
  metadata: {
    titleTemplate: "%s | Enterprise Platform",
    defaultTitle: "Enterprise Platform",
    description: "The enterprise-grade SaaS platform template for modern teams.",
    ogImage: "/images/enterprise/og-image.png",
  },
  legal: {
    // Replace these placeholder URLs with your actual legal pages before go-live
    privacyUrl: "#",
    termsUrl: "#",
  },
  social: {
    github: "https://github.com/your-org",
  },
  themeRef: "light",
  features: {
    showPoweredBy: true,
  },
  isDefault: true,
};

export default enterpriseBrand;
```

---

## BrandLogo component

```typescript
// packages/ui/src/brand/brand-logo.tsx

"use client";

import { useBrand } from "./provider";
import { useTheme } from "../theme/provider";

export interface BrandLogoProps {
  className?: string;
}

export function BrandLogo({ className }: BrandLogoProps) {
  const brand = useBrand();
  const { mode } = useTheme();

  const logoVariant = mode === "light" ? brand.logo.light : brand.logo.dark;

  // Text fallback when src is empty or undefined
  if (!logoVariant.src) {
    return (
      <span className={className} aria-label={logoVariant.alt}>
        {brand.displayName}
      </span>
    );
  }

  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={logoVariant.src}
      alt={logoVariant.alt}
      width={logoVariant.width}
      height={logoVariant.height}
      className={className}
    />
  );
}
```

---

## BrandMeta server helper

```typescript
// packages/ui/src/brand/brand-meta.ts

import type { Metadata } from "next";
import type { BrandConfig } from "@enterprise/contracts";

/**
 * Generates a Next.js Metadata object from a resolved BrandConfig.
 * Call this from generateMetadata() in ui/app/layout.tsx.
 *
 * @example
 * export async function generateMetadata() {
 *   const brand = await resolveBrand();
 *   return generateBrandMetadata(brand);
 * }
 */
export function generateBrandMetadata(brand: BrandConfig): Metadata {
  return {
    title: {
      template: brand.metadata.titleTemplate,
      default: brand.metadata.defaultTitle,
    },
    description: brand.metadata.description,
    icons: {
      icon: brand.favicon,
    },
    openGraph: {
      title: brand.metadata.defaultTitle,
      description: brand.metadata.description,
      images: brand.metadata.ogImage ? [brand.metadata.ogImage] : [],
    },
  };
}
```

---

## BrandFooter component

```typescript
// packages/ui/src/brand/brand-footer.tsx

"use client";

import { useBrand } from "./provider";

export interface BrandFooterProps {
  className?: string;
}

export function BrandFooter({ className }: BrandFooterProps) {
  const brand = useBrand();
  const currentYear = new Date().getFullYear();

  return (
    <footer className={className}>
      <p>
        © {currentYear} {brand.displayName}
      </p>

      <nav aria-label="Legal links">
        {brand.legal.privacyUrl && (
          <a href={brand.legal.privacyUrl} rel="noopener noreferrer">
            Privacy Policy
          </a>
        )}
        {brand.legal.termsUrl && (
          <a href={brand.legal.termsUrl} rel="noopener noreferrer">
            Terms of Service
          </a>
        )}
      </nav>

      {brand.social && (
        <nav aria-label="Social links">
          {brand.social.twitter && (
            <a href={brand.social.twitter} rel="noopener noreferrer" aria-label="Twitter">
              Twitter
            </a>
          )}
          {brand.social.linkedin && (
            <a href={brand.social.linkedin} rel="noopener noreferrer" aria-label="LinkedIn">
              LinkedIn
            </a>
          )}
          {brand.social.github && (
            <a href={brand.social.github} rel="noopener noreferrer" aria-label="GitHub">
              GitHub
            </a>
          )}
        </nav>
      )}

      {brand.features?.["showPoweredBy"] && (
        <p>
          <small>Powered by Enterprise Platform</small>
        </p>
      )}
    </footer>
  );
}
```

---

## Build pipeline

The brand abstraction layer has no standalone build pipeline. Brand configs are TypeScript files — they are type-checked by the existing `pnpm typecheck` step. The `brandConfigSchema` validation runs at module initialization (when the registry is first imported), which happens at Next.js server startup and during E2E test runs.

The existing theme build pipeline (`pnpm --filter @enterprise/ui build:theme`) handles custom theme JSON files when adopters create brand-specific themes. No new Turborepo tasks are required for the brand layer itself.

### Startup validation sequence

```
Next.js server starts
  │
  ├─ Imports root layout (ui/app/layout.tsx)
  │     └─ imports resolveBrand from @enterprise/ui/brand/resolve
  │           └─ imports brandRegistry from ./registry
  │                 └─ imports all *.brand.ts via brands/index.ts
  │                       ├─ brandConfigSchema.safeParse() for each config
  │                       ├─ Duplicate slug check
  │                       └─ themeRef existence check
  │                             ├─ PASS → registry Map is populated
  │                             └─ FAIL → process throws; server does not start
  │
  └─ First request: resolveBrand() → O(1) Map lookup → BrandProvider renders
```

---

## Testing strategy

### Unit tests

#### Registry tests — `packages/ui/src/brand/__tests__/registry.test.ts`

| Test | What it verifies |
|------|-----------------|
| Valid `enterprise.brand.ts` passes validation | Schema accepts the default brand config without errors |
| Missing required field (`slug`) throws on registry build | `buildRegistry()` throws with field path in error message |
| Invalid slug format (uppercase) is rejected | Slug regex rejects `"Enterprise"` with descriptive error |
| Duplicate slug throws before registry is returned | Two configs with `slug: "enterprise"` cause `buildRegistry()` to throw |
| `isDefault: true` on one brand makes it the default | `getDefaultBrand()` returns the brand with `isDefault: true` |
| No `isDefault` declared falls back to "enterprise" slug | `getDefaultBrand()` returns the `"enterprise"` brand when no `isDefault` is set |
| No "enterprise" brand and no `isDefault` throws | `getDefaultBrand()` throws with a descriptive error |
| `features` record rejects non-boolean values | `{ showPoweredBy: "yes" }` fails `z.record(z.string(), z.boolean())` |
| Empty `slug` string is rejected | `z.string().min(1)` produces a validation error identifying the field |
| `social.twitter` with invalid URL is rejected | `z.string().url()` rejects `"not-a-url"` |

#### Resolution tests — `packages/ui/src/brand/__tests__/resolve.test.ts`

| Test | What it verifies |
|------|-----------------|
| `BRAND_SLUG=enterprise` returns enterprise brand | Env var priority is highest; subdomain and path are not evaluated |
| `BRAND_SLUG=unknown` throws with available slugs in message | Startup error prevents serving when env var points to nonexistent brand |
| Subdomain `acme.platform.com` resolves to "acme" brand | First subdomain segment matched against registry |
| `platform.com` (no qualifying subdomain) falls back to default | Single-segment host triggers path/default fallback |
| `acme.localhost` does not resolve (only 1 dot) | Two-dot minimum for subdomain detection is correct |
| Path prefix `/acme/dashboard` resolves to "acme" brand | First path segment matched against registry |
| Unknown path prefix emits `console.warn` and falls back | Warning logged; default brand returned without throwing |
| `BRAND_SLUG` overrides subdomain (acme host + enterprise env var) | Env var wins regardless of request context |
| Static asset paths (`/favicon.ico`) do not emit brand warnings | File extension check suppresses false-positive path-prefix warnings |

#### BrandLogo tests — `packages/ui/src/brand/__tests__/brand-logo.test.tsx`

| Test | What it verifies |
|------|-----------------|
| Renders `logo.light.src` in light mode | `mode === "light"` causes `light` variant `src` to be rendered |
| Renders `logo.dark.src` in dark mode | `mode === "dark"` causes `dark` variant `src` to be rendered |
| `alt` attribute matches the active variant's `alt` field | Accessibility — alt is always from the correct variant |
| Empty `src` renders `displayName` text instead of `<img>` | Text fallback prevents broken image tag |
| `width` and `height` are passed to `<img>` when provided | Prevents layout shift |
| `className` prop is applied to root element | Consumer override works for both img and text fallback |
| Throws descriptive error outside `BrandProvider` | `useBrand()` throw message includes component name guidance |

#### Contract schema tests — `packages/contracts/src/__tests__/brand.test.ts`

| Test | What it verifies |
|------|-----------------|
| Full valid `BrandConfig` object passes | All required fields; all optional fields present |
| Minimal valid config (only required fields) passes | Optional fields (`social`, `features`, `isDefault`) are truly optional |
| Missing `slug` field is rejected with correct path | `ZodError.issues[0].path` includes `["slug"]` |
| Missing `logo.light.alt` is rejected | Nested field validation works; path is `["logo", "light", "alt"]` |
| `themeRef: ""` is rejected | `z.string().min(1)` catches empty string |
| `slug: "My Brand"` (spaces) is rejected | Slug regex rejects spaces and uppercase |
| `features: { enabled: 1 }` is rejected | `z.boolean()` rejects numeric value |
| `social.linkedin: "not-a-url"` is rejected | `z.string().url()` rejects non-URL strings |
| `metadata.titleTemplate: ""` is rejected | Empty title template is rejected |

### Contract tests

Schema validation tests in `packages/contracts/src/__tests__/brand.test.ts` serve as the contract test layer. They verify that the schema enforces all invariants independently of any runtime behavior, giving future consumers of `brandConfigSchema` a stable reference for what the schema accepts and rejects.

### E2E tests

Location: `ui/e2e/brand/brand.spec.ts`

| Test | Tag | Flow |
|------|-----|------|
| Default brand renders on root request | `@critical` | Navigate to `/` → assert `<title>` matches `enterprise.metadata.defaultTitle`, favicon `href` matches `enterprise.favicon`, footer contains `enterprise.legal.privacyUrl` link |
| Logo renders in light mode | `@critical` | Toggle theme to light → assert `BrandLogo` renders `<img>` with `src` matching `enterprise.logo.light.src` |
| Logo renders in dark mode | `@critical` | Toggle theme to dark → assert `BrandLogo` renders `<img>` with `src` matching `enterprise.logo.dark.src` |
| Text fallback when logo src is empty | | Set `BRAND_SLUG` to a test brand with empty `logo.light.src` → assert text node with `displayName` is rendered, no `<img>` tag |
| `BRAND_SLUG` env var forces single brand | | Set `BRAND_SLUG=enterprise` in `.env.test` → navigate to any path → assert enterprise brand metadata is rendered |
| Path-prefix brand resolution (acme) | | Register `acme` brand in test registry → navigate to `/acme/dashboard` → assert acme `displayName` appears in header logo alt |
| Unknown subdomain falls back gracefully | | Navigate with unknown subdomain (via host header mock or path override) → assert default brand renders, no error page |
| Footer legal links use brand URLs | | Assert footer `<a>` elements have `href` matching `enterprise.legal.privacyUrl` and `termsUrl` |
| `showPoweredBy` feature toggle hides badge | | Create a test brand with `features: { showPoweredBy: false }` → assert "Powered by" text is not rendered |
| Title template applies correctly | | Navigate to a page that sets a page title → assert browser `<title>` is `"Dashboard | Enterprise Platform"` |

---

## Trade-offs

| Decision | Chosen | Not chosen | Rationale |
|----------|--------|------------|-----------|
| Brand config location | Static `*.brand.ts` files in `packages/ui/src/brands/` | Database-driven config | Code-driven config gets git history, PR review, and Zod type safety for free. DB-driven config is a follow-up for runtime admin management. Infrequent brand identity changes do not justify the operational overhead of a DB in MVP. |
| Package ownership | Brand layer in `@enterprise/ui` | New `@enterprise/brand` package | Avoids a new package for MVP. `@enterprise/ui` already owns `ThemeProvider` — `BrandProvider` is a natural neighbor. Package extraction is a clean, non-breaking future step. |
| Theme integration approach | `themeRef` string field naming a theme JSON | Brand embeds token values directly | Decouples brand identity from design tokens. A brand declares which token set to use, not what the tokens are. This allows multiple brands to share a theme, and theme changes do not require brand config edits. |
| Resolution priority order | Env var → subdomain → path prefix → default | Any other order | Env var is the most explicit override (single-brand deploys). Subdomain is the canonical multi-brand production pattern. Path prefix is the local dev fallback. Default prevents hard failures. |
| Unknown slugs: throw or fall back | Fall back to default + emit `console.warn` | Throw a 500 error | Throwing on an unknown slug would break the app for CDN health-check subdomains, Vercel preview URLs, and DNS misconfiguration. Silent fallback with a warning gives operators the signal they need without breaking production. |
| Schema validation timing | Startup (module initialization) | Per-request validation | Per-request validation adds Zod overhead to every render. Brand configs are static; validating once at startup produces a fast fail with a clear error and zero per-request cost thereafter. |
| `BrandProvider` as a Server Component or Client Component | Client Component (wraps `ThemeProvider` which requires client) | Pure Server Component | `ThemeProvider` is a Client Component (uses `useState`). `BrandProvider` renders `ThemeProvider` internally, so it must also be a Client Component. Brand resolution (the server-side part) is separated into `resolveBrand()`, which runs in the Server Component (root layout). |
| Brand feature toggles location | `BrandConfig.features` record | Feature flags system | The feature flags system controls rollout and experimentation. Brand toggles control structural UI differences between brands (e.g., whether a brand shows a "Powered by" badge). Different concerns, different systems. |

---

## Risks

| Risk | Impact | Mitigation |
|------|--------|------------|
| Subdomain resolution fails in local development | Developer cannot test multi-brand locally via subdomain | Document path-prefix resolution as the local dev alternative; document `BRAND_SLUG` env var as the simplest single-brand override. |
| Adopters bypass `BrandProvider` and hardcode brand strings | Cross-brand inconsistencies; legal liability from wrong legal links | CI grep step that fails the build if specific brand string literals appear outside `*.brand.ts` files; linting guidance in `packages/ui/AGENTS.md`. |
| `themeRef` points to a non-existent theme JSON | Silent fallback to wrong theme or visual regression | `buildRegistry()` validates that `themeRef` resolves to an existing theme JSON file at startup; throws if not found, preventing the server from starting with a misconfigured brand. |
| Multiple brands with the same slug cause a registry collision | One brand silently overwrites another | `buildRegistry()` checks for duplicate slugs and throws before returning the registry. No request is ever served with an ambiguous registry. |
| Server Component / Client Component boundary breaks brand context | `useBrand()` returns null or throws unexpectedly | `BrandProvider` is a Client Component; `BrandContext` is initialized on the client; `useBrand()` throw error includes actionable guidance. Server-side brand access uses `resolveBrand()` directly — not the context. |
| Logo images are large and slow down initial page load | Poor Core Web Vitals; brand identity degrades UX | Documentation guidance to use SVGs for logos; `BrandLogo` accepts `width`/`height` for explicit sizing to prevent layout shift; adopter onboarding guide recommends SVG or optimized PNG. |
| Brand resolution adds latency to every request | Higher TTFB | Resolution is a pure in-memory Map lookup after startup; there is no I/O. Overhead is sub-millisecond. The `headers()` call adds one async operation, which is shared with other middleware already. |
| Placeholder legal URLs (`#`) shipped to production | Legal liability; broken links on live sites | Checklist item in `enterprise.brand.ts` comments; adopter onboarding guide flags this as a required pre-launch step; CI can grep for `privacyUrl: "#"` as a warning. |
| Brand configs grow complex with deeply nested fields | Hard to maintain; adopters make mistakes | `brandConfigSchema` intentionally keeps all fields at one or two levels; complexity that belongs in theme JSON (colors, spacing) is explicitly excluded from `BrandConfig`. |
| Next.js `headers()` behaves differently in edge vs. Node.js runtimes | `resolveBrand()` fails in edge runtime deployments | Document the Node.js runtime requirement for `resolveBrand()`; if edge runtime is needed, adopt `Request` parameter variant and pass the request from the layout. |

---

## Implementation phases

| Phase | Deliverable | Dependencies |
|-------|-------------|--------------|
| 1 | **Contracts**: `brandConfigSchema` Zod schema and all sub-schemas in `packages/contracts/src/schemas/brand.ts`; type exports; unit tests for schema validation; barrel export in `packages/contracts/src/index.ts` | None |
| 2 | **Registry and resolution**: `packages/ui/src/brand/registry.ts` (build registry, validate configs, duplicate slug check); `packages/ui/src/brand/resolve.ts` (`resolveBrand()` utility); default `enterprise.brand.ts`; `brands/index.ts` barrel; unit tests for registry and resolution | Phase 1 |
| 3 | **Brand context and provider**: `packages/ui/src/brand/context.ts`; `packages/ui/src/brand/provider.tsx` (`BrandProvider` + `useBrand()`); subpath exports in `packages/ui/package.json`; integration with root layout (`ui/app/layout.tsx`); `generateBrandMetadata()` helper; unit tests for provider and hook | Phase 2, existing `ThemeProvider` |
| 4 | **Brand UI components**: `BrandLogo` (light/dark variant switcher with text fallback); `BrandFooter` (legal links, social icons, optional "Powered by" badge); barrel export additions to `packages/ui/src/index.ts`; unit tests for each component; Sentry area `brand` registered | Phase 3 |
| 5 | **Seed data, E2E tests, and documentation**: `acme.brand.ts` example file (commented out); E2E tests in `ui/e2e/brand/brand.spec.ts` for all defined flows; `BRAND_SLUG` documented in `.env.example`; brand workflow documented in `packages/ui/AGENTS.md`; audit event `brand.config_loaded` emitted at startup via structured log | Phase 4 |

---

## Decisions log

| Decision | Outcome | Rationale |
|----------|---------|-----------|
| Where does brand config live — DB or code? | Static `*.brand.ts` files in MVP | Brand identity changes are infrequent and require design review. Code-driven config gets git history, PR review, and type safety for free. DB-driven config is a follow-up for runtime admin management. |
| One package or new `@enterprise/brand`? | Brand provider and resolver live in `@enterprise/ui`; schema lives in `@enterprise/contracts` | Avoids a new package for MVP. `@enterprise/ui` already owns `ThemeProvider` and the design token layer. If the brand API grows significantly, extracting to `@enterprise/brand` is a clean future step that the dependency direction already permits. |
| How does brand select a theme? | `themeRef` string field naming a theme JSON by its `metadata.name` | Decouples brand identity from theme tokens. A brand does not embed token values; it declares which token set to use. Adopters can share themes across brands or create brand-specific themes independently. |
| Resolution priority order? | Env var → subdomain → path prefix → default | Env var is the simplest override for single-brand deploys. Subdomain is the canonical multi-brand production pattern. Path prefix is the local dev fallback that requires no system configuration. Default brand prevents hard failures. |
| Should `BrandProvider` be a Server Component? | Client Component — it wraps `ThemeProvider` which requires `useState` | The resolution and prop-passing happen server-side in the root layout. `BrandProvider` itself must be a Client Component because it renders `ThemeProvider`. The separation is: resolve on the server, provide on the client. |
| Are brand feature toggles in `BrandConfig` or the feature flags system? | Brand-scoped toggles in `BrandConfig.features`; rollout toggles in the feature-flags system | They serve different purposes. `BrandConfig.features` controls structural UI differences between brands (e.g., "Powered by" badge). The feature-flags system controls rollout, experimentation, and tenant-level gates. |
| Should unknown slugs throw or fall back? | Fall back to default brand + emit `console.warn` | Throwing on an unknown slug would break the app for CDN health-check subdomains, Vercel preview URLs, and DNS misconfiguration scenarios. Silent fallback with a warning allows the app to continue serving and gives operators the signal they need. |
| Is `BrandConfig` validated per-request or at startup? | At startup (module initialization when registry is first imported) | Per-request validation adds Zod overhead to every render. Brand configs are static; validating once at startup is sufficient and produces a fast fail with a clear error message before any request is served. |
| Should `resolveBrand()` accept a `Request` parameter? | Optional `Request` parameter reserved for future edge runtime support; MVP uses `next/headers` | The `next/headers` API covers all Node.js runtime use cases. If edge runtime support is needed in a future iteration, the `Request` variant is a non-breaking extension: `resolveBrand(request?: Request)`. |

---

*Last updated: 2026-05-11*
