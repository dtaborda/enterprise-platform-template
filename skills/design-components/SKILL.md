---
name: design-components
description: >
  Enterprise Platform component composition patterns — how to build feature UI
  from shadcn/ui primitives following the project design system.
  Trigger: When creating new UI components or composing shadcn primitives.
license: Apache-2.0
metadata:
  author: enterprise-platform
  version: "1.0.0"
  scope: [packages/ui, ui]
  auto_invoke:
    - "Creating feature components"
    - "Building dashboard cards or panels"
    - "Composing shadcn components for a screen"
    - "Creating navigation or layout components"
    - "Building mobile-first UI"
allowed-tools: Read, Edit, Write, Glob, Grep
---

# Enterprise Platform Component Patterns

## References

For complete component code examples, see:

- [Component Patterns](../../docs/design/components.md) — Cards, data tables, quick actions, sidebar, notification patterns, layout shells
- [Design Rules](../../docs/design/rules.md) — Composition rules applied to components

---

## Principle

**80% shadcn/ui, 20% composition.** Install shadcn components, theme them with tokens, compose into feature UI. Nothing from scratch.

## shadcn Components to Use

| Component | Design Adaptation |
|-----------|------------------|
| Card | `bg-surface-container-low`, no border, `rounded-2xl` |
| Button | Gradient CTA variant for primary actions |
| Input | `bg-surface-container-highest`, no border, focus ring only |
| Badge | Status chips: emerald/error/secondary color variants |
| Progress | `bg-surface-container-highest` track, `bg-primary-container` fill |
| Avatar | `rounded-full`, `border-2 border-primary/20` |
| Dialog/Sheet | Glass overlay (`bg-background/80 backdrop-blur-xl`) |
| Popover | `bg-surface-container`, no border |
| Tabs | Active: `bg-primary-container/10 text-primary-container` |
| DataTable | `bg-surface-container-low` rows, `hover:bg-surface-container-high` |

## Key Compositions

### Stat Card

`Card` + value + label + trend. Applies `surface-container-low` background with tonal hover.

```tsx
<Card className="bg-surface-container-low p-6 rounded-2xl relative overflow-hidden group hover:bg-surface-container-high transition-all">
```

### Data Row

Flexbox + metadata + status badge. Use grayscale-on-hover for image reveals if applicable.

### Navigation

Active: `bg-primary/10 text-primary border-r-4 border-primary`
Inactive: `text-muted-foreground hover:text-foreground hover:bg-foreground/5`

### Input

No border (No-Line Rule). Background is `surface-container-highest`. Focus shows ring.

```tsx
<Input className="bg-surface-container-highest border-none rounded-xl focus:ring-1 focus:ring-primary/30" />
```

## Layout Shells

### Desktop: Sidebar + TopBar + Content

```
Sidebar: fixed left, w-64, bg-background
TopBar: fixed top, glass blur, ml-64
Content: ml-64, pt-24, px-8
```

### Mobile: TopBar + Content + BottomNav

```
TopBar: sticky top, brand + icons
Content: flex-1, scrollable
BottomNav: fixed bottom, glass blur, rounded-t-2xl
```

## MUST DO

- Install shadcn components before building (`npx shadcn@latest add`)
- Apply token overrides via className, not by modifying shadcn source
- Use `cn()` for all conditional classes
- Follow the component placement decision tree (see `ui/AGENTS.md`)
- Check `docs/design/components.md` for the exact pattern before building

## NEVER DO

- Build components from scratch when shadcn has a primitive
- Use shadcn default colors (zinc/slate) — always override with design tokens
- Mix Lucide and Material Symbols in the same view
- Create components in `packages/ui` that have domain knowledge
