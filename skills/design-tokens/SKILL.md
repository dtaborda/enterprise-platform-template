---
name: design-tokens
description: >
  Enterprise Platform design tokens — color system, typography, spacing, and radii.
  Maps design system tokens to shadcn conventions.
  Trigger: When creating or modifying CSS tokens, theme variables, or color values.
license: Apache-2.0
metadata:
  author: enterprise-platform
  version: "1.0.0"
  scope: [packages/ui, ui]
  auto_invoke:
    - "Modifying globals.css or @theme tokens"
    - "Choosing colors for components"
    - "Setting typography font families or weights"
    - "Defining spacing or border radius values"
allowed-tools: Read, Edit, Write, Glob, Grep
---

# Enterprise Platform Design Tokens

## References

For the complete token tables, see:

- [Full Token Map](../../docs/design/tokens.md) — All color tokens, shadcn mapping, typography scale, spacing

---

## Quick Reference

### shadcn Core Token Mapping

| shadcn | Purpose |
|--------|---------|
| `background` | Page background |
| `foreground` | Primary text |
| `card` | Card / panel surface |
| `primary` | Brand accent / CTA |
| `primary-foreground` | Text on primary |
| `muted` | Elevated surface / hover |
| `muted-foreground` | Secondary text |
| `destructive` | Error states |
| `input` | Form input background |
| `ring` | Focus ring |

### Extended Tokens (surface hierarchy)

```
Level 0: surface-dim              → Page bg (darkest)
Level 1: surface-container-lowest → Nested cards
Level 2: surface-container-low    → Primary cards
Level 3: surface-container        → Mid containers
Level 4: surface-container-high   → Elevated/hover
Level 5: surface-container-highest→ Inputs, active
Level 6: surface-bright           → Brightest surface
```

### Typography

| Role | Font | Class |
|------|------|-------|
| Headlines | Manrope | `font-headline` |
| Body | Inter | (default) |
| Labels/metadata | Space Grotesk | `font-label` |

### MUST DO

- Use shadcn token names (`bg-card`, `text-primary`) for shadcn components
- Use extended tokens (`bg-surface-container-low`) for custom compositions
- Declare all tokens in `@theme` block in `packages/ui/src/styles/globals.css`
- Keep token definitions consistent across light and dark modes

### NEVER DO

- Use hardcoded hex values in components
- Use oklch values unless the design system explicitly adopts them
- Add tokens outside the `@theme` block
- Modify tokens without checking `docs/design/tokens.md` first
