---
title: "Brand isolation package RFC"
description: "Defines the package scaffold, dependency rules, CI enforcement, and component interfaces that guarantee brand-specific code lives exclusively in @enterprise/brand and never leaks into shared infrastructure."
owner: "Engineering"
lastUpdated: "2026-05-11"
---

# Brand isolation package RFC

## Purpose

Define an implementation-ready technical approach for the `@enterprise/brand` package: its directory scaffold, `package.json` shape, TypeScript exports, brand-aware components, and the exact `check-boundaries.mjs` changes that mechanically enforce the brand isolation invariant in CI.

This RFC is about **enforcement and structure**. It defines where brand code lives and how the monorepo toolchain prevents it from leaking into shared infrastructure. Runtime capabilities — `BrandProvider`, token injection, and brand context switching — are addressed in the Brand Abstraction Layer RFC.

## Scope

- Included: `packages/brand/` directory scaffold, `package.json`, `tsconfig.json`, subpath exports map, `BrandConfig` type re-export, `defaultBrandConfig`, `BrandLogo` / `BrandName` / `LegalFooter` component interfaces and implementations, updated `check-boundaries.mjs` rules (exact diff), updated dependency direction diagram for the full monorepo, `packages/brand/AGENTS.md` content, decision tree for code classification, Turborepo and `transpilePackages` wiring, and unit testing strategy for boundary enforcement.
- Excluded: runtime brand-switching and `BrandProvider` (Brand Abstraction Layer), design token definitions (Theme System RFC), feature-flag evaluation logic (Feature Flags RFC), brand-specific email templates, automated Biome/ESLint plugin for import enforcement, brand asset pipeline (image optimization, SVG sprites), and Storybook stories.

---

## Summary

Add a new `packages/brand/` workspace member named `@enterprise/brand`. The package is a thin presentational layer: it holds the `defaultBrandConfig`, three brand-aware components (`BrandLogo`, `BrandName`, `LegalFooter`), and a re-export of the `BrandConfig` type from `@enterprise/contracts`. It may import from `@enterprise/contracts` and `@enterprise/ui`, and MUST NOT import from `@enterprise/core`, `@enterprise/db`, or `@enterprise/web`. The `check-boundaries.mjs` script is extended with one new allowlist entry and two new negative rules that fail the CI `lint` job on any violation. No other package's `package.json` lists `@enterprise/brand` as a dependency except `ui/package.json`, which gives TypeScript IDE-level enforcement before CI runs.

## Technical objectives

- The monorepo has exactly one valid home for brand-specific TypeScript code, discoverable in under 30 seconds.
- Every attempted import of `@enterprise/brand` from `@enterprise/core`, `@enterprise/db`, `@enterprise/contracts`, or `@enterprise/ui` fails `pnpm check-boundaries` with an actionable error message before merging to `main`.
- Adding a new brand requires changes only inside `packages/brand/src/config/` and `ui/` — no shared package is touched.
- `BrandConfig` in `@enterprise/contracts` is the single source of truth; TypeScript catches schema drift at build time, not runtime.
- `pnpm check-boundaries` completes in under 3 seconds of added wall time on the CI `lint` job.

---

## Package structure

### `packages/brand/` layout

```
packages/brand/
├── AGENTS.md
├── package.json
├── tsconfig.json
└── src/
    ├── index.ts
    ├── config/
    │   └── default.ts
    ├── components/
    │   ├── brand-logo.tsx
    │   ├── brand-name.tsx
    │   └── legal-footer.tsx
    └── types/
        └── brand-config.ts
```

**File responsibilities:**

| File | Responsibility |
|------|---------------|
| `src/index.ts` | Barrel export — re-exports everything the consuming app needs |
| `src/types/brand-config.ts` | Re-exports `BrandConfig` type from `@enterprise/contracts`; the single import point for brand type consumers inside this package |
| `src/config/default.ts` | Exports `defaultBrandConfig` — a fully-typed `BrandConfig` with placeholder values for local development |
| `src/components/brand-logo.tsx` | `BrandLogo` component — renders brand logotype from config |
| `src/components/brand-name.tsx` | `BrandName` component — renders brand display name from config |
| `src/components/legal-footer.tsx` | `LegalFooter` component — renders copyright, legal entity, and policy links from config |
| `AGENTS.md` | Brand package agent instructions including decision tree, boundary rules, and one concrete violation example |
| `package.json` | `name: "@enterprise/brand"`, `private: true`, dependencies: `@enterprise/contracts` + `@enterprise/ui` |
| `tsconfig.json` | Extends `../../tsconfig.json`; includes `src/**/*.ts` and `src/**/*.tsx` |

### `package.json`

```json
{
  "name": "@enterprise/brand",
  "version": "1.0.0",
  "private": true,
  "type": "module",
  "main": "./src/index.ts",
  "types": "./src/index.ts",
  "exports": {
    ".": "./src/index.ts",
    "./components/brand-logo": "./src/components/brand-logo.tsx",
    "./components/brand-name": "./src/components/brand-name.tsx",
    "./components/legal-footer": "./src/components/legal-footer.tsx",
    "./config/default": "./src/config/default.ts",
    "./types": "./src/types/brand-config.ts"
  },
  "scripts": {
    "typecheck": "tsc --noEmit",
    "test": "cd ../.. && vitest run --project brand",
    "clean": "rm -rf dist"
  },
  "dependencies": {
    "@enterprise/contracts": "workspace:*",
    "@enterprise/ui": "workspace:*"
  },
  "devDependencies": {
    "@types/react": "^19.0.0",
    "@types/react-dom": "^19.0.0",
    "typescript": "^5.7.0"
  },
  "peerDependencies": {
    "react": "^19.0.0",
    "react-dom": "^19.0.0"
  }
}
```

