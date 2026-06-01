# Delta for brand-behavior

> **Change**: e2e-stability-hardening
> **Base spec**: `openspec/specs/brand-behavior/spec.md`

---

## ADDED Requirements

### Requirement: Root Layout SSR Theme Consistency

The root layout Server Component (`ui/app/layout.tsx`) MUST derive the initial `data-theme`
attribute on `<html>` from the resolved brand's `themeRef`, using the same rule as
`BrandProvider`: `themeRef.endsWith("light") → "light"`, otherwise `"dark"`.

Hard-coding `data-theme` to any literal value is PROHIBITED.

`suppressHydrationWarning` on `<html>` MUST be retained so that user localStorage overrides do
not produce React hydration errors.

#### Scenario: Light brand — SSR data-theme=light, no flash

- GIVEN the resolved brand has `themeRef` ending in `"light"` (e.g., enterprise, `themeRef: "light"`)
- AND the browser `localStorage` is empty (fresh session or cleared in beforeEach)
- WHEN any page renders on the server and hydrates on the client
- THEN `data-theme="light"` is present in the initial SSR HTML
- AND `data-theme` remains `"light"` after hydration completes (no dark→light observable flash)

#### Scenario: Dark brand — SSR data-theme=dark, no flash

- GIVEN the resolved brand has `themeRef` NOT ending in `"light"` (e.g., `themeRef: "acme-dark"`)
- AND the browser `localStorage` is empty
- WHEN any page renders on the server and hydrates on the client
- THEN `data-theme="dark"` is present in the initial SSR HTML
- AND `data-theme` remains `"dark"` after hydration completes (no light→dark observable flash)

#### Scenario: E2E assertion — data-theme matches brand default with no post-hydration mutation

- GIVEN the enterprise brand resolves (default, `themeRef: "light"`)
- AND `localStorage` is cleared in `beforeEach` (no stored user preference)
- WHEN the sign-in page loads and reaches `networkidle`
- THEN `html[data-theme]` equals `"light"` at first assertion after `networkidle`
- AND asserting `html[data-theme]` again after 1 000 ms still equals `"light"` (no flash interval)
