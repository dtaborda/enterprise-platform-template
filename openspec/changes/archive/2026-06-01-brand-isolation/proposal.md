# Proposal: Brand Isolation Package (#15)

## Intent

Feature #14 landed all brand code inside `@enterprise/ui` (merged @ dd81fd5). That couples the design-system package to a specific identity: any adopter who wants a different brand must edit the shared UI library, and `@enterprise/ui` cannot be published as a neutral, brand-agnostic primitives package. This change extracts ALL brand code into a new workspace package `@enterprise/brand` (`packages/brand/`), leaving `@enterprise/ui` with ZERO brand references. Roadmap feature #15 "Brand Isolation Package"; depends on #14 (Done).

## Scope

### In Scope
- Create new workspace package `@enterprise/brand` at `packages/brand/`.
- Move 11 source files + 6 unit test files out of `packages/ui/src/brand` and `packages/ui/src/brands`.
- Rewire the single production consumer: 3 import lines in `ui/app/layout.tsx` (`@enterprise/ui/brand/*` → `@enterprise/brand/*`).
- Remove all brand exports from `packages/ui/src/index.ts` and the 7 `./brand/*` subpath exports from `packages/ui/package.json`.
- Wire config: `vitest.config.ts` (new `brand` project), root `tsconfig.json` paths, `ui/next.config.ts` `transpilePackages`, `scripts/check-boundaries.mjs`, `.env.example` comment, `skills/skill-sync/assets/sync.sh`.
- Keep all 6 migrated unit tests and the `ui/e2e/brand/brand.spec.ts` E2E suite green.

### Out of Scope
- Fixing the flaky `ui/e2e/notifications/` E2E suite — DO NOT touch.
- Converting `registry.ts` dynamic `require("../brands/index")` to static ESM import — noted as a follow-up, NOT blocking.
- Any new brand features, runtime brand switching, or visual brand editor.
- `@enterprise/db` schema, RLS, or any DB change (none required).
- Approach B (standalone brand package) — exploration rejected it; we keep the brand↔theme coupling.

## Capabilities

> Pure structural refactor. No spec-level behavior changes — the public brand API (symbols, subpath shape, runtime behavior) is byte-identical, only the package boundary moves.

### New Capabilities
- None — no new behavior is introduced.

### Modified Capabilities
- None — `openspec/specs/` is empty and no requirement-level behavior changes. The brand contract is preserved verbatim; only its hosting package changes.

## Approach

**Approach A** (validated in exploration): `@enterprise/brand` depends on `@enterprise/ui` for primitives (`cn` from `@enterprise/ui/lib/utils`, `ThemeProvider`/`useTheme` from `@enterprise/ui/theme/provider`). `BrandProvider` keeps wrapping `ThemeProvider` (brand dictates initial theme mode via `themeRef`). The only code delta inside moved files is relative imports (`../lib/utils`, `../theme/provider`) becoming workspace imports (`@enterprise/ui/*`). Zero duplication; brand–theme coupling preserved.

Migration order: scaffold package → move sources + tests → fix imports inside moved files → strip brand from `@enterprise/ui` → rewire `layout.tsx` → wire config/tooling → typecheck/lint/test/e2e green.

## Dependency Rule (ENFORCED)

```
@enterprise/contracts → zod ONLY
@enterprise/ui        → @enterprise/contracts + clsx + cva + lucide + radix   (ZERO brand refs)
@enterprise/brand     → @enterprise/contracts + @enterprise/ui
@enterprise/web       → @enterprise/contracts + @enterprise/core + @enterprise/ui + @enterprise/db + @enterprise/brand (NEW)
```

FORBIDDEN: `@enterprise/ui → @enterprise/brand` (would reintroduce coupling; enforced via `scripts/check-boundaries.mjs`). `@enterprise/contracts` STAYS a dep of `@enterprise/ui` (form components, theme, hooks need it — unrelated to brand).

## New Package Contract

`packages/brand/package.json` exports (mirror current `@enterprise/ui` brand subpaths, dropping the `brand/` prefix):

```json
{
  ".": "./src/index.ts",
  "./context": "./src/brand/context.ts",
  "./provider": "./src/brand/provider.tsx",
  "./resolve": "./src/brand/resolve.ts",
  "./registry": "./src/brand/registry.ts",
  "./metadata": "./src/brand/metadata.ts",
  "./brand-logo": "./src/brand/brand-logo.tsx",
  "./brand-footer": "./src/brand/brand-footer.tsx"
}
```

- deps: `@enterprise/contracts` (workspace:*), `@enterprise/ui` (workspace:*)
- devDeps: `next`, `@types/react`, `@types/react-dom`, `tsx`, `typescript`, `zod`
- peerDeps: `next`, `react`, `react-dom`

## File Inventory

### CREATE
| Path | Purpose |
|------|---------|
| `packages/brand/package.json` | New workspace package manifest + subpath exports |
| `packages/brand/tsconfig.json` | Extends root tsconfig |
| `packages/brand/src/index.ts` | Barrel (moved brand exports) |
| `packages/brand/AGENTS.md` | Package guidance + dependency rule |