**Dependency rationale:**

| Dependency | Why |
|------------|-----|
| `@enterprise/contracts` | `BrandConfig` type and schema live here — the source of truth |
| `@enterprise/ui` | Brand components use `cn()` from `@enterprise/ui/lib/utils` and may use shadcn/ui primitives (e.g., `Image`-equivalent wrappers) |
| NOT `@enterprise/core` | No business logic — intentional omission enforces the boundary |
| NOT `@enterprise/db` | No schema access — intentional omission enforces the boundary |

### `tsconfig.json`

```json
{
  "extends": "../../tsconfig.json",
  "compilerOptions": {
    "outDir": "dist",
    "rootDir": "src",
    "declaration": true,
    "declarationMap": true,
    "jsx": "react-jsx"
  },
  "include": ["src/**/*.ts", "src/**/*.tsx"],
  "exclude": ["node_modules", "dist"]
}
```

---

## Dependency graph (enforced)

### Updated dependency direction diagram

```
Dependency direction (arrows = "may import"):

@enterprise/contracts ──────────────────────────────────────┐
   │ (zod only)                                              │
   │                                                         ▼
@enterprise/db                          @enterprise/ui ◄────┐
   │ (drizzle-orm only)                    │ (contracts)     │
   │                                       │                 │
   ▼                                       │          @enterprise/brand
@enterprise/core ◄─────────────────────────┘              │
   │ (contracts + db + supabase)                           │
   │                                                       │
   └──────────────────────────────────────┐                │
                                          ▼                ▼
                                    @enterprise/web (ui/)
                              (contracts + core + ui + db + brand)

Legend:
  ──► may import
  ✗   MUST NOT import (enforced by check-boundaries.mjs)

Enforcement summary:
  @enterprise/brand    → @enterprise/contracts   ✅
  @enterprise/brand    → @enterprise/ui          ✅
  @enterprise/brand    → @enterprise/core        ✗  (CI blocks)
  @enterprise/brand    → @enterprise/db          ✗  (CI blocks)
  @enterprise/brand    → @enterprise/web         ✗  (CI blocks — existing rule)
  @enterprise/core     → @enterprise/brand       ✗  (CI blocks — NEW rule)
  @enterprise/db       → @enterprise/brand       ✗  (CI blocks — NEW rule)
  @enterprise/contracts → @enterprise/brand      ✗  (CI blocks — NEW rule)
  @enterprise/ui       → @enterprise/brand       ✗  (CI blocks — NEW rule)
  @enterprise/web (ui) → @enterprise/brand       ✅ (layout level only)
```

### `check-boundaries.mjs` changes

The complete updated `allowedWorkspaceImports` map and the two new negative rule blocks are shown below as an exact diff against the current file.

**Change 1 — add `packages/brand` to the allowlist map and extend `ui`:**

```diff
 const allowedWorkspaceImports = {
   "packages/contracts": [],
   "packages/db": [],
   "packages/core": ["@enterprise/contracts", "@enterprise/db"],
   "packages/ui": ["@enterprise/contracts"],
+  "packages/brand": ["@enterprise/contracts", "@enterprise/ui"],
-  ui: ["@enterprise/contracts", "@enterprise/core", "@enterprise/ui", "@enterprise/db"],
+  ui: [
+    "@enterprise/contracts",
+    "@enterprise/core",
+    "@enterprise/ui",
+    "@enterprise/db",
+    "@enterprise/brand",
+  ],
 };
```

**Change 2 — add two new negative rules inside the per-import loop, after the existing `@enterprise/web` check:**

```diff
       if (targetPackage === "@enterprise/web" && sourceWorkspace !== "ui") {
         violations.push({
           filePath,
           reason: "Packages MUST NOT import from @enterprise/web",
         });
         continue;
       }

+      // Brand isolation: infrastructure packages must not import from @enterprise/brand
+      const brandIsolatedSources = ["packages/core", "packages/db", "packages/contracts"];
+      if (brandIsolatedSources.includes(sourceWorkspace) && targetPackage === "@enterprise/brand") {
+        violations.push({
+          filePath,
+          reason: `${sourceWorkspace} MUST NOT import @enterprise/brand — keep infrastructure brand-agnostic`,
+        });
+        continue;
+      }
+
+      // Brand direction: ui package must not import from @enterprise/brand
+      if (sourceWorkspace === "packages/ui" && targetPackage === "@enterprise/brand") {
+        violations.push({
+          filePath,
+          reason: "@enterprise/ui MUST NOT import @enterprise/brand — brand imports ui, not vice versa",
+        });
+        continue;
+      }

       if (sourceWorkspace === "ui") {
```

**Result of the two new rules:**

| Violating import | Error message |
|-----------------|---------------|
| `packages/core/src/**` imports `@enterprise/brand` | `packages/core MUST NOT import @enterprise/brand — keep infrastructure brand-agnostic` |
| `packages/db/src/**` imports `@enterprise/brand` | `packages/db MUST NOT import @enterprise/brand — keep infrastructure brand-agnostic` |
| `packages/contracts/src/**` imports `@enterprise/brand` | `packages/contracts MUST NOT import @enterprise/brand — keep infrastructure brand-agnostic` |
| `packages/ui/src/**` imports `@enterprise/brand` | `@enterprise/ui MUST NOT import @enterprise/brand — brand imports ui, not vice versa` |

