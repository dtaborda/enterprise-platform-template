---
title: "Brand isolation package PRD"
description: "Defines package structure, dependency rules, and CI enforcement to guarantee that brand-specific code never leaks into shared infrastructure packages."
owner: "Engineering"
lastUpdated: "2026-05-11"
---

# Brand isolation package PRD

## Purpose

Define the structural and enforcement rules that keep brand-specific code — logos, color palettes, metadata, legal copy, feature toggles — in a dedicated `@enterprise/brand` package. This PRD is about WHERE brand code lives and HOW the monorepo prevents it from leaking into business logic or infrastructure, not about WHAT a brand is (that is the Brand Abstraction Layer PRD).

## Scope

- Included: new `packages/brand/` package structure, dependency graph rules for `@enterprise/brand`, updated `check-boundaries.mjs` to enforce brand isolation in CI, decision tree for classifying new code into brand vs. ui vs. core, package scaffold requirements (AGENTS.md, tsconfig, exports), and documentation for template adopters.
- Excluded: runtime capabilities delivered by the Brand Abstraction Layer (brand context, BrandProvider, token injection), design token definitions (Theme System PRD), feature-flag evaluation logic (Feature Flags PRD), and any brand-specific business rules that belong in individual brand packages outside this template.

---

## Problem

Without an explicit package boundary, brand-specific concerns creep into shared infrastructure over multiple pull requests. The pattern appears in three recurring failure modes.

First, the service layer accumulates conditional branches: `if (brand === 'acme') { sendEmail(...) }` inside `packages/core/src/services/`. This makes services untestable in isolation and forces every brand switch to touch business logic.

Second, the database schema acquires brand-specific columns in otherwise generic tables — a `brand_theme_override` column on `tenants`, or a brand-scoped lookup table that only one deployment ever uses. This pollutes `@enterprise/db` with deployment-specific knowledge it should not hold.

Third, contracts (Zod DTOs) grow brand-specific optional fields that only one deployment exercises. Every adopter of the template then carries dead fields and must understand which fields apply to their brand context.

The root cause is the absence of a dedicated home for brand code. When there is no `@enterprise/brand`, the developer's natural instinct is to put brand logic wherever it fits — which ends up being `core`, `db`, or `contracts`. Making the boundary explicit and machine-enforced in CI is the only durable solution.

## Users and stakeholders

| Role | Need |
|------|------|
| Template maintainer | A single authoritative place for brand code; CI that catches regressions before review |
| Template adopter | A clear scaffold to follow when adding a new brand; confidence that their brand changes will not touch shared packages |
| New contributor | A decision tree that answers "where does this code go?" without requiring architect-level knowledge |
| Reviewer | A short, mechanical checklist to verify brand isolation in every PR |

## Goals

- Provide a `packages/brand/` scaffold that is the only valid home for brand-specific TypeScript code.
- Define an explicit, documented dependency graph that `@enterprise/brand` follows and that prevents it from importing `@enterprise/core` or `@enterprise/db`.
- Update `scripts/check-boundaries.mjs` to enforce brand isolation rules in CI so violations fail the build rather than appearing in code review.
- Give every developer a decision tree to determine whether a piece of code belongs in `brand`, `ui`, or `core` without ambiguity.

---

## Dependency graph (enforced)

