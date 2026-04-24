# @enterprise/ui — Agent Instructions

## Purpose

Shared UI component library based on shadcn/ui. It owns design tokens, base components, and the `cn()` utility.

### Auto-invoke Skills

When performing these actions, invoke the corresponding available skill FIRST. Repo-local skills require `pnpm skills:setup` (or `./skills/setup.sh --opencode`) so the runtime can see `.agents/skills`.

| Action | Skill |
|--------|-------|
| Adding hover states or transitions | `design-rules` |
| Building dashboard cards or panels | `design-components` |
| Building mobile-first UI | `design-components` |
| Choosing between border and tonal shift | `design-rules` |
| Choosing colors for components | `design-tokens` |
| Composing layout structure | `design-rules` |
| Composing shadcn components for a screen | `design-components` |
| Creating cards, panels, or containers | `design-rules` |
| Creating feature components | `design-components` |
| Creating navigation or layout components | `design-components` |
| Defining spacing or border radius values | `design-tokens` |
| Modifying globals.css or @theme tokens | `design-tokens` |
| Setting typography font families or weights | `design-tokens` |
| Styling component visual hierarchy | `design-rules` |
| Writing or refactoring React components | `react-19` |
| Strict TypeScript changes in UI components | `typescript` |
| Tailwind styling, tokens, and class composition | `tailwind-4` |

---

## Rules

1. **No business logic**: Components here are generic and reusable. No domain knowledge.
2. **shadcn/ui pattern**: Components follow shadcn/ui conventions (CVA variants, `className`, and React 19 patterns).
3. **Tailwind 4**: Use `@theme` tokens in `src/styles/globals.css`. No `var()` in `className`.
4. **cn() always**: Merge classNames with `cn()` from `src/lib/utils.ts`.
5. **No Tailwind import here**: `globals.css` MUST NOT import Tailwind itself. The consuming app handles that.
6. **Peer deps**: React and Tailwind are peer dependencies — never bundle them.

## Adding a New Component

Prefer creating components manually in `packages/ui/src/components/{component-name}.tsx` following the existing shadcn-style patterns already present in this package.

`ui/components.json` exists for the app workspace, but its aliases point back to `@enterprise/ui`. Do **not** assume `npx shadcn@latest add {component}` from `ui/` will safely write to the package without inspection.

If you use the shadcn CLI for scaffolding:
1. Run it from `ui/` because that is where `components.json` lives.
2. Verify the generated files land in the intended package paths.
3. Move or normalize the result into `packages/ui/src/components/` and `packages/ui/src/lib/` before committing.

## Design Tokens

Theme tokens are generated from JSON source files and imported into `globals.css`.

### Theme Workflow

The theme system is **schema-driven** — never edit generated files directly.

**To modify tokens:**
1. Edit `src/themes/light.json` (light mode defaults) and/or `src/themes/dark.json` (dark overrides)
2. Run `pnpm build:theme` to regenerate
3. Commit the generated `src/styles/theme-generated.css` and `src/tokens/index.ts`

**Where things live:**
| What | Where |
|------|-------|
| Zod schemas (ThemeConfig, ThemeMode, etc.) | `packages/contracts/src/schemas/theme.ts` |
| Source theme JSON | `src/themes/light.json`, `src/themes/dark.json` |
| Generated CSS (@theme + dark overrides) | `src/styles/theme-generated.css` ← **do not edit** |
| Generated TS tokens | `src/tokens/index.ts` ← **do not edit** |
| Global selectors (body, scrollbar, @keyframes) | `src/styles/globals.css` |
| ThemeProvider + useTheme hook | `src/theme/provider.tsx` |
| ThemeToggle button component | `src/theme/toggle.tsx` |
| Build pipeline script | `scripts/build-theme.ts` |

**Generated file rules:**
- `theme-generated.css` and `tokens/index.ts` are committed to git (no .gitignore)
- They are owned by `pnpm build:theme` — do NOT manually edit them
- CI will detect changes if the JSONs change but regeneration was not committed

**Structure of theme-generated.css:**
- `@theme { ... }` — all light mode token values (colors, typography, radius, spacing, layout)
- `[data-theme="dark"] { ... }` — dark mode color overrides ONLY
- No `--animate-*` tokens — those stay in `globals.css` (reference @keyframes)

Before changing tokens or components, inspect:
- `packages/ui/src/themes/light.json` and `dark.json`
- `packages/ui/src/styles/globals.css`
- `packages/ui/src/components/`
- `packages/ui/src/lib/utils.ts`