### MOVE (`packages/ui/src/brand|brands` → `packages/brand/src/brand|brands`)
`context.ts`, `provider.tsx`, `resolve.ts`, `registry.ts`, `brand-logo.tsx`, `brand-footer.tsx`, `metadata.ts`, `index.ts`, `brands/enterprise.brand.ts`, `brands/index.ts`, plus 6 test files in `__tests__/` (registry, resolve, provider, brand-logo, brand-footer, metadata).

### EDIT
| Path | Change |
|------|--------|
| Moved files (`provider.tsx`, `brand-logo.tsx`, `brand-footer.tsx`) | Relative imports → `@enterprise/ui/lib/utils`, `@enterprise/ui/theme/provider` |
| `registry.ts` | Update hardcoded error-message path `packages/ui/src/brands/` → `packages/brand/src/brands/`; keep relative `require("../brands/index")` |
| `brand-logo.tsx` | Update `biome-ignore`/comment referencing `packages/ui` → `packages/brand` |
| `packages/ui/src/index.ts` | Remove `BrandConfig` re-export + 10 brand symbols |
| `packages/ui/package.json` | Remove 7 `./brand/*` subpath exports (keep `@enterprise/contracts` dep) |
| `ui/app/layout.tsx` | 3 imports `@enterprise/ui/brand/*` → `@enterprise/brand/*` |
| `vitest.config.ts` | Add `brand` project (root `./packages/brand`, env node, include `src/**/*.test.ts`) |
| `tsconfig.json` (root) | Add `@enterprise/brand` + subpath paths |
| `ui/next.config.ts` | Add `@enterprise/brand` to `transpilePackages` |
| `scripts/check-boundaries.mjs` | Add `packages/brand` allowlist; add `@enterprise/brand` to `ui` allowlist |
| `.env.example` | Update comment `packages/ui/src/brands/` → `packages/brand/src/brands/` |
| `skills/skill-sync/assets/sync.sh` | Add `packages/brand` case to `get_agents_path()` |

## Feature Readiness (Traceability Decision)

Per `feature-readiness` decision tree: this is a **structural refactor — no CUD operations, no external provider**. The full traceability checklist therefore **does not apply**. Explicit statements for reviewers:

- **Audit events**: none added or changed (no mutations).
- **Sentry**: no new `SentryArea`, no Server Actions touched.
- **Seed data**: unchanged; `supabase db reset` unaffected.
- **External adapters**: none.
- **Env vars**: `BRAND_SLUG` behavior is UNCHANGED — `resolveBrand()` logic moves verbatim; the variable is read identically, only from the new package.
- **E2E**: the brand flow already exists (`ui/e2e/brand/brand.spec.ts`) and MUST stay green; no new flows required.

## Risks

| Risk | Likelihood | Mitigation |
|------|------------|------------|
| Import-path migration misses a consumer | Low | Grep verified only 3 imports in `layout.tsx`; no other consumers exist |
| `registry.ts` dynamic `require` fails after move | Medium | Relative `../brands/index` resolves post-move (brands/ moves with it); flagged for static-ESM follow-up, not blocking |
| `BrandConfig` barrel re-export removal breaks an importer | Low | Verified no `import { BrandConfig } from "@enterprise/ui"` exists; all consumers use `@enterprise/contracts` directly |
| Boundary check lets `ui → brand` slip in | Low | Add explicit FORBID rule to `check-boundaries.mjs`; CI fails on violation |
| Stale hardcoded `packages/ui/src/brands/` path in error message | Low | Explicit edit + assert via migrated `registry.test.ts` |
| E2E regression from `layout.tsx` rewire | Low | `ui/e2e/brand/brand.spec.ts` (4 tests) must pass before merge |

## Rollback Plan

Single-PR refactor with no DB/RLS/data changes — revert the merge commit to fully restore brand code into `@enterprise/ui`. No migrations to unwind, no env changes to roll back, no data state. `pnpm install` after revert restores the prior workspace graph.

## Dependencies

- Feature #14 (brand in `@enterprise/ui`) — Done, merged @ dd81fd5 (prerequisite satisfied).

## Success Criteria

- [ ] `@enterprise/brand` package exists at `packages/brand/` with all 11 source files + 6 tests.
- [ ] `grep -r "brand" packages/ui/src` returns ZERO brand references; no `./brand/*` exports remain in `packages/ui/package.json`.
- [ ] `ui/app/layout.tsx` imports brand exclusively from `@enterprise/brand/*`.
- [ ] `scripts/check-boundaries.mjs` enforces `@enterprise/brand → contracts + ui` and FORBIDS `ui → brand`.
- [ ] `pnpm typecheck`, `pnpm lint`, `pnpm test` (incl. new `brand` vitest project), and `pnpm e2e` brand suite all pass.
- [ ] `BRAND_SLUG` resolution behaves identically to pre-change (verified by migrated `resolve.test.ts`).