```
@enterprise/brand
  ├── MAY import: @enterprise/contracts   (brand config schema, DTO types)
  ├── MAY import: @enterprise/ui          (theme token types for CSS variable injection)
  ├── MUST NOT import: @enterprise/core   (no business logic dependency)
  ├── MUST NOT import: @enterprise/db     (no schema dependency)
  └── MUST NOT import: @enterprise/web    (no app dependency — rule already enforced)

@enterprise/core
  ├── MAY import: @enterprise/contracts
  ├── MAY import: @enterprise/db
  ├── MUST NOT import: @enterprise/brand  (core is brand-agnostic)
  └── MUST NOT import: @enterprise/ui

@enterprise/db
  ├── MAY import: drizzle-orm ONLY
  └── MUST NOT import: @enterprise/brand

@enterprise/contracts
  ├── MAY import: zod ONLY
  └── MUST NOT import: @enterprise/brand

@enterprise/ui
  ├── MAY import: @enterprise/contracts   (theme schemas)
  └── MUST NOT import: @enterprise/brand  (ui is brand-agnostic; brand imports ui, not vice versa)

ui/ (Next.js app)
  ├── MAY import: @enterprise/brand       (at layout level only)
  ├── MAY import: @enterprise/contracts
  ├── MAY import: @enterprise/core
  ├── MAY import: @enterprise/ui
  └── MAY import: @enterprise/db
```

The key invariant: **brand flows in one direction only.** `@enterprise/brand` consumes from the infrastructure packages; nothing in the infrastructure packages imports back from `@enterprise/brand`.

---

## MVP scope

### Core capabilities

**Package scaffold (`packages/brand/`)**

The new `packages/brand/` directory is added to the monorepo with the following structure:

```
packages/brand/
├── AGENTS.md              # Brand package agent instructions
├── package.json           # name: @enterprise/brand, private: true
├── tsconfig.json          # extends ../../tsconfig.json
└── src/
    ├── index.ts           # Barrel export
    ├── config/
    │   └── default.ts     # DefaultBrandConfig — fallback values for local dev
    ├── components/
    │   ├── brand-logo.tsx          # Logo component, brand-config-driven
    │   ├── brand-name.tsx          # Typographic brand name component
    │   └── legal-footer.tsx        # Legal/copyright text component
    └── types/
        └── brand-config.ts         # Re-export of BrandConfig type from @enterprise/contracts
```

`@enterprise/brand` is listed as a dependency in `ui/package.json` with `workspace:*` protocol. It is added to `ui/next.config.ts` `transpilePackages` because it contains JSX.

**Brand-specific components**

The following components move out of `ui/` (or are created here for the first time) and live exclusively in `@enterprise/brand`:

- `BrandLogo` — renders the brand's logotype. Accepts `variant` (`full | mark`) and `size` props. Sources image path and alt text from `BrandConfig`.
- `BrandName` — renders the brand's display name as a styled `<span>`. Sources the name string from `BrandConfig`.
- `LegalFooter` — renders the copyright notice, legal entity name, and optional links (privacy policy, terms). Sources all strings from `BrandConfig`.

None of these components import from `@enterprise/core` or `@enterprise/db`. They are pure presentational components that receive brand configuration as props or via the `BrandProvider` context defined in the Brand Abstraction Layer.

**Updated `check-boundaries.mjs`**

`scripts/check-boundaries.mjs` is extended to add `packages/brand` to the allowed workspace map and enforce the brand-isolation invariants:

```
"packages/brand": ["@enterprise/contracts", "@enterprise/ui"],
```

The existing `ui` entry is extended:

```
ui: [
  "@enterprise/contracts",
  "@enterprise/core",
  "@enterprise/ui",
  "@enterprise/db",
  "@enterprise/brand",    // added — ui may consume brand at layout level
],
```

Two new negative rules are added to the loop body:

1. If `sourceWorkspace` is `packages/core`, `packages/db`, or `packages/contracts` and `targetPackage` is `@enterprise/brand`, record a violation: `"{sourceWorkspace} MUST NOT import @enterprise/brand — keep infrastructure brand-agnostic"`.
2. If `sourceWorkspace` is `packages/ui` and `targetPackage` is `@enterprise/brand`, record a violation: `"@enterprise/ui MUST NOT import @enterprise/brand — brand imports ui, not vice versa"`.

These two rules encode the core invariant mechanically and run on every CI push.

**Decision tree for new code**

Every developer must answer three questions when deciding where a piece of code belongs:

