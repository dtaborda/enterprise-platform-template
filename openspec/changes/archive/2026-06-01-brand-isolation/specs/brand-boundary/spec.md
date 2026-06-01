# Delta for brand-boundary

> All capabilities in this domain are NEW (no existing main spec for brand-boundary in openspec/specs/).
> This change introduces the @enterprise/brand package boundary as a structural constraint.

---

## ADDED Requirements

### Requirement: @enterprise/brand Package Export Contract

The `@enterprise/brand` package MUST expose the following public subpath exports
via `packages/brand/package.json`:

| Export key | Purpose |
|---|---|
| `.` | Root barrel: BrandProvider, useBrand, BrandContext |
| `./context` | BrandContext |
| `./provider` | BrandProvider, useBrand |
| `./resolve` | resolveBrand |
| `./registry` | getBrand, getAllBrands, getDefaultBrand |
| `./metadata` | generateBrandMetadata |
| `./brand-logo` | BrandLogo |
| `./brand-footer` | BrandFooter |

Each export MUST resolve to a compiled ESM entry and a `.d.ts` declaration.

#### Scenario: Root barrel import resolves

- GIVEN a consumer in `@enterprise/web`
- WHEN it executes `import { BrandProvider, useBrand } from "@enterprise/brand"`
- THEN both symbols resolve without TypeScript errors

#### Scenario: Subpath import resolves

- GIVEN a consumer in `@enterprise/web`
- WHEN it executes `import { resolveBrand } from "@enterprise/brand/resolve"`
- THEN the symbol resolves without TypeScript errors

#### Scenario: Old @enterprise/ui brand subpath is gone

- GIVEN a consumer
- WHEN it attempts `import { BrandProvider } from "@enterprise/ui/brand/provider"`
- THEN TypeScript reports an error (no matching key in `@enterprise/ui/package.json`)

#### Scenario: Brand configs remain importable

- GIVEN a consumer
- WHEN it executes `import { enterpriseBrand } from "@enterprise/brand"`
  (or `@enterprise/brand/registry`)
- THEN the config object resolves without errors

---

### Requirement: @enterprise/ui Zero Brand References

`packages/ui/src/` MUST contain zero imports or re-exports of brand symbols.
`packages/ui/package.json` MUST NOT declare any `./brand/*` subpath export keys.

#### Scenario: ui package.json has no brand export keys

- GIVEN `packages/ui/package.json`
- WHEN all `exports` keys are listed
- THEN no key matches the pattern `./brand/*`

#### Scenario: ui source files have no brand imports

- GIVEN all `.ts` and `.tsx` files under `packages/ui/src/`
- WHEN scanned for references to brand module names
  (`brand-provider`, `brand-logo`, `brand-footer`, `resolveBrand`, `BrandContext`, `useBrand`, `generateBrandMetadata`)
- THEN zero matches are found

#### Scenario: ui barrel (index.ts) does not re-export brand symbols

- GIVEN `packages/ui/src/index.ts`
- WHEN compiled
- THEN it does not export `BrandProvider`, `useBrand`, `BrandLogo`, `BrandFooter`

---

### Requirement: Dependency Boundary Enforcement

`scripts/check-boundaries.mjs` MUST statically enforce the following import rules:

| Rule | From | To | Verdict |
|---|---|---|---|
| FORBID | `@enterprise/ui` | `@enterprise/brand` | Exit non-zero |
| ALLOW | `@enterprise/brand` | `@enterprise/ui` | Exit zero |
| ALLOW | `@enterprise/brand` | `@enterprise/contracts` | Exit zero |
| ALLOW | `@enterprise/web` | `@enterprise/brand` | Exit zero |

#### Scenario: ui→brand import is blocked

- GIVEN a file in `packages/ui/src/` contains `import ... from "@enterprise/brand"`
- WHEN `node scripts/check-boundaries.mjs` runs
- THEN it exits with a non-zero code and logs the offending file path

#### Scenario: brand→ui import is allowed

- GIVEN `packages/brand/src/` imports from `@enterprise/ui` (e.g., `cn`, `ThemeProvider`)
- WHEN `node scripts/check-boundaries.mjs` runs
- THEN it exits with code 0

#### Scenario: web→brand import is allowed

- GIVEN `ui/app/layout.tsx` contains `import { BrandProvider } from "@enterprise/brand"`
- WHEN `node scripts/check-boundaries.mjs` runs
- THEN it exits with code 0

#### Scenario: Clean baseline — no violations at merge

- GIVEN the brand-isolation PR branch is fully applied
- WHEN `node scripts/check-boundaries.mjs` runs on the entire monorepo
- THEN it exits with code 0 and reports zero violations

---

### Requirement: Root Layout Import Rewire

`ui/app/layout.tsx` MUST import brand symbols exclusively from `@enterprise/brand`.
No `@enterprise/ui/brand/*` import path MAY remain in the file.

#### Scenario: layout.tsx uses new package

- GIVEN `ui/app/layout.tsx`
- WHEN its import declarations are read
- THEN every brand-related import references `@enterprise/brand` (not `@enterprise/ui`)

#### Scenario: Layout still renders with BrandProvider

- GIVEN the root layout is loaded in a Next.js server render
- WHEN the page is requested
- THEN `BrandProvider` is present in the React tree wrapping all children
