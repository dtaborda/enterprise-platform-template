# Packages — Agent Instructions

Each package has its own AGENTS.md with workspace-specific rules and auto-invoke tables. See `packages/*/AGENTS.md` for details.

## Package Boundary Rules

1. Each package is a self-contained workspace member with its own `package.json`
2. Internal dependencies use `workspace:*` protocol
3. Packages MUST NOT import from `@enterprise/web` (the app)
4. Packages export via the `exports` field in `package.json` — respect the public API

## Dependency Direction

```
@enterprise/contracts → zod (ONLY external dep)
@enterprise/core      → @enterprise/contracts + @enterprise/db + supabase
@enterprise/db        → drizzle-orm (ONLY external dep, NO business logic)
@enterprise/ui        → clsx + tailwind-merge + CVA + lucide-react + radix-ui (NO business logic)
```

## Adding a New Package

1. Create `packages/{name}/` with `package.json`, `tsconfig.json`, `src/index.ts`
2. Set `"name": "@enterprise/{name}"` and `"private": true`
3. Extend root tsconfig: `"extends": "../../tsconfig.json"`
4. Add to consuming package's dependencies: `"@enterprise/{name}": "workspace:*"`
5. Add to `ui/next.config.ts` transpilePackages if it contains JSX
6. Create `packages/{name}/AGENTS.md` following the template of an existing package. Add the new scope to `skills/skill-sync/assets/sync.sh:get_agents_path()` so auto-invoke tables are maintained