```
Is this code specific to one deployment's brand identity?
│
├── YES → Does it render UI? (component, icon, styled text)
│          ├── YES → @enterprise/brand/components/
│          └── NO  → Is it configuration? (name, color, URL, legal string)
│                     ├── YES → brand config object in brand package
│                     └── NO  → Is it a feature toggle tied to a brand?
│                                ├── YES → @enterprise/brand/config/features.ts
│                                └── NO  → Contact architecture team
│
└── NO  → Is it a generic UI primitive? (button, card, input)
           ├── YES → @enterprise/ui/components/
           └── NO  → Is it business logic? (service, query, computation)
                      ├── YES → @enterprise/core/services/
                      └── NO  → Is it a data contract? (DTO, schema)
                                 ├── YES → @enterprise/contracts/
                                 └── NO  → Is it a table definition?
                                            ├── YES → @enterprise/db/
                                            └── NO  → Contact architecture team
```

**AGENTS.md for `packages/brand/`**

A new `packages/brand/AGENTS.md` is created with the following mandatory rules:

- NEVER import from `@enterprise/core` or `@enterprise/db` — violations fail CI.
- NEVER import from `@enterprise/web` — same rule as all packages.
- Brand-specific feature toggles live here, never in `@enterprise/core`.
- Components in this package MUST be purely presentational — no Server Actions, no direct Supabase calls.
- All brand configuration MUST be typed against `BrandConfig` from `@enterprise/contracts`.

**`packages/brand/` added to Turborepo**

`turbo.json` build graph treats `@enterprise/brand` as a standard package dependency. Because it contains JSX, its `build` task must complete before the `ui` build begins (`dependsOn: ["^build"]` is already the default and covers this case without extra configuration).

### Out of scope (MVP)

- Runtime brand-switching between brands within the same deployment (covered by Brand Abstraction Layer).
- Per-brand Supabase RLS policies or tenant-scoped brand overrides.
- Brand-specific email templates (those belong in a notifications adapter, not in `@enterprise/brand`).
- Automated lint rule via an ESLint or Biome plugin (the `check-boundaries.mjs` script is sufficient for MVP; a dedicated lint plugin is a follow-up).
- Brand asset pipeline (image optimization, SVG sprite generation).
- Storybook stories for brand components.

---

## User stories and acceptance criteria (from the developer perspective)

### US-1: Template adopter adds a new brand without touching shared packages

**As** a template adopter, **I want** to add a new brand configuration without modifying `@enterprise/core`, `@enterprise/db`, or `@enterprise/contracts`, so that shared packages remain stable across all my deployments.

Acceptance criteria:
1. Creating a new brand means adding files only inside `packages/brand/src/config/` and the consuming app (`ui/`).
2. No changes to `packages/core/src/services/`, `packages/db/src/`, or `packages/contracts/src/` are required to introduce a new brand.
3. `pnpm check-boundaries` passes after adding the new brand config without additional allowlist modifications.
4. The new brand config is typed against `BrandConfig` from `@enterprise/contracts` and a TypeScript error appears if required fields are missing.

### US-2: Developer receives a CI failure when brand code leaks into core

**As** a developer, **I want** the CI pipeline to fail with a clear error when I accidentally import `@enterprise/brand` from `@enterprise/core`, so that I catch the leak before it reaches code review.

Acceptance criteria:
1. Adding `import { BrandName } from "@enterprise/brand"` to any file inside `packages/core/src/` causes `pnpm check-boundaries` to exit with code 1.
2. The error message identifies the violating file path and the specific rule broken: `"packages/core MUST NOT import @enterprise/brand — keep infrastructure brand-agnostic"`.
3. The same failure occurs for imports of `@enterprise/brand` in `packages/db/` and `packages/contracts/`.
4. The CI `lint` job runs `check-boundaries.mjs` and is marked as failed, blocking merge.

### US-3: Developer receives a CI failure when @enterprise/ui imports brand

**As** a developer, **I want** the CI pipeline to fail when `@enterprise/ui` tries to import from `@enterprise/brand`, so that the ui package remains a brand-agnostic primitive library.

