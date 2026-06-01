# Design: brand-isolation

> NOTE: Live codebase and Engram artifact reads were blocked by an environment
> tool-output failure during this phase. This design is built from the
> orchestrator brief (proposal + exploration summary). The exact 7 subpath names
> and the 11 src / 6 test file list MUST be reconciled against the exploration
> artifact and `packages/ui/package.json` `exports` during sdd-tasks/sdd-apply.

## Technical Approach

Extract all brand code from `@enterprise/ui` into a new `@enterprise/brand`
package. Approach A dependency graph:

    @enterprise/web   → @enterprise/brand   (only prod consumer: layout.tsx, 3 imports)
    @enterprise/brand → @enterprise/contracts, @enterprise/ui  (+ react/react-dom peer)
    @enterprise/ui    → brand-agnostic (no brand exports)

No cycle: `ui` stops depending on brand; `brand` depends on `ui`. Build never
breaks if we create+wire first, move with both paths valid, then strip old.

## Architecture Decisions

| Decision | Choice | Rationale |
|---|---|---|
| Direction | brand → ui (Approach A) | UI is the lower primitive; brand composes it. Keeps `ui` reusable/brand-free. |
| Move vs copy-first | Copy into brand, keep ui exports until consumer switched | Keeps repo green mid-migration; clean revert. |
| Build tooling | Mirror `packages/ui` exactly (same bundler/scripts) | Consistency; zero new tooling decisions. |
| registry dynamic require | Keep `require("../brands/index")` relative | `brand/` and `brands/` move together → relative path still resolves post-move. Verify resolved path in apply. |
| Subpath exports | Mirror the existing 7 `@enterprise/ui` brand subpaths 1:1 under `@enterprise/brand` | Drop-in import rename for consumer. |

## Package Scaffold — `packages/brand/`

- **package.json**: `name: "@enterprise/brand"`, `private: true`, `type: module`,
  `version` matching workspace convention. `exports` map mirroring the 7 brand
  subpaths (verify against `packages/ui` brand exports). `dependencies`:
  `@enterprise/contracts: workspace:*`, `@enterprise/ui: workspace:*`.
  `peerDependencies`: `react`, `react-dom`. `devDependencies` + `scripts`
  (`build`, `typecheck`, `lint`) copied from `packages/ui`.
- **tsconfig.json**: extend the same base as `packages/ui`; add path/composite
  settings to match.
- **build config**: identical bundler config to `packages/ui` (same entry-per-
  subpath pattern).

## File Move Map (reconcile exact names with exploration)

| Source (`@enterprise/ui`) | Destination (`@enterprise/brand`) |
|---|---|
| `src/brand/**` (registry.ts, provider, config, …) | `packages/brand/src/brand/**` |
| `src/brands/**` (index.ts + brand defs) | `packages/brand/src/brands/**` |
| brand test files (`*.test.ts(x)`) | colocated under `packages/brand/src/**` |

11 src + 6 test files total. **Import rewrites inside moved files:**

- `../theme/provider` → `@enterprise/ui/theme/provider`
- `../lib/utils` → `@enterprise/ui/lib/utils`
- (any other `../<ui-internal>` relative → matching `@enterprise/ui/<subpath>`)
- `registry.ts`: keep `require("../brands/index")` (both dirs move together);
  confirm it resolves from `packages/brand/src/brand/registry.ts`.
- Update hardcoded error string referencing the old package/path.
- Update `biome-ignore` comment if it names the old location.
- Update `.env.example` brand comment to point at `@enterprise/brand`.

## `@enterprise/ui` Cleanup

1. Remove brand barrel exports from the `ui` root index.
2. Remove the `BrandConfig` re-export (consumers import it from
   `@enterprise/contracts` or `@enterprise/brand`).
3. Remove the 7 brand subpath entries from `packages/ui/package.json` `exports`.
4. Delete the moved `src/brand/` and `src/brands/` dirs.

## Consumer Rewrite — `ui/app/layout.tsx`

3 import lines: `@enterprise/ui/brand…` → `@enterprise/brand…` (same subpath
suffixes). No logic change.

## Config / Tooling Wiring

| Target | Change |
|---|---|
| `vitest.config.ts` | New `brand` project block mirroring the `ui` block, root `packages/brand`. |
| root `tsconfig.json` paths | Add `@enterprise/brand` + 7 subpath aliases. |
| `ui/next.config.ts` | Add `@enterprise/brand` to `transpilePackages`. |
| `scripts/check-boundaries.mjs` | Allow `web→brand`, `brand→[contracts,ui]`; FORBID `ui→brand`. |
| `skills/skill-sync/assets/sync.sh` | Add `@enterprise/brand` case to `get_agents_path()`. |

## Testing Strategy / TDD Sequencing (for apply)

| Layer | Approach |
|---|---|
| Unit | Move tests alongside code; run under new vitest `brand` project. For a move-refactor, RED = migrated tests can't resolve from `@enterprise/brand` until files+exports land; GREEN = same assertions pass from new package. |
| Integration | Keep the existing brand E2E as the integration gate — must stay green across the whole migration. |

Meaningful RED→GREEN: add the `brand` vitest project + a failing import test
first, then move files to satisfy it. No assertion logic changes — behavior is
preserved, location moves.

## Migration Ordering (build never breaks)

1. **Create + wire**: scaffold `packages/brand`, add all config wiring (vitest,
   tsconfig paths, transpilePackages, check-boundaries allowances, sync.sh).
2. **Copy + rewrite**: copy brand files into `packages/brand`, rewrite imports,
   add `@enterprise/brand` deps. Old (`@enterprise/ui/brand`) AND new paths both
   valid. Typecheck/test green.
3. **Switch consumer**: repoint `layout.tsx` to `@enterprise/brand`. Verify
   typecheck + unit + E2E green.
4. **Strip old**: remove brand exports/dirs from `@enterprise/ui`; tighten
   `check-boundaries` to forbid `ui→brand`. Verify green.

## Risk / Rollback

| Risk | Mitigation |
|---|---|
| Dependency cycle (ui↔brand) | Step 4 strips `ui` brand code; `ui` never imports `brand`. Boundary check enforces. |
| Dynamic `require` breaks post-move | `brand/`+`brands/` move together; verify resolution in step 2 before stripping. |
| Mid-migration red build | Steps 1–3 keep both import paths valid; nothing deleted until consumer switched. |
| Stale `pnpm-lock.yaml` | Run `pnpm install` after step 1 (new workspace pkg); commit lockfile. |

**Rollback**: until step 4, revert = drop `packages/brand` + revert `layout.tsx`
(ui still ships brand). After step 4, revert the cleanup commit to restore ui
exports.

## Open Questions (BLOCKING precision, not approach)

- [ ] Confirm the exact 7 brand subpath names from `packages/ui/package.json`.
- [ ] Confirm the exact 11 src + 6 test file paths from the exploration artifact.
- [ ] Confirm `packages/ui` bundler (tsdown/tsup/tsc) to copy build config verbatim.
