# Archive Report: brand-isolation

**Archived**: 2026-06-01
**Roadmap item**: #15 — Brand Isolation Package
**Status**: COMPLETE — merged to main @ 92fcf6b

## PRs Merged

| PR | Title | Merge commit |
|---|---|---|
| #125 | feat(brand): scaffold @enterprise/brand package + wire config | 3b67b75 |
| #126 | feat(brand): migrate brand source + tests; switch layout.tsx consumer | ba2ba2a |
| #127 | refactor(ui): remove brand exports from @enterprise/ui; enforce boundary | 92fcf6b |

## Engram Artifact IDs

| Artifact | Observation ID | Topic key |
|---|---|---|
| Proposal | #2771 | sdd/brand-isolation/proposal |
| Spec | #2773 | sdd/brand-isolation/spec |
| Design | #2772 | sdd/brand-isolation/design |
| Tasks | #2774 | sdd/brand-isolation/tasks |
| Apply Progress | #2775 | sdd/brand-isolation/apply-progress |
| Status | #2777 | sdd/brand-isolation/status |
| Archive Report | (see Engram) | sdd/brand-isolation/archive-report |

## Specs Promoted to Canonical

Both domains were NEW — no prior canonical spec existed. Delta specs promoted verbatim.

| Domain | Action | Canonical path |
|---|---|---|
| brand-boundary | Created (4 requirements, 12 scenarios) | `openspec/specs/brand-boundary/spec.md` |
| brand-behavior | Created (5 requirements, 12 scenarios) | `openspec/specs/brand-behavior/spec.md` |

## What Changed in Production

### New: @enterprise/brand package (`packages/brand/`)

- 8 source files + 6 test files + 2 brand config files = 16 files total
- No bundler — exports TypeScript source via tsc (same as @enterprise/ui)
- Subpath exports: `.`, `./context`, `./provider`, `./resolve`, `./registry`, `./metadata`, `./brand-logo`, `./brand-footer`
- Dependencies: `@enterprise/contracts` + `@enterprise/ui` (workspace:*); peers: `next`, `react`, `react-dom`

### Modified: @enterprise/ui — zero brand references

- Removed brand barrel exports from `packages/ui/src/index.ts`
- Removed 7 `./brand/*` subpath entries from `packages/ui/package.json`
- Deleted `packages/ui/src/brand/` (8 src + 6 test files) and `packages/ui/src/brands/` (2 files)
- vitest `ui` project: 209 → 164 tests (45 migrated to @enterprise/brand — not lost)

### Modified: Consumer rewire

- `ui/app/layout.tsx`: 3 imports `@enterprise/ui/brand/*` → `@enterprise/brand/*`

### Modified: Config + tooling wiring

- `vitest.config.ts` — new `brand` project block (45 tests, 6 files)
- root `tsconfig.json` — @enterprise/brand + subpath path aliases
- `ui/next.config.ts` — added `@enterprise/brand` to `transpilePackages`
- `scripts/check-boundaries.mjs` — FORBID ui→brand; ALLOW brand→[contracts,ui]; ALLOW web→brand
- `skills/skill-sync/assets/sync.sh` — `packages/brand` case in `get_agents_path()`
- `.env.example` — updated brand config comment path

## Final Verification Results

| Gate | Result |
|---|---|
| `pnpm install --frozen-lockfile` | ✅ Pass |
| `pnpm typecheck` (7/7 projects) | ✅ Pass |
| `pnpm lint` (345 files) | ✅ Pass |
| `pnpm test` (brand 45, ui 164, core 187, contracts 323, web 115) | ✅ Pass |
| `node scripts/check-boundaries.mjs` | ✅ Pass (zero violations) |
| `pnpm e2e --grep brand` (4 tests) | ✅ Pass |
| Negative gate: TS2307 on old `@enterprise/ui/brand/provider` | ✅ Confirmed |

## Key Learnings (apply to future changes)

1. `vitest passWithNoTests` MUST be in the package `test` script, NOT global vitest config
2. `check-boundaries.mjs` allowlist array must stay within Biome 100-char line width — format error not caught without lint
3. `build:theme` (triggered by turbo typecheck) rewrites `packages/ui/src/styles/theme-generated.css` + `packages/ui/src/tokens/index.ts` with timestamp drift — always revert before committing
4. `packages/ui` has NO local tsconfig; new packages that need one (like `packages/brand`) must create their own
5. `vi.mock` paths in test files may need rewriting to absolute paths when tests move to a new package directory
6. `tsconfig.json` needs `composite: false` override to avoid TS6307 for non-composite packages
7. Root and ui tsconfigs need explicit subpath path mappings (e.g., `@enterprise/brand/*`) when files live under `src/brand/*`

## Next Roadmap Item

P1 #17 — Test and CI stability hardening (flaky E2E: theme×4 + notifications always fail; team-management/workspace-admin/password-reset rotate by timing)