No changes are needed to the deep-import check (`/^@enterprise\/[a-z-]+\/(src|schema\/platform)/`) — it already blocks deep subpath imports for all packages including `@enterprise/brand`.

---

## Brand-aware components

All three components follow the same contract:
- Pure presentational — no Server Actions, no Supabase calls, no direct DB access.
- Props-driven: they accept a `config: BrandConfig` prop. When the Brand Abstraction Layer is wired (its own RFC), components may additionally read from `BrandContext` via a hook. For MVP, the prop is required.
- No import from `@enterprise/core` or `@enterprise/db`.
- TypeScript strict mode passes — all props are fully typed against `BrandConfig` from `@enterprise/contracts`.

### `BrandConfig` type (re-export in `src/types/brand-config.ts`)

This file re-exports the type from contracts so that brand package internals have a single local import point. The source of truth is `@enterprise/contracts` — this file MUST NOT redefine the type.

```typescript
// packages/brand/src/types/brand-config.ts

// Re-export only — BrandConfig is defined in @enterprise/contracts.
// NEVER redefine this type locally.
export type { BrandConfig } from "@enterprise/contracts";
```

The `BrandConfig` schema in `@enterprise/contracts` must expose at minimum:

```typescript
// packages/contracts/src/dto/brand.ts  (new file — owned by Brand Abstraction Layer RFC)
import { z } from "zod";

export const brandConfigSchema = z.object({
  /** Display name shown in the UI (e.g., "Acme Corp") */
  name: z.string().min(1),
  /** Legal entity name used in copyright notices (e.g., "Acme Corporation Inc.") */
  legalName: z.string().min(1),
  /** Full logotype URL — used as <img src> for variant="full" */
  logoUrl: z.string().url(),
  /** Mark/icon-only URL — used as <img src> for variant="mark"; falls back to logoUrl */
  logoMarkUrl: z.string().url().optional(),
  /** Privacy policy URL — renders Privacy Policy link when present */
  privacyPolicyUrl: z.string().url().optional(),
  /** Terms of service URL — renders Terms of Service link when present */
  termsUrl: z.string().url().optional(),
});

export type BrandConfig = z.infer<typeof brandConfigSchema>;
```

### `BrandLogo`

**File:** `packages/brand/src/components/brand-logo.tsx`

**Props interface:**

```typescript
import type { BrandConfig } from "../types/brand-config";

export interface BrandLogoProps {
  /** Brand configuration object. Required. Source: BrandContext or defaultBrandConfig. */
  config: BrandConfig;
  /**
   * "full"  — renders the complete logotype (default).
   * "mark"  — renders the icon/mark only; falls back to logoUrl when logoMarkUrl is absent.
   */
  variant?: "full" | "mark";
  /** Pixel width of the rendered image. Default: 120 for "full", 40 for "mark". */
  width?: number;
  /** Pixel height of the rendered image. Default: 40 for both variants. */
  height?: number;
  /** Additional CSS classes merged via cn(). */
  className?: string;
}
```

**Implementation:**

```typescript
// packages/brand/src/components/brand-logo.tsx
import { cn } from "@enterprise/ui/lib/utils";
import type { BrandLogoProps } from "./brand-logo";

export function BrandLogo({
  config,
  variant = "full",
  width,
  height = 40,
  className,
}: BrandLogoProps) {
  const src = variant === "mark" ? (config.logoMarkUrl ?? config.logoUrl) : config.logoUrl;
  const resolvedWidth = width ?? (variant === "mark" ? 40 : 120);

  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={src}
      alt={config.name}
      width={resolvedWidth}
      height={height}
      className={cn("object-contain", className)}
    />
  );
}
```

**Design notes:**
- Uses a plain `<img>` rather than `next/image` because `@enterprise/brand` must not depend on Next.js (it is a package, not an app). The consuming `ui/` layout wraps or replaces this with `next/image` if remote image optimization is needed.
- `alt` is always derived from `config.name` — never an empty string or hardcoded value.
- The `mark` variant falls back to `logoUrl` when `logoMarkUrl` is absent, making it safe to call without configuring a separate mark asset.

### `BrandName`

**File:** `packages/brand/src/components/brand-name.tsx`

**Props interface:**

```typescript
import type { BrandConfig } from "../types/brand-config";

export interface BrandNameProps {
  /** Brand configuration object. Required. */
  config: BrandConfig;
  /** HTML element to render. Default: "span". Use "h1" for landmark headings. */
  as?: "span" | "h1" | "h2" | "p";
  /** Additional CSS classes merged via cn(). */
  className?: string;
}
```

**Implementation:**

```typescript
// packages/brand/src/components/brand-name.tsx
import { cn } from "@enterprise/ui/lib/utils";
import type { BrandNameProps } from "./brand-name";

export function BrandName({ config, as: Tag = "span", className }: BrandNameProps) {
  return (
    <Tag className={cn("font-semibold tracking-tight", className)}>
      {config.name}
    </Tag>
  );
}
```

**Design notes:**
- The polymorphic `as` prop lets callers render the brand name as a heading for landmark purposes (e.g., the marketing landing page `<h1>`) or as an inline `<span>` inside the nav bar — without duplicating the config read.
- Default styling (`font-semibold tracking-tight`) is minimal and composable. Callers override via `className`.

### `LegalFooter`

