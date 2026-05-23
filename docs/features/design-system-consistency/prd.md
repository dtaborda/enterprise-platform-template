---
title: "Design system consistency PRD"
description: "Defines product requirements for standardizing visual patterns across all platform pages."
owner: "Engineering"
priority: "P0"
lastUpdated: "2026-05-23"
---

# Design system consistency PRD

## Purpose

Standardize visual patterns and UX composition across all platform pages so that every screen feels like part of the same product. Currently, each page uses slightly different card styles, spacing, header patterns, and interactive affordances — making the platform feel like a collection of independent prototypes rather than a unified product.

## Scope

- Included: page layout template standardization, card/surface hierarchy, button patterns, badge patterns, table patterns, form patterns, empty states, loading states, and error states.
- Excluded: navigation and layout structure (handled by Platform UX Foundations PRD), landing page (separate PRD), new feature development.

---

## Problem

The platform has 15+ pages across 5 feature modules, each built at different times with slightly different visual decisions:

1. **No standard page template**: Dashboard uses inline cards, Resources uses a table with filters, Settings uses a sidebar+forms layout, Team uses a table with dialogs, Billing uses cards+table. There's no shared "page shell" pattern that dictates header placement, content structure, or action positioning.

2. **Inconsistent card surfaces**: Some pages use `Card` with borders, others use tonal backgrounds. The `bg-card` token exists but isn't applied uniformly. Glass morphism is described in the design system but not implemented.

3. **Mixed button patterns**: Primary actions are sometimes gradient CTAs, sometimes solid primary buttons, sometimes outline buttons. There's no hierarchy rule for when to use which variant.

4. **Badge inconsistency**: Status badges use different color mappings across features (e.g., resource status vs subscription status vs role badges). No shared color mapping or badge component pattern.

5. **No empty states**: Most pages show nothing when data is absent. There's no reusable empty state component.

6. **No loading skeletons**: Pages show a blank screen while data loads. No skeleton/shimmer pattern exists.

7. **Generic error boundaries**: Error pages show minimal UI with no brand consistency.

## Users and stakeholders

| Role | Need |
|------|------|
| All users | Consistent, predictable interface patterns across all pages |
| Template adopters | A configurable design system they can rebrand by changing theme tokens |
| Designers | A documented component pattern library to reference |

## Goals

- Every page follows the same page template pattern (header + content structure).
- One card style, one badge pattern, one button hierarchy — documented and enforced.
- Empty states, loading skeletons, and error states are reusable components.
- All visual patterns derive from theme tokens — changing the theme JSON changes the entire platform look.

---

## MVP scope

### 1. Page template standardization

Define and implement a standard page template used by ALL protected pages:

```
PageHeader (title + subtitle + optional action button)
  ├── title: string (h1, Manrope bold)
  ├── subtitle: string (muted text)
  └── action?: ReactNode (gradient CTA positioned top-right)
PageContent
  └── children (cards, tables, forms, etc.)
```

Migrate all 8 protected pages to use this pattern:
- `/dashboard` — "Dashboard" + welcome subtitle
- `/resources` — "Resources" + "Manage your workspace resources" + "New resource" CTA
- `/resources/new` — "New resource" with breadcrumb
- `/resources/[id]` — resource title with breadcrumb + edit/delete actions
- `/resources/[id]/edit` — "Edit resource" with breadcrumb
- `/team` — "Team" + "Manage members and invitations" + "Invite member" CTA
- `/billing` — "Billing" + "Manage your subscription"
- `/settings` — "Settings" + "Manage your workspace configuration"

### 2. Surface hierarchy

Define 3 surface levels and apply consistently:

| Level | Token | Usage |
|-------|-------|-------|
| Background | `bg-background` | Page background, main content area |
| Card/Surface | `bg-card` | Elevated containers, form groups, data sections |
| Overlay | `bg-popover` | Dialogs, dropdowns, tooltips |

Rules:
- No visible card borders (use tonal shift only — No-Line Rule).
- Cards use `rounded-xl` consistently (from theme `radius` token).
- Glass effect (subtle `backdrop-blur`) on navigation surfaces only.

