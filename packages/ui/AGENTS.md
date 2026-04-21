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

Tokens are defined in `src/styles/globals.css` under `@theme`.

Before changing tokens or components, inspect:
- `packages/ui/src/styles/globals.css`
- `packages/ui/src/components/`
- `packages/ui/src/lib/utils.ts`