**File:** `packages/brand/src/components/legal-footer.tsx`

**Props interface:**

```typescript
import type { BrandConfig } from "../types/brand-config";

export interface LegalFooterProps {
  /** Brand configuration object. Required. */
  config: BrandConfig;
  /** Additional CSS classes for the outer container. */
  className?: string;
}
```

**Implementation:**

```typescript
// packages/brand/src/components/legal-footer.tsx
import { cn } from "@enterprise/ui/lib/utils";
import type { LegalFooterProps } from "./legal-footer";

export function LegalFooter({ config, className }: LegalFooterProps) {
  const currentYear = new Date().getFullYear();

  return (
    <footer
      className={cn(
        "flex flex-wrap items-center justify-center gap-x-4 gap-y-1 text-sm text-muted-foreground",
        className,
      )}
    >
      <span>
        &copy; {currentYear} {config.legalName}. All rights reserved.
      </span>

      {config.privacyPolicyUrl ? (
        <a
          href={config.privacyPolicyUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="underline underline-offset-4 hover:text-foreground transition-colors"
        >
          Privacy Policy
        </a>
      ) : null}

      {config.termsUrl ? (
        <a
          href={config.termsUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="underline underline-offset-4 hover:text-foreground transition-colors"
        >
          Terms of Service
        </a>
      ) : null}
    </footer>
  );
}
```

**Design notes:**
- `currentYear` is computed at render time — no stale copyright years.
- Policy links are conditionally rendered: when `privacyPolicyUrl` or `termsUrl` is absent from `BrandConfig`, no element is rendered (not an empty anchor).
- `rel="noopener noreferrer"` is always applied to external links per security convention.
- Styling uses semantic tokens (`text-muted-foreground`, `hover:text-foreground`) so the component adapts to light/dark mode automatically.

### `defaultBrandConfig` (`src/config/default.ts`)

```typescript
// packages/brand/src/config/default.ts
import type { BrandConfig } from "../types/brand-config";

/**
 * Fallback brand configuration for local development and test environments.
 * Template adopters replace this with their own brand config when deploying.
 * All required BrandConfig fields must have a value here — TypeScript will
 * produce a compile error if a new required field is added to BrandConfig
 * without updating this object.
 */
export const defaultBrandConfig: BrandConfig = {
  name: "Enterprise Platform",
  legalName: "Enterprise Platform Inc.",
  logoUrl: "/brand/logo-full.svg",
  logoMarkUrl: "/brand/logo-mark.svg",
  privacyPolicyUrl: undefined,
  termsUrl: undefined,
};
```

The placeholder image paths (`/brand/logo-full.svg`, `/brand/logo-mark.svg`) reference SVG assets that must be committed to `ui/public/brand/` as part of the package scaffold. They are generic placeholder SVGs — template adopters replace them with their own assets.

### Barrel export (`src/index.ts`)

```typescript
// packages/brand/src/index.ts

// Types
export type { BrandConfig } from "./types/brand-config";

// Default config
export { defaultBrandConfig } from "./config/default";

// Components
export { BrandLogo } from "./components/brand-logo";
export type { BrandLogoProps } from "./components/brand-logo";

export { BrandName } from "./components/brand-name";
export type { BrandNameProps } from "./components/brand-name";

export { LegalFooter } from "./components/legal-footer";
export type { LegalFooterProps } from "./components/legal-footer";
```

---

## Decision tree: brand vs. ui vs. core

Use this tree when deciding where a new piece of code belongs. Answer each question top-to-bottom and stop at the first terminal node.

```
Is this code specific to one deployment's brand identity?
│  (brand identity = logo, name, color palette, legal entity, brand-only features)
│
├── YES
│    │
│    ├── Does it render UI? (component, icon, styled text, image)
│    │    │
│    │    ├── YES → @enterprise/brand/components/
│    │    │         Example: BrandLogo, BrandName, LegalFooter, brand-specific
│    │    │         illustration, branded CTA button variant
│    │    │
│    │    └── NO
│    │         │
│    │         ├── Is it configuration? (name string, URL, color value, legal copy)
│    │         │    │
│    │         │    ├── YES → Add field to BrandConfig in @enterprise/contracts,
│    │         │    │         then set value in packages/brand/src/config/default.ts
│    │         │    │         (or a brand-specific config file for adopters)
│    │         │    │
│    │         │    └── NO
│    │         │         │
│    │         │         └── Is it a feature toggle tied to brand identity?
│    │         │              (e.g., feature enabled ONLY for this brand)
│    │         │              │
│    │         │              ├── YES → packages/brand/src/config/features.ts
│    │         │              │         Example: const BRAND_FEATURES = { aiEnabled: true }
│    │         │              │
│    │         │              └── NO → Contact architecture team before adding code
│    │
│    └── (If unsure whether it's brand-specific: ask "would every deployment
│          need this?" — if YES, it is generic, not brand-specific)
│
└── NO (generic, needed by all deployments)
     │
     ├── Is it a generic UI primitive? (button, card, input, dialog, badge)
     │    │
     │    ├── YES → @enterprise/ui/components/
     │    │         Example: Button, Card, Input, Select, Table
     │    │
     │    └── NO
     │         │
     │         ├── Is it business logic? (service, query, computation, workflow)
     │         │    │
     │         │    ├── YES → @enterprise/core/src/services/{feature}-service.ts
     │         │    │         Example: createTenant(), getSubscription(), sendInvite()
     │         │    │
     │         │    └── NO
     │         │         │
     │         │         ├── Is it a data contract? (DTO, Zod schema, shared type)
     │         │         │    │
     │         │         │    ├── YES → @enterprise/contracts/src/dto/{domain}.ts
     │         │         │    │         Example: createResourceSchema, BrandConfig,
     │         │         │    │         ActionResult<T>
     │         │         │    │
     │         │         │    └── NO
     │         │         │         │
     │         │         │         └── Is it a table definition? (Drizzle schema)
     │         │         │              │
     │         │         │              ├── YES → @enterprise/db/src/schema/{domain}.ts
     │         │         │              │         Example: tenants, profiles, resources
     │         │         │              │
     │         │         │              └── NO → Contact architecture team before adding code
     │         │
     │         └── Is it a Supabase client, auth helper, or env utility?
     │              │
     │              ├── YES → @enterprise/core/src/supabase/ or src/utils/
     │              │
     │              └── NO → Is it a page, layout, or Server Action?
     │                        │
     │                        ├── YES → ui/app/ or ui/features/{feature}/
     │                        │
     │                        └── NO → Contact architecture team before adding code

Common misclassification examples:
  "if (brand === 'acme') send email"     → WRONG: belongs in brand feature toggle,
                                            not in @enterprise/core service
  Hardcoded "© 2026 Acme Corp."          → WRONG: belongs in LegalFooter via BrandConfig,
                                            not in a layout file
  Logo path string in layout.tsx          → WRONG: belongs in defaultBrandConfig.logoUrl,
                                            not hardcoded in ui/
  Brand color hex in globals.css          → WRONG: belongs in brand theme config,
                                            not in the shared stylesheet
```

