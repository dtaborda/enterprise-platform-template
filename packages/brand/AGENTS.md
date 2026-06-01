# @enterprise/brand — Agent Instructions

## Purpose

Brand isolation package. Owns brand configuration, resolution, context, and brand-aware UI components (`BrandProvider`, `BrandLogo`, `BrandFooter`). Depends on `@enterprise/ui` for primitives (`cn()`, `ThemeProvider`) and `@enterprise/contracts` for shared types.

**This package is brand-specific** — `@enterprise/ui` must remain brand-agnostic.

### Auto-invoke Skills

When performing these actions, ALWAYS invoke the corresponding skill FIRST:

| Action | Skill |
|--------|-------|
| Committing changes | `enterprise-commit` |
| Creating a git commit | `enterprise-commit` |
| Writing TypeScript types/interfaces | `typescript` |
| Writing React components | `react-19` |
| Working with Tailwind classes | `tailwind-4` |

---

## Critical Rules — Non-Negotiable

- ALWAYS: Use `cn()` from `@enterprise/ui/lib/utils` — never manual string concatenation
- ALWAYS: Import `ThemeProvider`/`useTheme` from `@enterprise/ui/theme/provider`
- ALWAYS: Use named exports only
- NEVER: Import from `@enterprise/core` or `@enterprise/db` — brand is UI-layer only
- NEVER: Duplicate utilities that already exist in `@enterprise/ui`
- NEVER: Add business logic (that belongs in `@enterprise/core`)

---

## Dependency Rules

```
@enterprise/brand → @enterprise/contracts (types, BrandConfig schema)
@enterprise/brand → @enterprise/ui       (cn, ThemeProvider, useTheme)
```

`ui` (web) MAY import `@enterprise/brand`. `@enterprise/ui` MUST NOT import `@enterprise/brand` (would create a cycle).

---

## Project Structure

```
packages/brand/
├── package.json
├── tsconfig.json
├── AGENTS.md
└── src/
    ├── index.ts                        # Barrel export
    └── brand/
        ├── context.ts                  # BrandContext, BrandContextValue ("use client")
        ├── provider.tsx                # BrandProvider, useBrand — wraps ThemeProvider
        ├── resolve.ts                  # resolveBrand() — server-only, reads next/headers
        ├── registry.ts                 # buildRegistry, getBrandBySlug, getAllBrands
        ├── metadata.ts                 # generateBrandMetadata() — Next.js Metadata helper
        ├── brand-logo.tsx              # BrandLogo component
        ├── brand-footer.tsx            # BrandFooter component
        └── __tests__/                  # Vitest unit tests (project: brand)
```

---

## Adding a New Brand

1. Create `src/brands/{slug}.brand.ts` implementing `BrandConfig`
2. Register it in `src/brands/index.ts`
3. Do NOT modify `@enterprise/ui` — brand config is fully isolated here

---

## Commands

```bash
pnpm --filter @enterprise/brand typecheck   # TypeScript compilation
pnpm --filter @enterprise/brand test        # Vitest unit tests (project: brand)
```

---

## QA Checklist (before commit)

- [ ] `pnpm typecheck` passes (root or package-level)
- [ ] `pnpm vitest run --project brand` passes
- [ ] `node scripts/check-boundaries.mjs` passes (no ui→brand imports)
- [ ] Named exports only — no default exports
- [ ] No imports from `@enterprise/core` or `@enterprise/db`
- [ ] Brand resolution logic (server-only) stays in `resolve.ts`
