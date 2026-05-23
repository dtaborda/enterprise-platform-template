---
title: "Platform UX foundations PRD"
description: "Defines product requirements for fixing navigation, layout, and settings UX issues across the platform."
owner: "Engineering"
priority: "P0"
lastUpdated: "2026-05-23"
---

# Platform UX foundations PRD

## Purpose

Fix structural UX issues that prevent users from discovering and using shipped features. Navigation, layout scroll behavior, and settings page architecture need rework to create a usable, professional platform experience.

## Scope

- Included: sidebar navigation (add missing links), layout scroll behavior (fixed nav + scrollable content), settings page restructure (tabs instead of double sidebar), mobile navigation (bottom tab bar + drawer).
- Excluded: visual polish, color/token changes, new feature development, landing page.

---

## Problem

Three critical UX issues exist in the shipped platform:

1. **Hidden features**: Team management (`/team`) and Billing (`/billing`) are fully implemented but have NO navigation links in the sidebar. Users can only access them by typing the URL directly. This makes shipped P0 features effectively invisible.

2. **Broken scroll behavior**: The sidebar and header scroll away with the page content instead of staying fixed. On pages with long content (like Settings forms), the navigation disappears, forcing users to scroll back to the top to navigate. This is a fundamental layout bug.

3. **Settings double sidebar**: The Settings page has a secondary vertical sidebar (`SettingsSidebar` component) for section navigation (Profile, Logo, Regional, Security). This creates a confusing double-sidebar pattern where two vertical menus compete for attention. The contextual navigation should use horizontal tabs inside the content area.

## Users and stakeholders

| Role | Need |
|------|------|
| All authenticated users | Discover and navigate to all platform features without memorizing URLs |
| Tenant owner | Access Settings, Team, and Billing from a single, persistent navigation |
| Mobile users | Navigate the platform with thumb-friendly controls (bottom tab bar) |
| Template adopters | A professional, predictable layout shell they can extend with new features |

## Goals

- Every shipped feature is reachable from the sidebar navigation.
- Navigation stays fixed and visible at all times during content scroll.
- Settings uses horizontal tabs for section switching (no double sidebar).
- Mobile provides a bottom tab bar and hamburger drawer for full navigation.

---

## MVP scope

### 1. Sidebar navigation update

Add missing navigation links to the existing sidebar:

| Nav item | Icon | URL | Visible to |
|----------|------|-----|------------|
| Dashboard | `home` | `/dashboard` | All roles |
| Resources | `folder` | `/resources` | All roles |
| Team | `users` | `/team` | All roles |
| Billing | `credit-card` | `/billing` | Owner, Admin |
| Settings | `settings` | `/settings` | Owner, Admin |

- Active state: highlight current route with primary color accent.
- Role-based visibility: Billing and Settings only shown to owner/admin (matching existing page-level guards).
- Mobile nav: same items in bottom tab bar (5 items) + hamburger drawer with full list.

### 2. Layout scroll fix

- Sidebar: `position: fixed`, `height: 100vh`, `overflow-y: auto` (sidebar itself scrolls if it has many items, but stays in place).
- Header/top bar: `position: sticky`, `top: 0`, `z-index` above content.
- Main content area: scrollable independently within the remaining viewport space.
- The sidebar and header must NEVER scroll away when page content is scrolled.

### 3. Settings page restructure

- Remove `SettingsSidebar` component (the secondary vertical nav).
- Replace with horizontal tabs inside the content area:
  - Profile (default active)
  - Branding (logo upload)
  - Regional
  - Security (owner only tab, hidden for admin)
- Each tab renders its corresponding form section.
- Tabs use the platform's existing tab/segmented control pattern.
- URL does NOT change between tabs (client-side switching only).

### 4. Mobile navigation

- Bottom tab bar (fixed, 5 items): Dashboard, Resources, Team, Billing, More.
- "More" opens a drawer/sheet with: Settings, Sign out, tenant info.
- Bottom bar hidden on auth pages (sign-in, sign-up, etc.).
- Glass/blur effect on bottom bar for premium feel.
- Hamburger menu in header opens full nav sheet (same items as sidebar).

## Out of scope

- Color or token changes (handled by Design System Consistency PRD).
- Landing page (handled by Landing Page PRD).
- New feature development.
- Sidebar collapse/expand toggle (future enhancement).
- Breadcrumb navigation.

---

## User stories

### US-01: Navigate to Team from sidebar
**As** an authenticated user, **I want** to click "Team" in the sidebar, **so that** I can manage team members without memorizing the URL.

### US-02: Navigate to Billing from sidebar
**As** a tenant owner, **I want** to click "Billing" in the sidebar, **so that** I can manage my subscription from the main navigation.

### US-03: Scroll content without losing navigation
**As** a user on the Settings page, **I want** the sidebar and header to stay visible when I scroll down, **so that** I can navigate to another section without scrolling back up.

### US-04: Switch Settings sections with tabs
**As** a tenant admin, **I want** to switch between Profile, Branding, and Regional settings using horizontal tabs, **so that** I don't see a confusing second sidebar menu.

### US-05: Navigate on mobile
**As** a mobile user, **I want** a bottom tab bar with the main navigation items, **so that** I can access all features with one thumb tap.

### US-06: Role-filtered navigation
**As** a member role user, **I want** to NOT see Billing and Settings in the navigation, **so that** I'm not confused by links to pages I can't access.

---

## Permission matrix

| Action | Owner | Admin | Member | Guest |
|--------|-------|-------|--------|-------|
| See Dashboard, Resources, Team nav links | Yes | Yes | Yes | Yes |
| See Billing nav link | Yes | Yes | No | No |
| See Settings nav link | Yes | Yes | No | No |
| See Security tab in Settings | Yes | No | No | No |

---

## Success metrics

- Zero features require URL-only access (all reachable from nav).
- Sidebar stays fixed during scroll on all pages (visual regression test).
- Settings page has zero vertical secondary sidebars.
- Mobile navigation is functional on viewports 320px and above.

## Risks

- Changing the layout shell affects ALL protected pages — regression risk is high.
- Mobile bottom tab bar with 5 items may feel crowded on small screens.
- Settings tab restructure requires moving `SettingsSidebar` anchor-link logic to tab state.

## Open questions

- Should the sidebar be collapsible (icon-only mode) on desktop? (Deferred to future.)
- Should tab state in Settings persist in URL hash for deep linking?

---

## Traceability

| Concern | Approach |
|---------|----------|
| Audit events | None — no data mutations in this change |
| Sentry instrumentation | Existing error boundaries sufficient |
| Seed data | No changes needed |
| E2E flows | Update sidebar nav assertions in ALL existing E2E suites + add mobile viewport tests |
| External adapters | None |
| Env vars | None |

---

*Last updated: 2026-05-23*