---

## AGENTS.md for `packages/brand/`

> This is the complete content for `packages/brand/AGENTS.md`.

```markdown
# @enterprise/brand — Agent Instructions

## Purpose

Brand-specific presentational layer. This package holds the `defaultBrandConfig`,
brand-aware components (`BrandLogo`, `BrandName`, `LegalFooter`), and the
`BrandConfig` type re-export. It is the ONLY valid home for brand-specific
TypeScript code in this monorepo.

---

## Critical Rules — Non-Negotiable

### Dependency boundary (CI-enforced)

- NEVER import from `@enterprise/core` — violations fail `pnpm check-boundaries` in CI.
- NEVER import from `@enterprise/db` — same rule.
- NEVER import from `@enterprise/web` — same rule as all packages.
- You MAY import from `@enterprise/contracts` (for `BrandConfig` type and schema).
- You MAY import from `@enterprise/ui` (for `cn()` and shadcn/ui primitives).

If you add a forbidden import and CI fails, the error message will identify the
violating file and the exact rule. Fix the import — do not silence the check.

### Component rules

- Components in this package MUST be purely presentational — no Server Actions,
  no direct Supabase calls, no `"use server"` directive.
- Components receive brand configuration via a `config: BrandConfig` prop.
  They may additionally read from `BrandContext` when the Brand Abstraction Layer
  is wired, but the prop always takes precedence.
- Brand-specific feature toggles live in `src/config/features.ts`, NOT in
  `@enterprise/core`. Feature toggles that apply to ALL deployments belong in the
  Feature Flags package.

### BrandConfig is the source of truth

- `BrandConfig` is defined in `@enterprise/contracts`. Do NOT redefine it here.
- `src/types/brand-config.ts` re-exports it — use that as the local import.
- All config objects (including `defaultBrandConfig`) MUST satisfy `BrandConfig`.
  TypeScript will error at build time if a required field is missing.

---

## Decision tree: where does this code go?

```
Is this code specific to one deployment's brand identity?
│
├── YES
│    ├── Renders UI?         → src/components/
│    ├── Configuration?      → BrandConfig field in @enterprise/contracts,
│    │                         value in src/config/default.ts
│    └── Feature toggle?     → src/config/features.ts
│
└── NO (generic, needed by all deployments)
     ├── UI primitive?       → @enterprise/ui/components/
     ├── Business logic?     → @enterprise/core/src/services/
     ├── Data contract?      → @enterprise/contracts/src/dto/
     └── Table definition?   → @enterprise/db/src/schema/
```

---

## Concrete violation example

**Violation:** A developer adds a "send welcome email with brand logo" feature
and puts the email logic in `@enterprise/core/src/services/email-service.ts`,
importing the logo URL from `@enterprise/brand`:

```typescript
// packages/core/src/services/email-service.ts  ← WRONG
import { defaultBrandConfig } from "@enterprise/brand"; // ← violation

export async function sendWelcomeEmail(email: string) {
  await mailer.send({
    logoUrl: defaultBrandConfig.logoUrl, // brand-specific data in core
    to: email,
  });
}
```

**CI output:**

```
Boundary check failed:

- packages/core/src/services/email-service.ts — packages/core MUST NOT import
  @enterprise/brand — keep infrastructure brand-agnostic
```

**Correct resolution:** Pass the logo URL as a parameter to the service function,
sourcing it at the call site (in `ui/` or via a brand config lookup):

```typescript
// packages/core/src/services/email-service.ts  ← CORRECT
export async function sendWelcomeEmail(email: string, logoUrl: string) {
  await mailer.send({ logoUrl, to: email });
}