Acceptance criteria:
1. Adding `import { BrandLogo } from "@enterprise/brand"` to any file inside `packages/ui/src/` causes `pnpm check-boundaries` to exit with code 1.
2. The error message states: `"@enterprise/ui MUST NOT import @enterprise/brand — brand imports ui, not vice versa"`.
3. `@enterprise/brand` may freely import from `@enterprise/ui` without triggering any violation.

### US-4: Reviewer uses a decision tree to classify new code in a PR

**As** a code reviewer, **I want** a documented decision tree in `packages/brand/AGENTS.md` so I can verify in under 30 seconds whether new code in a PR is in the correct package.

Acceptance criteria:
1. `packages/brand/AGENTS.md` contains the full decision tree (brand vs. ui vs. core vs. contracts vs. db).
2. The tree is written as a text diagram that renders correctly in GitHub Markdown.
3. The AGENTS.md includes at least one concrete example of a boundary violation and the correct resolution.
4. The root `AGENTS.md` dependency direction table is updated to include `@enterprise/brand` in the correct position.

### US-5: BrandLogo renders the correct asset per brand config

**As** a developer building a brand deployment, **I want** the `BrandLogo` component to derive its image source and alt text entirely from `BrandConfig` so I never hardcode asset paths in layout files.

Acceptance criteria:
1. `BrandLogo` accepts a `config: BrandConfig` prop (or reads from `BrandContext` when context is available).
2. Rendering `<BrandLogo variant="full" />` with a given config uses `config.logoUrl` for `src` and `config.name` for `alt`.
3. Rendering `<BrandLogo variant="mark" />` uses `config.logoMarkUrl` when defined, falling back to `config.logoUrl`.
4. `BrandLogo` has no import from `@enterprise/core` or `@enterprise/db`. TypeScript compilation passes with `strict: true`.
5. A unit test verifies that the correct `src` is rendered for both `full` and `mark` variants.

### US-6: LegalFooter renders brand-specific legal copy without hardcoding strings

**As** a developer building a brand deployment, **I want** the `LegalFooter` component to render the legal entity name, copyright year, and policy links from `BrandConfig` so legal strings are never scattered across layout files.

Acceptance criteria:
1. `LegalFooter` accepts a `config: BrandConfig` prop (or reads from `BrandContext`).
2. It renders `© {currentYear} {config.legalName}. All rights reserved.` where `currentYear` is derived at render time.
3. When `config.privacyPolicyUrl` is defined, it renders a "Privacy Policy" link to that URL.
4. When `config.termsUrl` is defined, it renders a "Terms of Service" link to that URL.
5. Neither link renders when the corresponding config field is absent.
6. `LegalFooter` has no import from `@enterprise/core` or `@enterprise/db`.

### US-7: Default brand config allows local development without brand-specific values

**As** a template maintainer, **I want** a `defaultBrandConfig` object exported from `@enterprise/brand` so that local development works out of the box without requiring a brand-specific config to be wired in.

Acceptance criteria:
1. `packages/brand/src/config/default.ts` exports a `defaultBrandConfig` satisfying `BrandConfig` from `@enterprise/contracts`.
2. All required `BrandConfig` fields have sensible placeholder values (e.g., `name: "Enterprise Platform"`, `legalName: "Enterprise Platform Inc."`).
3. `defaultBrandConfig` is re-exported from `packages/brand/src/index.ts`.
4. The seed data and local dev setup use `defaultBrandConfig` without requiring any additional configuration step.

### US-8: New package is registered in the monorepo toolchain

**As** a template maintainer, **I want** `@enterprise/brand` to be a first-class workspace member so that Turborepo, TypeScript, and pnpm all resolve it correctly without manual path hackery.