### 3. Button hierarchy

| Level | Variant | When to use |
|-------|---------|-------------|
| Primary | Gradient CTA (cyan → violet) | Main page action (Create, Upgrade, Save) — ONE per page max |
| Secondary | Solid `bg-primary` | Supporting actions (Invite, Apply filters) |
| Tertiary | `variant="outline"` | Cancel, Back, secondary navigation |
| Destructive | `variant="destructive"` ghost | Delete, Cancel subscription |

### 4. Badge pattern

Standardize badge color mapping across ALL features:

| Semantic | Color | Used for |
|----------|-------|----------|
| Success/Active | Green (`emerald`) | Active status, paid, completed |
| Warning/Pending | Amber | Draft, pending, trialing |
| Danger/Error | Red (`destructive`) | Past due, failed, expired |
| Info/Default | Cyan (`primary`) | Product type, owner role |
| Accent | Violet (`secondary`) | Admin role, service type |
| Neutral | Gray (`muted`) | Archived, member role, guest |

### 5. Empty state component

Create a reusable `EmptyState` component:

```
EmptyState
  ├── icon: LucideIcon (large, muted color)
  ├── title: string ("No resources yet")
  ├── description: string ("Create your first resource to get started")
  ├── action?: { label: string, href: string } (gradient CTA)
  └── link?: { label: string, href: string } ("Learn more →")
```

Apply to: Resources list, Team members (no members), Billing history (no events), Dashboard (new tenant).

### 6. Loading skeleton component

Create a reusable `PageSkeleton` component with shimmer animation:
- `CardSkeleton` — rounded rect with pulse animation
- `TableSkeleton` — header + N rows of pulse bars
- `FormSkeleton` — label + input pulse patterns

Apply to all pages that fetch data server-side (loading.tsx files).

### 7. Error state consistency

Standardize `error.tsx` across all protected route groups:
- Show branded error card (not raw text)
- Include: error icon, "Something went wrong" title, error message (sanitized), "Try again" button
- Capture to Sentry (already done in billing/settings, extend to all)

## Out of scope

- Navigation structure changes (Platform UX Foundations PRD).
- Landing page design (Landing Page PRD).
- New theme tokens or color palette changes.
- Animation/motion system beyond loading skeletons.
- Component documentation site (Storybook or similar).

---

## User stories

### US-01: Consistent page headers
**As** a user navigating between pages, **I want** every page to have the same header layout (title, subtitle, action), **so that** I always know where I am and what actions are available.

### US-02: Empty state guidance
**As** a new tenant user, **I want** to see a helpful empty state when a section has no data, **so that** I know what to do next instead of seeing a blank page.

### US-03: Loading feedback
**As** a user waiting for data to load, **I want** to see a skeleton shimmer, **so that** I know the page is loading and the layout doesn't shift when data arrives.

### US-04: Predictable buttons
**As** a user, **I want** the same button style to mean the same thing on every page (gradient = create, outline = cancel, red = destructive), **so that** I can predict what will happen before I click.

---

## Success metrics

- All 8 protected pages use the shared `PageHeader` component.
- Zero pages show blank/empty content without an `EmptyState` component.
- All route groups have a branded `error.tsx`.
- All data-loading pages have a `loading.tsx` with skeleton.
- Badge colors follow the standardized semantic mapping across all features.

## Risks

- Refactoring all pages to a shared template risks regressions on stable features.
- Loading skeletons that don't match the actual layout cause CLS (Cumulative Layout Shift).
- Too strict a pattern may limit future feature UX flexibility.

## Open questions

- Should the `PageHeader` component support breadcrumbs in MVP or defer?
- Should loading skeletons match the exact layout of each page (costly) or use a generic pattern?

---

## Traceability

| Concern | Approach |
|---------|----------|
| Audit events | None — visual changes only |
| Sentry instrumentation | Extend error boundaries to all route groups |
| Seed data | No changes |
| E2E flows | Update visual assertions, add empty state tests |
| External adapters | None |
| Env vars | None |

---

*Last updated: 2026-05-23*