// ui/features/onboarding/actions.ts  ← brand config consumed here
import { defaultBrandConfig } from "@enterprise/brand";
await sendWelcomeEmail(user.email, defaultBrandConfig.logoUrl);
```

---

## Project structure

```
packages/brand/
├── AGENTS.md
├── package.json
├── tsconfig.json
└── src/
    ├── index.ts                    # Barrel export
    ├── types/
    │   └── brand-config.ts         # Re-exports BrandConfig from @enterprise/contracts
    ├── config/
    │   ├── default.ts              # defaultBrandConfig — fallback for local dev
    │   └── features.ts             # Brand-specific feature toggles (create when needed)
    └── components/
        ├── brand-logo.tsx          # Logotype component
        ├── brand-name.tsx          # Display name component
        └── legal-footer.tsx        # Copyright and policy links component
```

---

## Commands

```bash
pnpm --filter @enterprise/brand typecheck    # TypeScript compilation
pnpm --filter @enterprise/brand test         # Vitest unit tests
pnpm check-boundaries                        # Full monorepo boundary check
```

---

## QA checklist (before commit)

- [ ] No import from `@enterprise/core` or `@enterprise/db` in any file
- [ ] No `"use server"` directive anywhere in this package
- [ ] Components receive `config: BrandConfig` as a prop
- [ ] `BrandConfig` NOT redefined locally — re-exported from `@enterprise/contracts`
- [ ] `defaultBrandConfig` satisfies `BrandConfig` (TypeScript error if not)
- [ ] `pnpm check-boundaries` passes with no violations
- [ ] `pnpm --filter @enterprise/brand typecheck` passes
- [ ] Unit tests exist for component rendering (both variant paths for BrandLogo,
      both optional-link states for LegalFooter)
```

---

## Testing strategy

### Unit tests

Location: `packages/brand/src/components/__tests__/`

Tests use Vitest with a minimal React rendering setup (no Next.js App Router — this package has no Next.js dependency).

#### `brand-logo.test.tsx`

| Test case | What it verifies |
|-----------|-----------------|
| Renders `full` variant with `config.logoUrl` | `<img src>` equals `config.logoUrl`; `alt` equals `config.name` |
| Renders `mark` variant with `config.logoMarkUrl` | `<img src>` equals `config.logoMarkUrl` when defined |
| Renders `mark` variant falls back to `logoUrl` | When `logoMarkUrl` is absent, `<img src>` equals `config.logoUrl` |
| Applies default width for `full` variant | `width` attribute equals `120` when not provided |
| Applies default width for `mark` variant | `width` attribute equals `40` when not provided |
| Merges `className` prop | Custom class appears in rendered element |

#### `brand-name.test.tsx`

| Test case | What it verifies |
|-----------|-----------------|
| Renders `config.name` as text content | Text node matches `config.name` |
| Defaults to `<span>` element | Rendered tag is `span` |
| Renders as `<h1>` when `as="h1"` | Rendered tag is `h1` |
| Merges `className` prop | Custom class appears in rendered element |

#### `legal-footer.test.tsx`

| Test case | What it verifies |
|-----------|-----------------|
| Renders copyright with `config.legalName` and current year | Text contains `© {year} {legalName}` |
| Renders Privacy Policy link when `privacyPolicyUrl` is set | Anchor with correct `href` and `target="_blank"` |
| Renders Terms of Service link when `termsUrl` is set | Anchor with correct `href` and `target="_blank"` |
| Does NOT render Privacy Policy link when `privacyPolicyUrl` is absent | No "Privacy Policy" anchor in DOM |
| Does NOT render Terms of Service link when `termsUrl` is absent | No "Terms of Service" anchor in DOM |
| Merges `className` prop | Custom class appears on footer element |

#### `default.test.ts`

| Test case | What it verifies |
|-----------|-----------------|
| `defaultBrandConfig` satisfies `BrandConfig` schema | `brandConfigSchema.parse(defaultBrandConfig)` does not throw |
| `defaultBrandConfig.name` is non-empty | `name` field is a non-empty string |
| `defaultBrandConfig.legalName` is non-empty | `legalName` field is a non-empty string |
| `defaultBrandConfig.logoUrl` is a non-empty string | `logoUrl` field is present |

### Boundary tests (CI)

The boundary check runs as part of the `lint` CI job via `pnpm check-boundaries` (which calls `node scripts/check-boundaries.mjs`). No additional test setup is required.

To verify the new rules locally:

```bash
# Verify the boundary check passes with no violations:
pnpm check-boundaries

# Verify the new rules catch violations (smoke test — revert after):
# 1. Temporarily add to packages/core/src/index.ts:
#    import {} from "@enterprise/brand";
# 2. Run:
pnpm check-boundaries
# Expected output:
# Boundary check failed:
# - packages/core/src/index.ts — packages/core MUST NOT import @enterprise/brand
#   — keep infrastructure brand-agnostic
# 3. Revert the temporary import.
```

**CI job placement:** `check-boundaries.mjs` is already invoked in the `lint` job of `.github/workflows/`. No new job is needed — the script is called via the `pnpm check-boundaries` script defined in the root `package.json`. Verify this entry exists:

```json
// root package.json scripts
{
  "check-boundaries": "node scripts/check-boundaries.mjs"
}
```

---

## Trade-offs

