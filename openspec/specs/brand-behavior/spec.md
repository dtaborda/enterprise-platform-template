# Spec: brand-behavior

> **Domain**: brand-behavior
> **Introduced by**: change #14 — brand-and-decoupling (behavior first established)
> **Promoted to canonical by**: change #15 — brand-isolation (PRs #125, #126, #127; merged to main @ 92fcf6b)
> **Last amended by**: change #16 — e2e-stability-hardening (PR #129; merged to main @ e933a80) — added Root Layout SSR Theme Consistency
> **Status**: canonical — all requirements are ACTIVE
>
> Note: All behavior is implemented in `@enterprise/brand` (post-isolation).
> Import paths changed from `@enterprise/ui/brand/*` to `@enterprise/brand/*` in change #15.
> Logic, signatures, and outputs are unchanged from #14.

---

## Requirement: resolveBrand() Resolution Strategy

`resolveBrand()` exported from `@enterprise/brand/resolve` MUST implement the
priority chain in this order:

1. `BRAND_SLUG` env var — match registered brand slug or throw with available slugs listed
2. Subdomain detection: `host.split(".").length > 2` → first segment matched against registry
3. Path prefix: first path segment matched against registry (skip segments containing ".")
4. `getDefaultBrand()` fallback — never throws on fallback; warns via `console.warn` on unrecognized slug

`resolveBrand()` is server-only (uses `next/headers`).

### Scenario: BRAND_SLUG env override forces brand

- GIVEN `process.env.BRAND_SLUG = "acme"` and `acme` is registered
- WHEN `resolveBrand()` is called
- THEN it returns the `acme` BrandConfig

### Scenario: Unknown BRAND_SLUG throws descriptively

- GIVEN `process.env.BRAND_SLUG = "ghost-brand"`
- WHEN `resolveBrand()` is called
- THEN it throws an error that includes the list of available brand slugs

### Scenario: Default brand resolves when no env override

- GIVEN `BRAND_SLUG` is unset and `enterprise` brand has `isDefault: true`
- WHEN `resolveBrand()` is called without a subdomain or path match
- THEN it returns the `enterprise` BrandConfig

### Scenario: Unrecognized subdomain warns and falls back

- GIVEN request host is `unknown.example.com`
- WHEN `resolveBrand()` is called
- THEN `console.warn` is called once and `getDefaultBrand()` result is returned (no throw)

### Scenario: Static asset paths do not trigger brand detection

- GIVEN request path is `/_next/static/chunk.js`
- WHEN `resolveBrand()` is called
- THEN path-prefix resolution is skipped (segment contains ".")
- AND default brand is returned

---

## Requirement: BrandProvider Wraps ThemeProvider

`BrandProvider` exported from `@enterprise/brand/provider` MUST:
- Accept `brand: BrandConfig` and `children: ReactNode` props
- Seed `BrandContext` with the provided `brand`
- Wrap children in `ThemeProvider` (imported from `@enterprise/ui`)
- Derive `defaultMode`: `themeRef` ending in `"light"` → `"light"`, otherwise → `"dark"`

### Scenario: useBrand() returns brand inside provider

- GIVEN `BrandProvider` is rendered with `brand={enterpriseBrand}`
- WHEN a descendant calls `useBrand()`
- THEN it receives `enterpriseBrand`

### Scenario: ThemeProvider receives derived mode

- GIVEN `brand.themeRef = "enterprise-dark"`
- WHEN `BrandProvider` renders
- THEN `ThemeProvider` is mounted with `defaultMode="dark"`

### Scenario: useBrand() throws outside provider

- GIVEN a component calls `useBrand()` with no ancestor `BrandProvider`
- WHEN the component renders
- THEN it throws an error containing the string `"<BrandProvider>"`

---

## Requirement: BrandLogo Renders Correct Theme Variant

`BrandLogo` exported from `@enterprise/brand/brand-logo` MUST:
- Read `useBrand().logo` and `useTheme().mode`
- Render `<img src alt>` for the active mode variant
- Render `<span>{brand.displayName}</span>` when the active variant `src` is empty
- Forward `className` to the root element

### Scenario: Dark mode renders dark logo src

- GIVEN theme mode is `"dark"` and `brand.logo.dark.src = "/logo-dark.svg"`
- WHEN `BrandLogo` renders
- THEN `<img src="/logo-dark.svg">` appears in the DOM

### Scenario: Empty src renders displayName fallback

- GIVEN `brand.logo.light.src = ""` and theme mode is `"light"`
- WHEN `BrandLogo` renders
- THEN a `<span>` containing `brand.displayName` is rendered (no `<img>`)

---

## Requirement: BrandFooter Renders Legal and Social Links

`BrandFooter` exported from `@enterprise/brand/brand-footer` MUST:
- Render `© {year} {brand.displayName}` copyright notice
- Render legal `<a>` links only when the URL string is non-empty
- Render social links when `brand.social` is defined
- Render "Powered by" attribution when `brand.features?.showPoweredBy === true`

