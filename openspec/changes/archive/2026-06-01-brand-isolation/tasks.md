# Tasks: brand-isolation

## Review Workload Forecast

| Field | Value |
|-------|-------|
| Estimated changed lines | ~950–1050 (additions + deletions) |
| 800-line budget risk | High |
| Chained PRs recommended | Yes |
| Suggested split | PR1 → PR2 → PR3 |
| Delivery strategy | auto-chain |
| Chain strategy | pending |

Decision needed before apply: No
Chained PRs recommended: Yes
Chain strategy: pending
800-line budget risk: High

### Live Repo Verification (resolved in task planning)

| Open question | Answer |
|---|---|
| Exact 7 subpath keys in packages/ui/package.json | `./brand/context`, `./brand/provider`, `./brand/resolve`, `./brand/registry`, `./brand/metadata`, `./brand/brand-logo`, `./brand/brand-footer` |
| Exact file count under src/brand + src/brands | 8 src files + 6 test files + 2 brands files = **16 files** |
| Bundler packages/ui uses | **None (tsc-only)** — `tsc --noEmit` + `tsx` for scripts; exports TypeScript source directly, no dist build |

### Suggested Work Units

| Unit | Goal | Likely PR | Lines | Notes |
|------|------|-----------|-------|-------|
| 1 | Scaffold packages/brand + wire all config | PR 1 | ~165 | Base: main; pnpm lockfile committed |
| 2 | Copy brand files + rewrite imports + RED→GREEN + switch layout.tsx | PR 2 | ~635 | Base: PR1 branch; both old+new paths valid; step 3 included |
| 3 | Strip packages/ui brand exports + enforce boundary | PR 3 | ~250 | Base: PR2 branch; integration gate: E2E brand tests |

## Phase 1: Scaffold + Config (PR 1)

- [ ] 1.1 Create `packages/brand/package.json` — name `@enterprise/brand`, `"type": "module"`, deps: `@enterprise/contracts` + `@enterprise/ui` (`workspace:*`), peers: `next` + `react` + `react-dom` + `tailwindcss`, devDeps: `next` + `@types/react` + `@types/react-dom` + `tsx` + `typescript` + `zod`; 8 subpath exports: `.`, `./context`, `./provider`, `./resolve`, `./registry`, `./metadata`, `./brand-logo`, `./brand-footer` → `./src/brand/*.{ts,tsx}`; scripts: `typecheck`, `test`, `clean`
- [ ] 1.2 Create `packages/brand/tsconfig.json` — `extends: "../../tsconfig.json"`, include `src`
- [ ] 1.3 Create `packages/brand/src/index.ts` — empty barrel (filled in Phase 2)
- [ ] 1.4 Create `packages/brand/AGENTS.md` — package purpose, boundary rules, auto-invoke table (mirror packages/core template)
- [ ] 1.5 Add `brand` project block to `vitest.config.ts` — `{ name: "brand", root: "./packages/brand", environment: "node", include: ["src/**/*.test.ts"] }`; add `"packages/brand/src/**/*.ts"` to `coverage.include`
- [ ] 1.6 Add `@enterprise/brand` + `@enterprise/brand/*` path entries to root `tsconfig.json` — resolve to `packages/brand/src` / `packages/brand/src/*`
- [ ] 1.7 Add `"@enterprise/brand"` to `ui/next.config.ts` `transpilePackages` array
- [ ] 1.8 Update `scripts/check-boundaries.mjs` — add `"packages/brand": ["@enterprise/contracts", "@enterprise/ui"]` entry; add `"@enterprise/brand"` to `ui` allowlist
- [ ] 1.9 Add `packages/brand)` case to `skills/skill-sync/assets/sync.sh` `get_agents_path()` → `echo "$REPO_ROOT/packages/brand/AGENTS.md"`
- [ ] 1.10 Run `pnpm install` — verify `pnpm-lock.yaml` updated; commit lockfile with scaffold
- [ ] 1.11 Verify: `pnpm typecheck` passes; `node scripts/check-boundaries.mjs` passes; `vitest run --project brand` exits 0 (0 tests = clean scaffold)

## Phase 2: Copy + Rewrite + RED → GREEN (PR 2)