| Decision | Chosen | Not chosen | Rationale |
|----------|--------|------------|-----------|
| Dedicated `packages/brand/` vs. sub-path in `@enterprise/ui` | Dedicated package | Brand sub-path in `@enterprise/ui` | Separate package makes the dependency direction unambiguous — `check-boundaries.mjs` can enforce it mechanically; mixing brand code with generic primitives in `@enterprise/ui` would prohibit the `ui → brand` direction enforcement |
| `check-boundaries.mjs` script vs. Biome/ESLint import plugin | Existing script | New lint plugin | The script already runs in CI and requires no ecosystem dependency; a Biome import plugin is not yet mature; consistency with the existing enforcement mechanism is preferred for MVP |
| `BrandConfig` in `@enterprise/contracts` vs. defined in `@enterprise/brand` | Defined in `@enterprise/contracts` | Defined in brand package | `@enterprise/contracts` is the single source of truth for all data shapes; `@enterprise/brand` re-exports the type — this keeps the dependency graph acyclic and allows other consumers (e.g., a server-side brand loader) to type-check against `BrandConfig` without depending on the brand package |
| `@enterprise/brand` may import `@enterprise/ui` | Allowed | Forbidden | Brand components need `cn()` and may use shadcn/ui primitives; the reverse direction (`ui → brand`) is explicitly blocked by CI |
| `@enterprise/brand` may import `@enterprise/core` | Forbidden | Allowed | Brand components must be purely presentational; service calls belong in Server Actions in `ui/`, not in the brand package; enforced in CI and by the absence of `@enterprise/core` from `package.json` dependencies |
| Brand config as compile-time constant vs. DB record | Compile-time constant (MVP) | DB-driven record | Simplest approach; avoids schema changes in `@enterprise/db`; runtime switching is the Brand Abstraction Layer's responsibility |
| Plain `<img>` vs. `next/image` in `BrandLogo` | Plain `<img>` | `next/image` | `@enterprise/brand` must not depend on Next.js; the consuming `ui/` layout can wrap or replace `BrandLogo` with a `next/image`-based override if needed |
| Brand-specific feature toggles | `packages/brand/src/config/features.ts` | `@enterprise/core` feature flags | Feature toggles tied to a single brand's identity belong in the brand package — prevents `if (brand === 'x')` branches in the service layer |
| `@enterprise/brand` omitted from `packages/ui/`, `packages/core/`, `packages/db/`, `packages/contracts/` `package.json` dependencies | Intentionally omitted | Allowed as an optional dep | TypeScript cannot resolve an import from a package not listed in `dependencies`; IDE-level enforcement before CI runs, in addition to the boundary script — defense in depth |

---

## Risks

| Risk | Impact | Mitigation |
|------|--------|------------|
| Developers bypass `check-boundaries.mjs` via `--no-verify` git hook | Brand leaks reach `main` | Script runs in CI `lint` job, not just as a git hook — local bypass does not prevent CI failure; PR cannot be merged while CI is red |
| `@enterprise/brand` accumulates business logic over time (creeping complexity) | Core isolation guarantee erodes | `packages/brand/AGENTS.md` explicitly forbids Server Actions and Supabase calls; PR reviewers are directed to verify this rule; follow-up: add a negative assertion to `check-boundaries.mjs` that blocks Supabase client imports from `packages/brand/` |
| `BrandConfig` schema drift between `@enterprise/contracts` and `defaultBrandConfig` | Runtime brand config errors; TypeScript is the safety net | `defaultBrandConfig` is typed `const x: BrandConfig = { ... }` — TypeScript compile error when a required field is added to `BrandConfig` without updating `defaultBrandConfig`; CI runs `pnpm typecheck` |
| Template adopters create parallel packages (`packages/brand-acme/`) that reintroduce leaks | Multiple brand packages pollute the boundary model | `AGENTS.md` and the developer guide document the single-package pattern; `check-boundaries.mjs` can be extended to enforce that any `packages/brand-*` workspace follows the same allowlist rules |
| `@enterprise/ui` maintainers import brand components for convenience | `ui → brand` dependency direction inverted | CI violation rule explicitly blocks `@enterprise/ui → @enterprise/brand`; error message explains the direction; absence of `@enterprise/brand` from `packages/ui/package.json` prevents TypeScript resolution in IDE |
| Brand isolation enforced at build time but not visible in IDE until compile | Developer confusion during authoring | The absence of `@enterprise/brand` from forbidden packages' `dependencies` fields means TypeScript shows "Cannot find module" in the IDE before CI runs — builds on the package.json-as-enforcer pattern already used by `@enterprise/contracts` (zod only) |
| `BrandLogo` renders broken image in local dev (placeholder SVG paths missing) | Poor local DX | Two placeholder SVG files (`logo-full.svg`, `logo-mark.svg`) are committed to `ui/public/brand/` as part of the package scaffold; `defaultBrandConfig` paths reference them |

---

## Implementation phases

| Phase | Deliverable | Dependencies |
|-------|-------------|--------------|
| 1 | `BrandConfig` Zod schema and type added to `packages/contracts/src/dto/brand.ts`; exported from `packages/contracts/src/index.ts` | None |
| 2 | `packages/brand/` scaffold: `package.json`, `tsconfig.json`, `AGENTS.md`, `src/index.ts`, `src/types/brand-config.ts` | Phase 1 |
| 3 | `packages/brand/src/config/default.ts` with `defaultBrandConfig`; placeholder SVG assets in `ui/public/brand/` | Phase 1 |
| 4 | `BrandLogo`, `BrandName`, `LegalFooter` components with unit tests | Phases 2–3 |
| 5 | `scripts/check-boundaries.mjs` updated with new `packages/brand` allowlist entry and two negative rules; smoke test verified locally | Phase 2 |
| 6 | `ui/package.json` adds `"@enterprise/brand": "workspace:*"`; `ui/next.config.ts` adds `"@enterprise/brand"` to `transpilePackages` | Phases 2, 5 |
| 7 | Root `AGENTS.md` dependency direction table updated; `packages/brand/AGENTS.md` committed | Phase 2 |
| 8 | Developer guide entry written; production readiness checklist verified | Phases 1–7 |