Acceptance criteria:
1. `packages/brand/package.json` sets `"name": "@enterprise/brand"` and `"private": true` with a `workspace:*` dependency protocol in consuming packages.
2. `packages/brand/tsconfig.json` extends `../../tsconfig.json` and passes `pnpm --filter @enterprise/brand typecheck`.
3. `ui/next.config.ts` lists `@enterprise/brand` in `transpilePackages`.
4. `pnpm build --filter @enterprise/brand` succeeds from a clean state.
5. `scripts/check-boundaries.mjs` includes `"packages/brand"` in `allowedWorkspaceImports` and the CI `lint` job runs it.

---

## Success metrics

- Boundary violation incidents reaching `main` per quarter (target: 0 — every leak is caught in CI before merge).
- Time for a contributor to correctly classify a new piece of brand code using the decision tree, without asking for help (target: under 2 minutes).
- Number of adopter PRs that require a reviewer to manually move brand code to the correct package (target: 0 after the first month following template release).
- CI run time overhead introduced by the updated `check-boundaries.mjs` (target: under 3 seconds added to the `lint` task).
- Ratio of TypeScript errors caught at compile time vs. runtime for `BrandConfig` misuse (target: 100% compile-time — the type system should make runtime brand config errors impossible).

## Risks

| Risk | Mitigation |
|------|------------|
| Developers bypass `check-boundaries.mjs` by committing with `--no-verify` | Script runs in CI as part of the `lint` job, not just as a git hook — local bypass does not prevent CI failure |
| `@enterprise/brand` grows its own business logic over time (creeping complexity) | `packages/brand/AGENTS.md` explicitly forbids Server Actions and Supabase calls; reviewers are directed to check this rule; follow-up: add negative assertion to boundary check for Supabase client imports |
| Brand config schema drifts between `@enterprise/contracts` and actual usage in `@enterprise/brand` | `BrandConfig` in `@enterprise/contracts` is the single source of truth; `defaultBrandConfig` and all brand configs are typed against it — TypeScript catches drift at build time |
| Template adopters create `packages/brand-acme/` parallel packages that reintroduce leaks | AGENTS.md and developer guide document the single-package pattern; `check-boundaries.mjs` can be extended to enforce custom package names follow a naming convention |
| `@enterprise/ui` maintainers inadvertently import brand components for convenience | CI violation rule explicitly blocks `@enterprise/ui → @enterprise/brand`; the error message explains the direction of the dependency |
| Brand isolation is enforced in `check-boundaries.mjs` but not in the IDE | The package.json `dependencies` field for `packages/ui`, `packages/core`, `packages/db`, and `packages/contracts` intentionally omits `@enterprise/brand` — TypeScript will fail to resolve the import even in the IDE before CI runs |

---

## Traceability

### Audit events (if applicable)

Brand isolation is a structural, build-time concern. There are no runtime user-facing mutations and therefore no audit events for this feature. The CI boundary check produces a structured exit code and console log that serves as the audit trail for violations caught pre-merge.

### Sentry

No Sentry instrumentation is required. Brand isolation is enforced at build time and has no runtime failure path. If a future runtime brand-config loading mechanism is introduced (e.g., remote config fetch), Sentry instrumentation would be added at that point under the `brand` area tag.

### Seed data

| Entity | State | Details |
|--------|-------|---------|
| `defaultBrandConfig` | Exported constant | `name: "Enterprise Platform"`, `legalName: "Enterprise Platform Inc."`, placeholder logo paths pointing to `public/` assets included in the template |

No database seed data is required — brand configuration in MVP is a compile-time constant, not a database record.

### E2E flows

| Scenario | Actor | Expected outcome |
|----------|-------|-----------------|
| App shell renders with default brand config | Developer (local dev) | `BrandLogo`, `BrandName`, and `LegalFooter` render without runtime errors using `defaultBrandConfig` |
| `check-boundaries.mjs` blocks a brand leak | CI system | Script exits with code 1 and a violation message when a test file importing `@enterprise/brand` from `packages/core/` is introduced |
| App builds successfully after package scaffold | Developer | `pnpm build` completes with no TypeScript errors after `@enterprise/brand` is added to the workspace |