### Scenario: Non-empty legal URL renders link

- GIVEN `brand.legal.privacyUrl = "https://example.com/privacy"`
- WHEN `BrandFooter` renders
- THEN `<a href="https://example.com/privacy">` is present in the DOM

### Scenario: Empty legal URL omits link

- GIVEN `brand.legal.termsUrl = ""`
- WHEN `BrandFooter` renders
- THEN no `<a>` anchor with an empty or terms-related href is rendered

---

## Requirement: generateBrandMetadata() Maps to Next.js Metadata

`generateBrandMetadata(brand: BrandConfig)` exported from `@enterprise/brand/metadata`
MUST return a Next.js `Metadata` object with the following field mapping:

| Output field | Source |
|---|---|
| `title.template` | `"%s \| " + brand.metadata.titleTemplate` |
| `title.default` | `brand.metadata.titleTemplate` |
| `description` | `brand.metadata.description` |
| `icons.icon` | `brand.favicon` |
| `openGraph.images` | `[brand.metadata.ogImage]` when non-empty, else `[]` |

### Scenario: All metadata fields mapped correctly

- GIVEN a BrandConfig with all metadata fields populated
- WHEN `generateBrandMetadata(brand)` is called
- THEN `title.default`, `description`, `icons.icon`, and `openGraph.images` match the mapping table

### Scenario: Empty ogImage yields empty array

- GIVEN `brand.metadata.ogImage = ""`
- WHEN `generateBrandMetadata(brand)` is called
- THEN `openGraph.images` is `[]`

---

## Requirement: Root Layout SSR Theme Consistency

The root layout Server Component (`ui/app/layout.tsx`) MUST derive the initial `data-theme`
attribute on `<html>` from the resolved brand's `themeRef`, using the same rule as
`BrandProvider`: `themeRef.endsWith("light") → "light"`, otherwise `"dark"`.

Hard-coding `data-theme` to any literal value is PROHIBITED.

`suppressHydrationWarning` on `<html>` MUST be retained so that user localStorage overrides do
not produce React hydration errors.

The shared pure helper `deriveThemeMode(themeRef: string): ThemeMode` exported from
`@enterprise/brand/theme-mode` is the single source of truth for this rule and MUST be used by
both `layout.tsx` and `BrandProvider` to prevent drift.

### Scenario: Light brand — SSR data-theme=light, no flash

- GIVEN the resolved brand has `themeRef` ending in `"light"` (e.g., enterprise, `themeRef: "light"`)
- AND the browser `localStorage` is empty (fresh session or cleared in beforeEach)
- WHEN any page renders on the server and hydrates on the client
- THEN `data-theme="light"` is present in the initial SSR HTML
- AND `data-theme` remains `"light"` after hydration completes (no dark→light observable flash)

### Scenario: Dark brand — SSR data-theme=dark, no flash

- GIVEN the resolved brand has `themeRef` NOT ending in `"light"` (e.g., `themeRef: "acme-dark"`)
- AND the browser `localStorage` is empty
- WHEN any page renders on the server and hydrates on the client
- THEN `data-theme="dark"` is present in the initial SSR HTML
- AND `data-theme` remains `"dark"` after hydration completes (no light→dark observable flash)

### Scenario: E2E assertion — data-theme matches brand default with no post-hydration mutation

- GIVEN the enterprise brand resolves (default, `themeRef: "light"`)
- AND `localStorage` is cleared in `beforeEach` (no stored user preference)
- WHEN the sign-in page loads and reaches `networkidle`
- THEN `html[data-theme]` equals `"light"` at first assertion after `networkidle`
- AND asserting `html[data-theme]` again after 1 000 ms still equals `"light"` (no flash interval)

---

## Test Coverage Map

| Requirement | Unit test file | E2E coverage |
|---|---|---|
| resolveBrand() | `packages/brand/src/brand/__tests__/resolve.test.ts` | `ui/e2e/brand/brand.spec.ts` — BRAND_SLUG scenario |
| BrandProvider / useBrand | `packages/brand/src/brand/__tests__/provider.test.ts` | `ui/e2e/brand/brand.spec.ts` — provider wraps |
| BrandLogo | `packages/brand/src/brand/__tests__/brand-logo.test.ts` | `ui/e2e/brand/brand.spec.ts` — logo renders |
| BrandFooter | `packages/brand/src/brand/__tests__/brand-footer.test.ts` | `ui/e2e/brand/brand.spec.ts` — footer renders |
| generateBrandMetadata | `packages/brand/src/brand/__tests__/metadata.test.ts` | `ui/e2e/brand/brand.spec.ts` — metadata check |
| registry | `packages/brand/src/brand/__tests__/registry.test.ts` | — |
| Root Layout SSR Theme Consistency | `packages/brand/src/brand/__tests__/theme-mode.test.ts` | `ui/e2e/theme/theme.spec.ts` — SSR no-flash assertion (raw HTML + data-theme) |
