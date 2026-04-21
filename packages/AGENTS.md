# Packages — Agent Instructions

### Auto-invoke Skills

When performing these actions, invoke the corresponding available skill FIRST. Repo-local skills require `pnpm skills:setup` (or `./skills/setup.sh --opencode`) so the runtime can see `.agents/skills`.

| Action | Skill |
|--------|-------|
| Adding RLS policies | `drizzle` |
| Creating database relations | `drizzle` |
| Creating database schemas | `drizzle` |
| Defining table columns and types | `drizzle` |
| Implementing pgvector/embeddings | `drizzle` |
| Running migrations | `drizzle` |
| Working with Supabase auth | `drizzle` |
| Writing database queries | `drizzle` |
| TypeScript types, exports, interfaces, strict-mode fixes | `typescript` |
| React package UI work | `react-19` |
| Tailwind styling in shared UI packages | `tailwind-4` |
| Playwright E2E work | `playwright` |

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
@enterprise/ui        → clsx + tailwind-merge + CVA + lucide-react (NO business logic)
```

## Adding a New Package

1. Create `packages/{name}/` with `package.json`, `tsconfig.json`, `src/index.ts`
2. Set `"name": "@enterprise/{name}"` and `"private": true`
3. Extend root tsconfig: `"extends": "../../tsconfig.json"`
4. Add to consuming package's dependencies: `"@enterprise/{name}": "workspace:*"`
5. Add to `ui/next.config.ts` transpilePackages if it contains JSX
