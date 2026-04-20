# @enterprise/ui — Agent Instructions

## Purpose

Shared UI component library based on shadcn/ui. Design tokens, base components, and the `cn()` utility.

### Auto-invoke Skills

When performing these actions, ALWAYS invoke the corresponding skill FIRST:

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

---

## Rules

1. **No business logic**: Components here are generic and reusable. No domain knowledge
2. **shadcn/ui pattern**: Components follow shadcn/ui conventions (CVA variants, ref as prop (React 19), className prop)
3. **Tailwind 4**: Use `@theme` for design tokens in `globals.css`. No `var()` in className — use token names directly
4. **cn() always**: Merge classNames with `cn()` from `lib/utils.ts`
5. **No Tailwind import**: `globals.css` MUST NOT import tailwindcss. The consuming app handles that
6. **Peer deps**: React and Tailwind are peer dependencies — never bundle them

## Adding a New Component

Use `npx shadcn@latest add {component}` from `ui/` — it will install to the correct location based on `components.json` aliases.

Alternatively, create manually in `src/components/{component-name}.tsx` following shadcn/ui patterns.

## Design Tokens

Enterprise Platform uses a configurable design system. Tokens are defined in `src/styles/globals.css` under `@theme`. See `docs/design/tokens.md` for the full mapping and `docs/design/rules.md` for composition rules (No-Line Rule, Glass Rule, Surface Hierarchy).