- [ ] 2.1 **[RED]** Copy 6 test files `packages/ui/src/brand/__tests__/*.test.ts` → `packages/brand/src/brand/__tests__/` verbatim (relative imports `../provider`, `../context` etc. unchanged — directory structure mirrored). Confirm `vitest run --project brand` **fails** (source files absent).
- [ ] 2.2 Copy `packages/ui/src/brands/index.ts` → `packages/brand/src/brands/index.ts` (verbatim)
- [ ] 2.3 Copy `packages/ui/src/brands/enterprise.brand.ts` → `packages/brand/src/brands/enterprise.brand.ts` (verbatim)
- [ ] 2.4 Copy `packages/ui/src/brand/context.ts` → `packages/brand/src/brand/context.ts` (verbatim — no `@enterprise/*` imports)
- [ ] 2.5 Copy `packages/ui/src/brand/resolve.ts` → `packages/brand/src/brand/resolve.ts` (verbatim — no relative `@enterprise/*` imports)
- [ ] 2.6 Copy `packages/ui/src/brand/metadata.ts` → `packages/brand/src/brand/metadata.ts` (verbatim)
- [ ] 2.7 Copy `packages/ui/src/brand/registry.ts` → `packages/brand/src/brand/registry.ts`; update hardcoded error string: `packages/ui/src/brands/` → `packages/brand/src/brands/`
- [ ] 2.8 Copy `packages/ui/src/brand/brand-footer.tsx` → `packages/brand/src/brand/brand-footer.tsx`; rewrite: `../lib/utils` → `@enterprise/ui/lib/utils`; update any `biome-ignore` comment referencing `packages/ui` → `packages/brand`
- [ ] 2.9 Copy `packages/ui/src/brand/provider.tsx` → `packages/brand/src/brand/provider.tsx`; rewrite: `../theme/provider` → `@enterprise/ui/theme/provider`
- [ ] 2.10 Copy `packages/ui/src/brand/brand-logo.tsx` → `packages/brand/src/brand/brand-logo.tsx`; rewrite: `../lib/utils` → `@enterprise/ui/lib/utils`; `../theme/provider` → `@enterprise/ui/theme/provider`; update `biome-ignore` comment `packages/ui` → `packages/brand`
- [ ] 2.11 Copy `packages/ui/src/brand/index.ts` → `packages/brand/src/brand/index.ts` (verbatim); fill `packages/brand/src/index.ts` barrel with re-exports from `./brand/index`
- [ ] 2.12 **[GREEN]** Verify: `vitest run --project brand` **passes** (6 tests green); `vitest run --project ui` still green (ui brand tests still present)
- [ ] 2.13 Rewrite `ui/app/layout.tsx` lines 1–3: `@enterprise/ui/brand/metadata` → `@enterprise/brand/metadata`; `@enterprise/ui/brand/provider` → `@enterprise/brand/provider`; `@enterprise/ui/brand/resolve` → `@enterprise/brand/resolve`
- [ ] 2.14 Verify: `pnpm typecheck` passes; `vitest run` (all projects) green; `node scripts/check-boundaries.mjs` passes; both old `@enterprise/ui/brand/*` and new `@enterprise/brand/*` imports resolve

## Phase 3: UI Cleanup + Boundary Enforcement (PR 3)

- [ ] 3.1 Remove brand section (lines 1–13) from `packages/ui/src/index.ts` — `BrandConfig` re-export + 10 brand symbol exports
- [ ] 3.2 Remove 7 `./brand/*` entries from `packages/ui/package.json` exports map
- [ ] 3.3 Delete `packages/ui/src/brand/` directory (8 src + 6 test files = 14 files)
- [ ] 3.4 Delete `packages/ui/src/brands/` directory (2 files)
- [ ] 3.5 Update `.env.example`: replace path comment `packages/ui/src/brands/` → `packages/brand/src/brands/`
- [ ] 3.6 Verify final state: `pnpm typecheck` passes; `vitest run` (all projects) green; `node scripts/check-boundaries.mjs` passes (ui→brand forbidden by omission — `packages/ui` allowlist has no `@enterprise/brand`); `pnpm e2e --grep brand` **green** (integration gate); confirm TS error on `import from "@enterprise/ui/brand/provider"` (no matching export)