---

## Decisions log

| Decision | Outcome | Rationale |
|----------|---------|-----------|
| New `@enterprise/brand` package vs. extending `@enterprise/ui` with brand sub-path | New dedicated `packages/brand/` | Separate package allows `check-boundaries.mjs` to enforce the direction mechanically; conflating brand-specific assets with generic primitives in `@enterprise/ui` would make the `ui → brand` rule unenforceable |
| `check-boundaries.mjs` script vs. ESLint/Biome import plugin | Existing `check-boundaries.mjs` script | Script already exists and runs in CI; Biome import plugin ecosystem is not yet mature enough for a production-critical enforcement mechanism; MVP consistency wins |
| `@enterprise/brand` allowed to import `@enterprise/ui`? | Yes | Brand components need `cn()` and may compose shadcn/ui primitives; the reverse direction is forbidden and CI-enforced |
| `@enterprise/brand` allowed to import `@enterprise/core`? | No — explicitly forbidden | Brand components are purely presentational; data needs are fulfilled by props or context, never by direct service calls; enforced in CI and package.json |
| `BrandConfig` lives in `@enterprise/contracts` or `@enterprise/brand`? | `@enterprise/contracts` — re-exported from brand | Contracts is the single source of truth for all data shapes; placing `BrandConfig` there allows future consumers (e.g., a DB-backed brand loader) to type-check without depending on the brand package |
| Plain `<img>` vs. `next/image` in `BrandLogo`? | Plain `<img>` | `@enterprise/brand` must not depend on Next.js; adopters may wrap or replace `BrandLogo` with a `next/image`-based component in `ui/` |
| Brand-specific feature toggles location | `packages/brand/src/config/features.ts` | Prevents `if (brand === 'x')` conditionals in `@enterprise/core` services; keeps feature toggles colocated with the brand they govern |
| `@enterprise/ui` omits `@enterprise/brand` from its `package.json` dependencies | Yes — intentional omission | TypeScript cannot resolve an import that is not listed in `package.json`; this adds IDE-level enforcement before CI runs; defense in depth alongside the boundary script |
| Who owns the decision tree? | Architecture team; documented in `packages/brand/AGENTS.md` and linked from the root `AGENTS.md` | Decision tree must be discoverable at the point of contribution; colocation with the brand package maximises visibility for new contributors |
| Placeholder SVG assets location | `ui/public/brand/` | Next.js serves `public/` as static assets; `defaultBrandConfig` references `/brand/logo-full.svg` — a path directly accessible to the dev server without additional configuration |

---

## File inventory

### New files

| File | Purpose |
|------|---------|
| `packages/brand/AGENTS.md` | Brand package agent instructions, decision tree, boundary rules, violation example |
| `packages/brand/package.json` | Package manifest: `@enterprise/brand`, deps, exports, scripts |
| `packages/brand/tsconfig.json` | TypeScript config extending root tsconfig |
| `packages/brand/src/index.ts` | Barrel export |
| `packages/brand/src/types/brand-config.ts` | Re-exports `BrandConfig` from `@enterprise/contracts` |
| `packages/brand/src/config/default.ts` | `defaultBrandConfig` — typed fallback for local dev |
| `packages/brand/src/components/brand-logo.tsx` | `BrandLogo` component |
| `packages/brand/src/components/brand-name.tsx` | `BrandName` component |
| `packages/brand/src/components/legal-footer.tsx` | `LegalFooter` component |
| `packages/brand/src/components/__tests__/brand-logo.test.tsx` | Unit tests for `BrandLogo` |
| `packages/brand/src/components/__tests__/brand-name.test.tsx` | Unit tests for `BrandName` |
| `packages/brand/src/components/__tests__/legal-footer.test.tsx` | Unit tests for `LegalFooter` |
| `packages/brand/src/config/__tests__/default.test.ts` | Validates `defaultBrandConfig` satisfies `BrandConfig` |
| `packages/contracts/src/dto/brand.ts` | `brandConfigSchema` + `BrandConfig` type (owned by Brand Abstraction Layer RFC; referenced here) |
| `ui/public/brand/logo-full.svg` | Placeholder full logotype SVG for local dev |
| `ui/public/brand/logo-mark.svg` | Placeholder mark/icon SVG for local dev |

### Modified files

| File | Change |
|------|--------|
| `scripts/check-boundaries.mjs` | Add `"packages/brand"` allowlist entry; extend `ui` allowlist with `@enterprise/brand`; add two negative rules (infrastructure → brand, ui → brand) |
| `ui/package.json` | Add `"@enterprise/brand": "workspace:*"` to `dependencies` |
| `ui/next.config.ts` | Add `"@enterprise/brand"` to `transpilePackages` array |
| `packages/contracts/src/index.ts` | Re-export `BrandConfig` and `brandConfigSchema` from `./dto/brand` |
| `AGENTS.md` (root) | Update dependency direction table to include `@enterprise/brand` row; link to `packages/brand/AGENTS.md` |
| `docs/adr/004-package-dependencies.md` | Add `@enterprise/brand` to allowed dependencies and forbidden dependencies tables |

---

*Last updated: 2026-05-11*
