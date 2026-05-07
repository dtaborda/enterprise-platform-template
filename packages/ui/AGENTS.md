# @enterprise/ui — Agent Instructions

## Purpose

Shared UI component library based on shadcn/ui. It owns design tokens, base components, the theme system, and the `cn()` utility. Components here are GENERIC — no business logic, no domain knowledge.

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

## Critical Rules — Non-Negotiable

### Components

- ALWAYS: Use `cn()` to merge classNames — never manual string concatenation
- ALWAYS: Use CVA (`class-variance-authority`) for variant-based components
- ALWAYS: Accept `className` prop and merge it with `cn()`
- ALWAYS: Use named exports (e.g., `export { Button }`)
- NEVER: Business logic, API calls, or domain-specific behavior in this package
- NEVER: Direct Tailwind color values — use semantic tokens (`bg-primary`, not `bg-blue-500`)

### Styling

- ALWAYS: Use semantic color tokens from `globals.css` (`background`, `foreground`, `primary`, etc.)
- ALWAYS: Use `@theme` tokens for custom values — check `src/styles/theme-generated.css`
- NEVER: `var()` in className (Tailwind 4 doesn't support it)
- NEVER: Hex colors or raw RGB values in className
- NEVER: Import Tailwind in this package — the consuming app handles that

### Theme System

- ALWAYS: Edit `src/themes/light.json` or `dark.json` → run `pnpm build:theme`
- NEVER: Edit `theme-generated.css` or `tokens/index.ts` manually (they are generated)
- NEVER: Add `--animate-*` tokens to the theme JSONs (those live in `globals.css`)

---

## Decision Trees

### Does This Component Belong Here or in `ui/components/`?

```
Is it a generic UI primitive (button, card, dialog, input)?
├── Yes → packages/ui/src/components/ (THIS package)
└── No
    ├── Is it domain-specific (ResourceCard, TenantSwitcher)?
    │   └── Yes → ui/features/{feature}/components/ or ui/components/
    └── Is it a composed pattern of 2+ primitives for a specific use?
        └── Yes → ui/components/ (app-level shared component)
```

### Modifying Design Tokens

```
Need to change a color, font, radius, or spacing?
├── Edit src/themes/light.json (and/or dark.json)
├── Run `pnpm build:theme`
├── Verify theme-generated.css has the expected output
└── Commit BOTH the JSON source AND the generated files

Need to add a keyframe animation?
└── Add to src/styles/globals.css directly (not the theme JSONs)
```

---

## Patterns

### CVA Component (variant-based)

```typescript
import { cn } from "@enterprise/ui/lib/utils";
import { cva, type VariantProps } from "class-variance-authority";
import type * as React from "react";

const badgeVariants = cva(
  "inline-flex items-center rounded-md px-2.5 py-0.5 text-xs font-semibold transition-colors",
  {
    variants: {
      variant: {
        default: "bg-primary text-primary-foreground",
        secondary: "bg-secondary text-secondary-foreground",
        destructive: "bg-destructive text-white",
        outline: "border text-foreground",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  },
);

function Badge({
  className,
  variant,
  ...props
}: React.ComponentProps<"div"> & VariantProps<typeof badgeVariants>) {
  return <div className={cn(badgeVariants({ variant }), className)} {...props} />;
}

export { Badge, badgeVariants };
```

### Simple Component (no variants)

```typescript
import { cn } from "@enterprise/ui/lib/utils";
import type * as React from "react";

function Separator({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      className={cn("shrink-0 bg-border", className)}
      {...props}
    />
  );
}

export { Separator };
```

### cn() Usage

```typescript
// Merge base + conditional + consumer override
<div className={cn(
  "rounded-lg border bg-card p-4",          // base
  isActive && "ring-2 ring-primary",         // conditional
  className,                                  // consumer override (always last)
)} />
```

---

## Rules

1. **No business logic**: Components here are generic and reusable. No domain knowledge.
2. **shadcn/ui pattern**: Components follow shadcn/ui conventions (CVA variants, `className`, React 19 patterns).
3. **Tailwind 4**: Use `@theme` tokens in `src/styles/globals.css`. No `var()` in `className`.
4. **cn() always**: Merge classNames with `cn()` from `src/lib/utils.ts`.
5. **No Tailwind import here**: `globals.css` MUST NOT import Tailwind itself. The consuming app handles that.
6. **Peer deps**: React and Tailwind are peer dependencies — never bundle them.

---

## Project Structure

```
packages/ui/
├── package.json
├── tsconfig.json
├── AGENTS.md
├── scripts/
│   └── build-theme.ts           # Theme generation pipeline
└── src/
    ├── index.ts                  # Barrel export
    ├── components/
    │   ├── button.tsx            # CVA variant component
    │   ├── card.tsx
    │   ├── dialog.tsx
    │   ├── input.tsx
    │   ├── select.tsx
    │   ├── table.tsx
    │   └── ...                   # All shadcn/ui primitives
    ├── lib/
    │   └── utils.ts              # cn() utility (clsx + tailwind-merge)
    ├── styles/
    │   ├── globals.css           # Global selectors, @keyframes, scrollbar
    │   └── theme-generated.css   # ⚠️ GENERATED — do not edit
    ├── theme/
    │   ├── provider.tsx          # ThemeProvider + useTheme hook
    │   └── toggle.tsx            # ThemeToggle button component
    ├── themes/
    │   ├── light.json            # Source of truth: light mode tokens
    │   └── dark.json             # Source of truth: dark mode overrides
    ├── tokens/
    │   └── index.ts              # ⚠️ GENERATED — do not edit
    └── utils/                    # Additional utilities (if any)
```

---

## Theme Workflow

The theme system is **schema-driven** — never edit generated files directly.

| What | Where |
|------|-------|
| Zod schemas (ThemeConfig, ThemeMode, etc.) | `@enterprise/contracts` → `src/schemas/theme.ts` |
| Source theme JSON | `src/themes/light.json`, `src/themes/dark.json` |
| Generated CSS (@theme + dark overrides) | `src/styles/theme-generated.css` ← **do not edit** |
| Generated TS tokens | `src/tokens/index.ts` ← **do not edit** |
| Global selectors (body, scrollbar, @keyframes) | `src/styles/globals.css` |
| ThemeProvider + useTheme hook | `src/theme/provider.tsx` |
| Build pipeline script | `scripts/build-theme.ts` |

Generated files are committed to git. CI will detect drift if JSONs change but regeneration was not committed.

---

## Adding a New Component

1. Create `src/components/{component-name}.tsx` following the CVA pattern above
2. Accept `className` prop and merge with `cn()`
3. Use named export only
4. Use semantic tokens — never raw colors
5. Export from `src/index.ts`

> **Note**: `ui/components.json` exists in the app workspace. If you use `npx shadcn@latest add`, run from `ui/` and verify files land in the correct package paths. Prefer manual creation following existing patterns.

---

## Commands

```bash
pnpm --filter @enterprise/ui build:theme     # Regenerate tokens from JSON
pnpm --filter @enterprise/ui typecheck       # TypeScript compilation
pnpm --filter @enterprise/ui lint            # Biome lint
```

---

## QA Checklist (before commit)

- [ ] All components use `cn()` for className merging
- [ ] No `var()` in className, no hex colors, no raw values
- [ ] CVA variants defined for any component with visual states
- [ ] `className` prop accepted and merged (consumer override always last)
- [ ] No business logic or domain types imported
- [ ] If tokens changed: both JSON source AND generated files committed
- [ ] New components exported from `src/index.ts`