Full Playwright E2E tests are not required for this PRD. The brand components are static and their correctness is verified through unit tests and the boundary check script. Visual correctness is covered by the Brand Abstraction Layer E2E suite, which exercises the full `BrandProvider` integration.

### External adapters

None. Brand isolation is a monorepo-internal structural concern. No external services, APIs, or environment variables are introduced by this package.

### Production readiness

- [ ] `packages/brand/` scaffold committed with all required files (`package.json`, `tsconfig.json`, `src/index.ts`, `AGENTS.md`)
- [ ] `scripts/check-boundaries.mjs` updated with brand isolation rules and the two new negative checks
- [ ] `check-boundaries.mjs` run added to the `lint` CI job (verify in `.github/workflows/`)
- [ ] `@enterprise/brand` added to `ui/next.config.ts` `transpilePackages`
- [ ] `@enterprise/brand` listed as `workspace:*` dependency in `ui/package.json`
- [ ] `packages/brand/AGENTS.md` includes decision tree and boundary rules
- [ ] Root `AGENTS.md` dependency direction table updated to include `@enterprise/brand`
- [ ] `defaultBrandConfig` exported and used in local dev setup
- [ ] Unit tests pass for `BrandLogo` (both variants) and `LegalFooter` (with and without optional links)
- [ ] `pnpm --filter @enterprise/brand typecheck` passes
- [ ] `pnpm check-boundaries` passes after scaffold with no false positives
- [ ] Developer guide entry written explaining the decision tree and the boundary enforcement mechanism
- [ ] Verified that `packages/core`, `packages/db`, `packages/contracts`, and `packages/ui` have no `@enterprise/brand` in their `package.json` dependencies

---

## Decisions log

| Decision | Outcome | Rationale |
|----------|---------|-----------|
| New `@enterprise/brand` package vs. extending `@enterprise/ui` with a brand sub-path | New dedicated `packages/brand/` package | Extending `@enterprise/ui` would conflate generic primitives with brand-specific assets; a separate package makes the dependency direction unambiguous and allows the boundary checker to enforce it mechanically |
| `check-boundaries.mjs` script vs. ESLint/Biome plugin | `check-boundaries.mjs` script (existing mechanism) | The script already exists and runs in CI; adding a Biome plugin would require a custom plugin that is not yet mature in the ecosystem; consistency with the existing enforcement mechanism is preferred in MVP |
| `@enterprise/brand` allowed to import `@enterprise/ui`? | Yes — brand imports ui, never the reverse | Brand components need theme token types and primitives from `@enterprise/ui`; the reverse direction (ui importing brand) is explicitly forbidden to keep ui a generic library |
| `@enterprise/brand` allowed to import `@enterprise/core`? | No — explicitly forbidden | Brand components must be purely presentational; any data needs come from props or context, not from direct service calls; enforced in CI |
| Brand config as compile-time constant vs. database record | Compile-time constant for MVP | Simplest approach; avoids schema changes; adopters can elevate to DB-driven config if they need runtime switching (that is the Brand Abstraction Layer's responsibility) |
| Where do brand-specific feature toggles live? | `packages/brand/src/config/features.ts` | Feature toggles tied to brand identity (e.g., a feature enabled only for one brand) belong in the brand package, not in `@enterprise/core`; this prevents `if (brand === X)` in the service layer |
| Should `@enterprise/ui` be updated to list `@enterprise/brand` as a forbidden dependency in its `package.json`? | Yes — omit `@enterprise/brand` from ui's dependencies entirely | TypeScript cannot resolve an import from a package not listed in `dependencies`; this provides IDE-level enforcement before CI runs, in addition to the boundary script |
| Who owns the decision tree? | Architecture team, documented in `packages/brand/AGENTS.md` | The decision tree must be discoverable at the point of contribution; colocating it in the brand package AGENTS.md and linking from the root AGENTS.md maximizes visibility |

---

*Last updated: 2026-05-11*
