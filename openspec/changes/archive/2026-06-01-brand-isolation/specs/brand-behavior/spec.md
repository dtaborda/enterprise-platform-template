# Delta for brand-behavior

> These capabilities were established in change #14 (brand-and-decoupling).
> This delta records that ALL behavior is PRESERVED after the package move.
> The only difference: import source changes from `@enterprise/ui/brand/*`
> to `@enterprise/brand/*`. No logic, signatures, or outputs change.
>
> Labels: **[CARRIED]** = behavior unchanged from #14; **[NEW]** = structural constraint added here.

---

## ADDED Requirements

### Requirement: resolveBrand() Resolution Strategy [CARRIED from #14]

`resolveBrand()` exported from `@enterprise/brand/resolve` MUST implement the
priority chain in the same order as the source it was moved from:

1. `BRAND_SLUG` env var — match registered brand slug or throw with available slugs listed
2. Subdomain detection: `host.split(".").length > 2` → first segment matched against registry
3. Path prefix: first path segment matched against registry (skip segments containing ".")
4. `getDefaultBrand()` fallback — never throws on fallback; warns via `console.warn` on unrecognized slug

`resolveBrand()` is server-only (uses `next/headers`).

#### Scenario: BRAND_SLUG env override forces brand

- GIVEN `process.env.BRAND_SLUG = "acme"` and `acme` is registered
- WHEN `resolveBrand()` is called
- THEN it returns the `acme` BrandConfig

#### Scenario: Unknown BRAND_SLUG throws descriptively

- GIVEN `process.env.BRAND_SLUG = "ghost-brand"`
- WHEN `resolveBrand()` is called
- THEN it throws an error that includes the list of available brand slugs

#### Scenario: Default brand resolves when no env override

- GIVEN `BRAND_SLUG` is unset and `enterprise` brand has `isDefault: true`
- WHEN `resolveBrand()` is called without a subdomain or path match
- THEN it returns the `enterprise` BrandConfig

#### Scenario: Unrecognized subdomain warns and falls back

- GIVEN request host is `unknown.example.com`
- WHEN `resolveBrand()` is called
- THEN `console.warn` is called once and `getDefaultBrand()` result is returned (no throw)

#### Scenario: Static asset paths do not trigger brand detection

- GIVEN request path is `/_next/static/chunk.js`
- WHEN `resolveBrand()` is called
- THEN path-prefix resolution is skipped (segment contains ".")
- AND default brand is returned

---

### Requirement: BrandProvider Wraps ThemeProvider [CARRIED from #14]

`BrandProvider` exported from `@enterprise/brand/provider` MUST:
- Accept `brand: BrandConfig` and `children: ReactNode` props
- Seed `BrandContext` with the provided `brand`
- Wrap children in `ThemeProvider` (imported from `@enterprise/ui`)
- Derive `defaultMode`: `themeRef` ending in `"light"` → `"light"`, otherwise → `"dark"`

#### Scenario: useBrand() returns brand inside provider

- GIVEN `BrandProvider` is rendered with `brand={enterpriseBrand}`
- WHEN a descendant calls `useBrand()`
- THEN it receives `enterpriseBrand`

#### Scenario: ThemeProvider receives derived mode

- GIVEN `brand.themeRef = "enterprise-dark"`
- WHEN `BrandProvider` renders
- THEN `ThemeProvider` is mounted with `defaultMode="dark"`

#### Scenario: useBrand() throws outside provider

- GIVEN a component calls `useBrand()` with no ancestor `BrandProvider`
- WHEN the component renders
- THEN it throws an error containing the string `"<BrandProvider>"`

---

### Requirement: BrandLogo Renders Correct Theme Variant [CARRIED from #14]

`BrandLogo` exported from `@enterprise/brand/brand-logo` MUST:
- Read `useBrand().logo` and `useTheme().mode`
- Render `<img src alt>` for the active mode variant
- Render `<span>{brand.displayName}</span>` when the active variant `src` is empty
- Forward `className` to the root element

#### Scenario: Dark mode renders dark logo src

- GIVEN theme mode is `"dark"` and `brand.logo.dark.src = "/logo-dark.svg"`
- WHEN `BrandLogo` renders
- THEN `<img src="/logo-dark.svg">` appears in the DOM

#### Scenario: Empty src renders displayName fallback

- GIVEN `brand.logo.light.src = ""` and theme mode is `"light"`
- WHEN `BrandLogo` renders
- THEN a `<span>` containing `brand.displayName` is rendered (no `<img>`)

---

### Requirement: BrandFooter Renders Legal and Social Links [CARRIED from #14]

`BrandFooter` exported from `@enterprise/brand/brand-footer` MUST:
- Render `© {year} {brand.displayName}` copyright notice
- Render legal `<a>` links only when the URL string is non-empty
- Render social links when `brand.social` is defined
- Render "Powered by" attribution when `brand.features?.showPoweredBy === true`

#### Scenario: Non-empty legal URL renders link

- GIVEN `brand.legal.privacyUrl = "https://example.com/privacy"`
- WHEN `BrandFooter` renders
- THEN `<a href="https://example.com/privacy">` is present in the DOM

#### Scenario: Empty legal URL omits link

- GIVEN `brand.legal.termsUrl = ""`
- WHEN `BrandFooter` renders
- THEN no `<a>` anchor with an empty or terms-related href is rendered

---

### Requirement: generateBrandMetadata() Maps to Next.js Metadata [CARRIED from #14]

`generateBrandMetadata(brand: BrandConfig)` exported from `@enterprise/brand/metadata`
MUST return a Next.js `Metadata` object with the following field mapping:

| Output field | Source |
|---|---|
| `title.template` | `"%s \| " + brand.metadata.titleTemplate` |
| `title.default` | `brand.metadata.titleTemplate` |
| `description` | `brand.metadata.description` |
| `icons.icon` | `brand.favicon` |
| `openGraph.images` | `[brand.metadata.ogImage]` when non-empty, else `[]` |

#### Scenario: All metadata fields mapped correctly

- GIVEN a BrandConfig with all metadata fields populated
- WHEN `generateBrandMetadata(brand)` is called
- THEN `title.default`, `description`, `icons.icon`, and `openGraph.images` match the mapping table

#### Scenario: Empty ogImage yields empty array

- GIVEN `brand.metadata.ogImage = ""`
- WHEN `generateBrandMetadata(brand)` is called
- THEN `openGraph.images` is `[]`

---

## Test Coverage Map

| Requirement | Unit test file (post-move) | E2E coverage |
|---|---|---|
| resolveBrand() | `packages/brand/src/__tests__/resolve.test.ts` | brand.spec.ts — BRAND_SLUG scenario |
| BrandProvider / useBrand | `packages/brand/src/__tests__/provider.test.ts` | brand.spec.ts — provider wraps |
| BrandLogo | `packages/brand/src/__tests__/brand-logo.test.ts` | brand.spec.ts — logo renders |
| BrandFooter | `packages/brand/src/__tests__/brand-footer.test.ts` | brand.spec.ts — footer renders |
| generateBrandMetadata | `packages/brand/src/__tests__/metadata.test.ts` | brand.spec.ts — metadata check |
| registry | `packages/brand/src/__tests__/registry.test.ts` | — |
