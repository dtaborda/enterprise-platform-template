---
title: "Brand abstraction layer PRD"
description: "Defines product requirements for a provider-agnostic branding layer that lets the Enterprise Platform template support multiple visual identities from a single codebase."
owner: "Engineering"
lastUpdated: "2026-05-11"
---

# Brand abstraction layer PRD

## Purpose

Define implementation-ready product requirements for a brand abstraction layer that lets the Enterprise Platform template host multiple visual identities (brands) from a single codebase, without requiring a separate Next.js application per brand. This layer sits above the existing theme system: the theme system provides design tokens (colors, typography, spacing, shadows), and the brand layer selects which theme to apply and adds the identity artifacts that surround it — name, logo, metadata, legal URLs, social links, and brand-scoped feature toggles.

## Scope

- Included: `BrandConfig` Zod schema in `@enterprise/contracts`, `BrandProvider` React context, `useBrand()` hook, brand resolution strategy (subdomain, path prefix, environment variable, static config), single-brand default ("enterprise" brand ships with the template), architecture that allows adopters to add brands via config with no code changes, integration with the existing theme system, admin-visible audit trail for brand config changes, and E2E coverage for brand rendering.
- Excluded: runtime brand switching per end-user session, multi-tenant branding (one brand per tenant — covered by the theme system's `tenantId` field), visual brand editor UI, A/B testing across brands, brand-level analytics dashboards, and white-label billing (separate billing feature).

---

## Problem

Template adopters who build multi-brand products (e.g., a product sold under multiple labels, a platform with regional sub-brands, a white-label offering) currently have no standard pattern for branding within the template. The common workaround — forking a separate Next.js app per brand — duplicates infrastructure, increases maintenance burden, and diverges codebases. The result is that adopters reimplement the same brand-switching primitives in isolation, often inconsistently.

The theme system introduced JSON-configurable design tokens and a `ThemeProvider`, but it does not define what a "brand" is. It resolves colors and spacing; it does not capture the logo files, the legal URLs, the Open Graph metadata, or the feature toggles that differ across brands. That gap is what this layer fills.

## Users and stakeholders

| Role | Need |
|------|------|
| Template adopter (engineer) | A documented, config-driven pattern to add a second brand without touching shared code |
| Product designer | A single place to register logo assets, color theme reference, and typography per brand |
| Platform engineer | Reliable brand context throughout the component tree with zero prop-drilling |
| End user | Consistent, correct brand identity rendered on every page they visit |
| Platform admin | Audit visibility when brand configuration is changed in production |

## Goals

- Provide a `BrandConfig` schema (Zod) that is the single source of truth for what a brand is.
- Deliver a `BrandProvider` + `useBrand()` hook that makes brand context available throughout the component tree.
- Define and implement a brand resolution strategy that determines which brand to render per request, configurable via subdomain, path prefix, or environment variable.
- Ship the template with exactly one brand out of the box ("enterprise") so adopters have a working starting point.
- Design the architecture so that adding a second brand requires only a new config file — no code changes.

---

## Permission matrix

The brand abstraction layer does not expose a management UI in MVP. Brand configuration is code-driven (committed config files). The permission matrix below applies to admin-visible audit records of brand config deployments and to any brand-config endpoints added in future iterations.

| Action | Platform admin | Tenant owner | Tenant admin | Member | Guest |
|--------|---------------|-------------|-------------|--------|-------|
| Read active brand config (via `useBrand()`) | Yes | Yes | Yes | Yes | Yes |
| View brand config audit events | Yes | No | No | No | No |
| Modify brand config (code deploy) | Platform admin (dev workflow) | No | No | No | No |
| Override brand per tenant (future) | Yes | No | No | No | No |

> **Note**: In MVP, brand config changes are deployed via code commits. There is no runtime admin UI for editing brand config. The audit event is emitted at application startup when the resolved brand config is loaded.

---

## MVP scope

### Core capabilities

**BrandConfig schema (`@enterprise/contracts`)**

A `brandConfigSchema` (Zod) with the following fields:

- `slug` — URL-safe identifier, unique per brand (e.g., `"enterprise"`, `"acme"`)
- `name` — Internal identifier used in audit events and logs
- `displayName` — Human-readable brand name shown in UI headings and footers
- `description` — Short description used in meta tags and internal docs
- `logo` — Object with `light` and `dark` variants, each containing `src` (path or URL), `alt` text, and optional `width`/`height`
- `favicon` — Path or URL to the favicon asset
- `metadata` — Object with `titleTemplate` (e.g., `"%s | Acme"`), `defaultTitle`, `description` (default OG/meta description), and `ogImage` (path or URL)
- `legal` — Object with `privacyUrl` and `termsUrl`
- `social` — Optional object with `twitter`, `linkedin`, `github` (each a URL string)
- `themeRef` — String key referencing which theme JSON file to apply (e.g., `"light"`, `"dark"`, `"acme-light"`). The theme system resolves this reference to load the corresponding token set.
- `features` — Optional record of `string → boolean` for brand-scoped feature toggles (e.g., `{ "showPoweredBy": true, "enablePublicApi": false }`)

**Brand config files (`packages/ui/src/brands/`)**

Each brand is a TypeScript file (`{slug}.brand.ts`) that exports a `BrandConfig` object validated against `brandConfigSchema`. The template ships with `enterprise.brand.ts` as the only required brand. Adopters add brands by creating additional files in this directory.

**BrandProvider (`packages/ui/src/brand/provider.tsx`)**

A React Server Component-compatible provider that:

1. Accepts a resolved `BrandConfig` as a prop (it does not resolve — resolution happens at the server boundary)
2. Places the config into React context via `BrandContext`
3. Applies the referenced theme by triggering the existing `ThemeProvider` with the `themeRef` value

**useBrand() hook (`packages/ui/src/brand/provider.tsx`)**

A client-side hook that reads `BrandContext` and returns the full `BrandConfig`. Throws if called outside a `BrandProvider`.

**Brand resolution (`packages/ui/src/brand/resolve.ts`)**

A server-side utility `resolveBrand(request?: Request): BrandConfig` that determines which brand to render using the following priority order:

1. `BRAND_SLUG` environment variable — highest priority; forces a single brand regardless of request context (suitable for single-brand deployments)
2. Subdomain matching — extracts the first subdomain segment from the request hostname and matches it against registered brand slugs (e.g., `acme.platform.com` → slug `"acme"`)
3. Path prefix matching — matches the first path segment against registered brand slugs (e.g., `/acme/dashboard` → slug `"acme"`)
4. Default brand — falls back to the brand with `isDefault: true` in the brand registry, or to `"enterprise"` if no default is declared

The brand registry is a static import of all `*.brand.ts` files in `packages/ui/src/brands/`. There is no database lookup in MVP.

**Theme integration**

`BrandProvider` reads `themeRef` from the resolved `BrandConfig` and passes it to `ThemeProvider` as the initial theme. The theme system's existing token resolution pipeline (`resolve.ts`, `generate-css.ts`) handles the rest. Brands that want a custom theme create a new `{slug}-light.json` / `{slug}-dark.json` in `packages/ui/src/themes/` and reference them in `themeRef`. Brands that share the default theme simply point `themeRef` to `"light"` or `"dark"`.

**Integration in the Next.js app**

`ui/app/layout.tsx` calls `resolveBrand()` at the server component level, passes the result to `BrandProvider`, and wraps children. This makes brand context available to all pages and layouts below it with no per-route changes required.

### Out of scope (MVP)

- Runtime brand switching per authenticated session (each request resolves a brand; the user cannot toggle it).
- Admin UI for editing or creating brand configs without a code deploy.
- Database-driven brand config storage.
- Brand-level A/B experimentation.
- Brand inheritance or partial override from a parent brand.
- Per-tenant brand assignment (a tenant always sees the brand the platform resolves for the request).
- Automated asset optimization or CDN upload for brand logos.
- Brand-specific routing namespaces (e.g., separate sitemaps per brand).

---

## UX specification

### Route

No dedicated route. The brand abstraction layer is infrastructure — it affects every page rendered by the app. There is no `/brand` settings page in MVP.

### Page layout (brand impact on rendered pages)

The brand layer affects the following layout zones on every page:

```
┌──────────────────────────────────────────────────────────────────┐
│ <head>                                                           │
│   <title>{brand.metadata.titleTemplate} → resolved per page</title>│
│   <meta name="description" content="{brand.metadata.description}">│
│   <link rel="icon" href="{brand.favicon}">                       │
│   <meta property="og:image" content="{brand.metadata.ogImage}">  │
├──────────────────────────────────────────────────────────────────┤
│ Navigation / header                                              │
│   <img src="{brand.logo[mode].src}" alt="{brand.logo[mode].alt}" │
│        width="{brand.logo[mode].width}" />                       │
├──────────────────────────────────────────────────────────────────┤
│ Page content (theme tokens resolved from brand.themeRef)         │
│   CSS variables from the referenced theme JSON are active here   │
├──────────────────────────────────────────────────────────────────┤
│ Footer                                                           │
│   {brand.displayName}  ·  Privacy  ·  Terms                     │
│   (links from brand.legal.privacyUrl / brand.legal.termsUrl)     │
│   Social icons (brand.social.*)                                  │
└──────────────────────────────────────────────────────────────────┘
```

### Components and interactions

| Component | Behavior |
|-----------|----------|
| **BrandProvider** | Server-side: wraps the entire app in `ui/app/layout.tsx`. Accepts resolved `BrandConfig` prop. Internally renders `ThemeProvider` with `themeRef`. No visible UI. |
| **BrandLogo** | Reads `useBrand()`, reads current theme mode from `useTheme()`, renders `<img>` with the correct light/dark logo `src` and `alt`. Falls back to `displayName` text if `src` is empty. |
| **BrandMeta** (Next.js `generateMetadata`) | A server-side metadata generator helper that reads the resolved `BrandConfig` and returns a Next.js `Metadata` object — title template, description, favicon, and OG image. |
| **BrandFooter** | Reads `useBrand()`, renders `displayName`, legal links from `brand.legal`, and social icon links from `brand.social`. |
| **useBrand()** | Client hook. Returns the full `BrandConfig` from context. Throws if called outside `BrandProvider`. |

### UI states

| State | Behavior |
|-------|----------|
| **Single brand (default)** | `BRAND_SLUG=enterprise` or no config overrides. All pages render the "enterprise" brand. |
| **Multi-brand via subdomain** | Request to `acme.platform.com` resolves to `"acme"` brand. Logo, theme, metadata, and legal links all reflect the Acme brand. |
| **Unknown brand slug** | `resolveBrand()` falls back to the default brand and emits a warning log. No error page. |
| **Missing logo asset** | `BrandLogo` renders brand `displayName` as text fallback. No broken image tag. |
| **themeRef not found** | `ThemeProvider` falls back to the built-in light theme and emits a warning. No crash. |

### Role-specific visibility

Brand configuration is not role-gated in MVP. All users who access a URL receive the brand resolved for that URL. There is no per-user brand selection.

---

## User stories and acceptance criteria

### US-1: Brand context is available throughout the component tree

**As** a platform engineer, **I want** brand config to be injected at the root layout so every component can access it without prop-drilling.

Acceptance criteria:
1. `BrandProvider` wraps `ui/app/layout.tsx` and receives the resolved `BrandConfig`.
2. Any client component can call `useBrand()` and receive the full `BrandConfig` object.
3. Calling `useBrand()` outside a `BrandProvider` throws a descriptive error with the component name in the message.
4. `BrandProvider` renders `ThemeProvider` internally with the theme referenced by `themeRef`.

### US-2: Logo renders the correct variant for the active theme mode

**As** an end user, **I want** to see a logo that is legible in both light and dark mode so the brand identity is always clear.

Acceptance criteria:
1. `BrandLogo` reads `useTheme().mode` and `useBrand().logo`.
2. When mode is `"light"`, the `logo.light.src` image is rendered.
3. When mode is `"dark"`, the `logo.dark.src` image is rendered.
4. When the `src` field is empty or undefined, `BrandLogo` renders `brand.displayName` as a text fallback.
5. The `alt` attribute is always set to `logo[mode].alt`.

### US-3: Page metadata reflects the active brand

**As** a product designer, **I want** every page's `<title>`, favicon, and Open Graph image to match the active brand so SEO and social sharing are brand-accurate.

Acceptance criteria:
1. `generateMetadata` in `ui/app/layout.tsx` uses the resolved `BrandConfig` to set `title.template`, `title.default`, `description`, `icons.icon`, and `openGraph.images`.
2. The title template formats correctly: a page titled "Dashboard" with template `"%s | Acme"` produces `"Dashboard | Acme"`.
3. Changing `brand.metadata.ogImage` to a different URL is reflected in `<meta property="og:image">` without any code change.

### US-4: Legal footer links always match the active brand

**As** a legal team member, **I want** every page's footer to link to the correct privacy policy and terms of service for the active brand so there is no cross-brand legal liability.

Acceptance criteria:
1. The footer reads `useBrand().legal.privacyUrl` and `useBrand().legal.termsUrl`.
2. Both links are rendered as `<a>` elements with the exact URLs defined in the brand config.
3. When a URL is an empty string, the corresponding link is not rendered.

### US-5: Adopter adds a second brand with no code changes

**As** a template adopter, **I want** to add a new brand by creating a single config file so I can serve multiple brands without forking shared code.

Acceptance criteria:
1. Creating `packages/ui/src/brands/acme.brand.ts` with a valid `BrandConfig` object is sufficient to register the brand.
2. The brand becomes resolvable via subdomain (`acme.localhost`) or path prefix (`/acme`) without any other changes.
3. The `brandConfigSchema` Zod validation rejects the file at startup if any required field is missing, with a descriptive error message identifying the field and the brand slug.
4. The template's unit tests include a test verifying that the default "enterprise" brand validates against the schema.

### US-6: Brand resolves correctly from subdomain

**As** a platform engineer, **I want** the brand to be automatically selected based on the request subdomain so I can serve multiple brands from one deployment.

Acceptance criteria:
1. A request to `acme.platform.com` resolves to the brand with `slug: "acme"`.
2. A request to `platform.com` (no recognized subdomain) falls back to the default brand.
3. A request to `unknown.platform.com` where `"unknown"` has no matching brand also falls back to the default brand, and a `console.warn` is emitted with the unrecognized slug.
4. The `BRAND_SLUG` environment variable overrides subdomain resolution when set.

### US-7: Brand resolves correctly from environment variable

**As** a platform engineer, **I want** to force a single brand via environment variable for single-brand deployments so I do not need subdomain configuration.

Acceptance criteria:
1. Setting `BRAND_SLUG=enterprise` causes all requests to resolve to the "enterprise" brand, regardless of subdomain or path.
2. Setting `BRAND_SLUG` to an unrecognized slug throws a startup error with a message identifying the invalid slug and listing available slugs.
3. When `BRAND_SLUG` is not set, resolution falls through to subdomain and then path prefix strategies.

### US-8: Brand feature toggles are accessible in components

**As** a platform engineer, **I want** to define brand-specific boolean feature toggles in the brand config so I can conditionally show UI elements that differ across brands.

Acceptance criteria:
1. `useBrand().features` returns the record of feature toggles defined in the brand config.
2. A component can read `brand.features["showPoweredBy"]` and conditionally render a "Powered by Enterprise" badge.
3. An undefined feature key returns `undefined` (not a thrown error).
4. Feature toggles in `BrandConfig` are validated as `z.record(z.string(), z.boolean())` — non-boolean values are rejected by the schema.

### US-9: Brand config schema rejects invalid configs at startup

**As** a platform engineer, **I want** invalid brand configs to be caught before the app starts serving traffic so misconfigured brands never reach end users.

Acceptance criteria:
1. The `resolveBrand()` utility validates all registered brand configs against `brandConfigSchema` at module initialization.
2. If any brand config fails validation, the process throws with a detailed Zod error including the brand slug and the specific failing field path.
3. Valid configs pass through without performance impact (validation is build-time or startup-time, not per-request).

---

## Success metrics

- Time for an adopter to add a second brand (target: under 30 minutes, measured from starting to the brand rendering in a local dev environment).
- Number of hardcoded brand strings found outside `BrandConfig` files after implementation (target: 0 — verified by grep in CI).
- Percentage of E2E test runs that correctly render brand-specific logo, metadata, and legal links for each registered brand (target: 100%).
- Zero cross-brand metadata leaks (page of brand A never renders metadata from brand B, verified by E2E assertions on `<title>` and OG tags).
- Adoption rate by template forks that create more than one brand (tracked via optional telemetry if adopters opt in — not required).

## Risks

| Risk | Mitigation |
|------|------------|
| Subdomain resolution fails in local development where `localhost` has no subdomains | Provide path-prefix resolution as local dev fallback; document the `BRAND_SLUG` env var as the simplest local override |
| Brand config grows large and complex, making it hard to manage | Keep `BrandConfig` intentionally flat; reject any complex nesting that can live in the theme JSON instead |
| Adopters bypass `BrandProvider` and hardcode brand strings in components | Lint rule (custom Biome rule or grep in CI) that fails the build if specific string literals appear outside brand config files |
| `themeRef` points to a non-existent theme file, causing a silent fallback | `resolveBrand()` validates that `themeRef` resolves to an existing theme file at startup; throws if not found |
| Multiple brands sharing the same slug cause a registry collision | `brandConfigSchema` enforces that slug is unique across all registered files; startup throws on duplicate slugs |
| Logo images are large and slow down initial page load | Documentation guidance to use SVGs for logos; `BrandLogo` accepts `width`/`height` for explicit sizing; no automatic optimization in MVP |
| Brand resolution adds latency to every request | Resolution is pure in-memory lookup (no I/O, no DB); performance impact is negligible |
| Server Component / Client Component boundary breaks brand context | `BrandProvider` is a Server Component that initializes the context; `useBrand()` is a Client hook — documented clearly with a usage example |

---

## Traceability

### Audit events

| Event | Trigger | Metadata |
|-------|---------|----------|
| `brand.config_loaded` | Application startup — brand config files are validated and the registry is built | `{ brandSlugs: string[], defaultBrand: string, resolvedAt: ISO8601 }` |
| `brand.resolution_fallback` | `resolveBrand()` falls back to the default brand because the requested slug is not recognized | `{ requestedSlug: string, resolvedSlug: string, strategy: "subdomain" \| "path" }` |
| `brand.config_invalid` | A brand config file fails Zod validation at startup | `{ brandSlug: string, validationErrors: ZodIssue[] }` — process exits after this event |

> **Note**: In MVP, brand config is code-driven. Audit events are application-lifecycle events, not user-action events. They are emitted to the server log (structured JSON) and to the Sentry breadcrumb trail. A future admin UI for runtime brand management would add user-action audit events.

### Sentry

- Area: `brand`
- Instrumented actions: `resolveBrand()` (wraps the full resolution pipeline), `BrandProvider` initialization, `useBrand()` hook (when thrown outside provider)
- Captured errors: invalid brand config at startup, missing `themeRef` target, unrecognized brand slug when fallback is disabled, `useBrand()` called outside `BrandProvider`
- PII exclusions: no user PII is associated with brand config; `requestedSlug` from subdomain/path is not user PII and is safe to capture
- Allowed metadata: `brandSlug`, `themeRef`, `resolvedStrategy` (`"env"` | `"subdomain"` | `"path"` | `"default"`), `availableSlugs`, `errorCode`

### Seed data

| Entity | State | Details |
|--------|-------|---------|
| Brand config | `valid` | `enterprise.brand.ts` — default brand; `slug: "enterprise"`, `themeRef: "light"`, logo uses placeholder SVG, legal URLs point to `#` (to be replaced by adopter) |
| Brand config | `example` | `acme.brand.ts` — second brand included as a commented-out example file; demonstrates adding a brand with a different `themeRef: "acme-light"` and distinct logo paths |
| Theme JSON | `valid` | `packages/ui/src/themes/light.json` and `dark.json` — already exists; referenced by `enterprise` brand |

### E2E flows

| Scenario | Actor | Expected outcome |
|----------|-------|-----------------|
| Default brand renders on root request | Anonymous user | Page title matches `enterprise.metadata.titleTemplate`, favicon matches `enterprise.favicon`, footer shows `enterprise.legal.privacyUrl` and `enterprise.legal.termsUrl` |
| Logo switches when theme mode is toggled | Authenticated user | Clicking the theme toggle causes `BrandLogo` to render `logo.dark.src` in dark mode and `logo.light.src` in light mode |
| Path-prefix brand resolution | Anonymous user | Navigating to `/acme/dashboard` (with acme brand registered) renders Acme `displayName` in the header logo alt text |
| BRAND_SLUG env var forces single brand | System | Setting `BRAND_SLUG=enterprise` in `.env.test` causes all requests (including to `acme.*` subdomains) to render the enterprise brand |
| Invalid brand slug falls back gracefully | Anonymous user | Navigating with an unknown subdomain or path prefix renders the default brand with no error page |
| Missing logo src renders text fallback | Anonymous user | When `logo.light.src` is empty string, `BrandLogo` renders the `displayName` as a text node instead of a broken `<img>` |

### External adapters

| Provider | Interface | Local mode | Production mode | Env var |
|----------|-----------|------------|-----------------|---------|
| Brand config source | Static file system — `packages/ui/src/brands/*.brand.ts` | In-process module imports; no network call | Same — static imports bundled at build time | `BRAND_SLUG` (optional override) |
| Logo assets | Static file reference (`src` field in `BrandConfig`) | Local path (e.g., `/images/logo-light.svg` served by Next.js) | CDN URL or Vercel-served static asset | No env var — path is in the brand config file |

### Production readiness

- [ ] `brandConfigSchema` unit tests cover all required fields, optional fields, and invalid cases (wrong types, empty slug, malformed URL)
- [ ] `resolveBrand()` unit tests cover: `BRAND_SLUG` override, subdomain match, path-prefix match, fallback to default, and unknown-slug warning
- [ ] `BrandProvider` + `useBrand()` integration test verifies context availability and throws correctly outside provider
- [ ] `BrandLogo` unit test verifies light/dark variant switching and text fallback when src is empty
- [ ] E2E tests pass for all defined flows
- [ ] `enterprise.brand.ts` validates against `brandConfigSchema` in CI (schema snapshot test)
- [ ] No hardcoded brand strings outside `*.brand.ts` files (enforced by CI grep step)
- [ ] `BRAND_SLUG` environment variable documented in `.env.example` with a comment explaining the resolution strategy
- [ ] `packages/ui/src/brands/` directory documented in `packages/ui/AGENTS.md` with the pattern for adding new brands
- [ ] `BrandProvider` wrapping order documented: `BrandProvider` → `ThemeProvider` (internal) → app children
- [ ] Startup validation logs are structured JSON and captured by the observability pipeline
- [ ] Sentry area `brand` registered; `resolveBrand()` and `BrandProvider` instrumented
- [ ] `brand.config_loaded` audit event visible in server logs on clean startup with the default brand
- [ ] Logo asset paths use absolute `/public/` paths or full CDN URLs — no relative paths
- [ ] `BrandConfig.legal.privacyUrl` and `termsUrl` placeholder values are replaced in `enterprise.brand.ts` before go-live (checked by adopter onboarding guide)

---

## Decisions log

| Decision | Outcome | Rationale |
|----------|---------|-----------|
| Where does brand config live — DB or code? | Static config files (`*.brand.ts`) in MVP | Brand identity changes are infrequent and require design review; code-driven config gets git history, PR review, and type safety for free. DB-driven config is a follow-up for runtime admin management. |
| One package or new `@enterprise/brand`? | Brand provider and resolver live in `@enterprise/ui`; schema lives in `@enterprise/contracts` | Avoids a new package for MVP. `@enterprise/ui` already owns `ThemeProvider` and the design token layer — `BrandProvider` is a natural neighbor. If the brand API grows significantly, extracting to `@enterprise/brand` is a clean future step. |
| How does brand select a theme? | `themeRef` string field that names a theme JSON file | Decouples brand identity from theme tokens. A brand does not embed token values; it declares which token set to use. Adopters can share themes across brands or create brand-specific themes independently. |
| Resolution priority order? | Env var → subdomain → path prefix → default | Env var is the simplest override (single-brand deploys). Subdomain is the canonical multi-brand pattern (one domain per brand). Path prefix is the local dev fallback. Default brand prevents hard failures. |
| Should `BrandProvider` be a Server Component? | Yes — it receives a pre-resolved `BrandConfig` from the server boundary | Brand resolution must happen at the server boundary to avoid client-side flickering. `BrandProvider` itself uses React context, which requires a Client Component context object, but the resolution and prop-passing happen server-side. |
| Are brand feature toggles in `BrandConfig` or in the feature flags system? | Both are valid; brand-scoped toggles live in `BrandConfig.features` for brand-specific UI differences | Feature flags (the feature-flags system) control rollout and experimentation across tenants. Brand toggles in `BrandConfig` control structural UI differences between brands (e.g., whether a brand shows a "Powered by" badge). They serve different purposes. |
| Should unknown slugs throw or fall back? | Fall back to default brand + emit a warning | Throwing on an unknown slug would break the app for misconfigured subdomains (e.g., CDN health check subdomains). Silent fallback with a warning allows the app to continue serving and gives operators the signal they need. |
| Is `BrandConfig` validated per-request or at startup? | At startup (module initialization) | Per-request validation would add latency and repeated Zod overhead. Brand configs are static; validating once at startup is sufficient and produces a fast fail with a clear error message. |

---

*Last updated: 2026-05-11*
