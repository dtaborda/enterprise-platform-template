---
name: design-rules
description: >
  Enterprise Platform design composition rules — No-Line Rule, Glass Rule,
  Surface Hierarchy, gradient CTAs, typography patterns, motion.
  Trigger: When composing UI layouts, styling components, or making visual decisions.
license: Apache-2.0
metadata:
  author: enterprise-platform
  version: "1.0.0"
  scope: [packages/ui, ui]
  auto_invoke:
    - "Composing layout structure"
    - "Styling component visual hierarchy"
    - "Adding hover states or transitions"
    - "Creating cards, panels, or containers"
    - "Choosing between border and tonal shift"
allowed-tools: Read, Edit, Write, Glob, Grep
---

# Enterprise Platform Design Rules

## References

For complete rules with code examples, see:

- [Design Rules](../../docs/design/rules.md) — No-Line Rule, Glass Rule, Surface Hierarchy, typography patterns, motion, do's/don'ts
- [Design Tokens](../../docs/design/tokens.md) — Color values and font assignments

---

## Critical Rules (always apply)

### 1. No-Line Rule

**NEVER use 1px borders for visual separation.** Use tonal shifts instead.

```tsx
// ❌ WRONG
<div className="border border-border">

// ✅ CORRECT
<div className="bg-surface-container-low">
  <div className="bg-surface-container-lowest">
```

**Only exception**: Focus rings and active navigation indicator (`border-r-4 border-primary`).

### 2. Surface Hierarchy

Parent uses LOWER level, child uses HIGHER level, hover goes one level up:

```tsx
<div className="bg-surface-container-low">           {/* card */}
  <div className="bg-surface-container-lowest          {/* nested item */}
    hover:bg-surface-container-highest transition-colors">
```

### 3. Glass Rule

Overlays use backdrop blur: `bg-background/80 backdrop-blur-xl`

### 4. Gradient CTAs

Primary actions ONLY: `bg-gradient-to-r from-primary-fixed-dim to-primary-container`

### 5. Label Pattern

All metadata: `text-xs font-label uppercase tracking-widest text-primary-container`

### 6. Motion

- All interactive: `transition-all`
- Click feedback: `active:scale-[0.98]` or `active:scale-95`
- Images: `grayscale group-hover:grayscale-0 duration-500`
- Compound: use `group` + `group-hover`

### MUST DO

- Use tonal shifts for depth (No-Line Rule)
- Add hover states on every interactive element
- Use `font-label` + `uppercase` + `tracking-widest` for metadata
- Keep spacing consistent: `p-6` cards, `gap-6` grids

### NEVER DO

- Use `border` for visual separation
- Mix font families within a role (headline=Manrope, body=Inter, label=Space Grotesk)
- Use `shadow-*` — use tonal shifts or glass blur
- Skip hover states on interactive elements
