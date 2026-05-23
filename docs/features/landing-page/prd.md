---
title: "Landing page PRD"
description: "Defines product requirements for the public marketing landing page with sign-in/sign-up access."
owner: "Engineering"
priority: "P0"
lastUpdated: "2026-05-23"
---

# Landing page PRD

## Purpose

Create a public-facing landing page that serves as the entry point to the Enterprise Platform. Currently, unauthenticated users are redirected directly to `/sign-in` with no context about what the platform offers. There is no marketing surface, no feature overview, and no branded experience before authentication.

## Scope

- Included: landing page with hero section, feature highlights, pricing overview, call-to-action flow, responsive design (desktop + mobile), and navigation to sign-in/sign-up.
- Excluded: blog, documentation site, changelog, terms/privacy pages, CMS integration.

---

## Problem

The platform has NO public-facing page. The `(marketing)` route group exists with a layout but contains zero pages. When users visit the root URL (`/`), they are immediately redirected to `/sign-in`. This means:

1. **No product context**: Users arrive at a login form with no understanding of what the platform does.
2. **No acquisition funnel**: There's no way to communicate value before asking for credentials.
3. **No brand presence**: The platform has a fully configured design system (Manrope + Inter, cyan + violet palette, glass morphism) but no public surface to showcase it.
4. **Template adopters can't demo**: Without a landing page, adopters can't show the platform to stakeholders or potential customers.

## Users and stakeholders

| Role | Need |
|------|------|
| Prospective user | Understand what the platform offers before signing up |
| Template adopter | A professional landing page they can rebrand for their own product |
| Marketing team | A conversion-optimized page with clear CTAs |

## Goals

- Provide a branded first impression before authentication.
- Communicate core platform capabilities in under 10 seconds of reading.
- Drive sign-up conversions with clear CTAs.
- Be fully responsive (desktop, tablet, mobile).
- Be configurable through theme tokens — adopters change JSON, landing page adapts.

---

## MVP scope

### 1. Navigation bar

- Fixed top navbar (transparent background, blur on scroll).
- Left: product logo/name (from tenant config or hardcoded "Enterprise").
- Center: nav links — Features, Pricing (anchor links to page sections).
- Right: "Sign in" ghost button + "Get Started" gradient CTA button.
- Mobile: hamburger menu with same links.

### 2. Hero section

- Large bold headline (Manrope): configurable text, default "Build your SaaS faster".
- Subtitle paragraph: "Multi-tenant platform template with billing, teams, and admin built in. Ship in days, not months."
- Two CTAs: "Start building" gradient button (→ `/sign-up`) + "View documentation" ghost button (→ external docs URL or `/docs`).
- Background: subtle gradient mesh or radial gradient using primary/secondary colors.
- Optional: hero image or abstract graphic (SVG pattern or placeholder).

### 3. Features section

Three feature cards in a responsive grid (3 columns desktop, 1 column mobile):

| Feature | Icon | Description |
|---------|------|-------------|
| Multi-tenant | `users` | "Isolated workspaces with role-based access, team management, and tenant-scoped data." |
| Billing ready | `credit-card` | "Subscription lifecycle with Stripe integration, plan management, and webhook processing." |
| Role-based access | `shield` | "Owner, admin, member, and guest roles with RLS-enforced security at every layer." |

Cards: glass effect (backdrop-blur), tonal background, no borders.

### 4. Pricing section (optional in MVP)

Three plan cards matching the billing page design:
- Free ($0/mo) — basic features
- Pro ($29/mo) — expanded features, "Most popular" badge
- Enterprise ($99/mo) — all features, "Contact sales"

Each card: feature list, CTA button. Can be hardcoded or driven by the plans seed data.

### 5. Footer

- Logo + tagline.
- Links: Features, Pricing, Documentation, Sign in.
- Copyright: "2026 Enterprise Platform. All rights reserved."
- Social links placeholders (GitHub, Twitter/X).

### 6. Responsive design

| Breakpoint | Layout |
|------------|--------|
| Desktop (1024px+) | Full 3-column grids, side-by-side hero layout |
| Tablet (768px-1023px) | 2-column grids, stacked hero |
| Mobile (<768px) | Single column, stacked everything, hamburger nav |

## Out of scope

- CMS-driven content (all content is hardcoded or config-driven).
- Blog or changelog pages.
- Terms of service, privacy policy pages.
- A/B testing infrastructure.
- Analytics integration (beyond what Sentry/Vercel already provides).
- Custom domain or white-label URL routing.

---

## User stories

### US-01: Understand the product
**As** a prospective user visiting the platform URL, **I want** to see a clear description of what the platform does, **so that** I can decide whether to sign up.

### US-02: Sign up from landing page
**As** a prospective user, **I want** to click "Get Started" on the landing page, **so that** I'm taken directly to the sign-up form.

### US-03: Sign in from landing page
**As** an existing user, **I want** to click "Sign in" on the landing page, **so that** I can access my workspace.

### US-04: View on mobile
**As** a mobile user, **I want** the landing page to be fully readable and navigable on my phone, **so that** I can evaluate the platform from any device.

### US-05: Rebrand the landing page
**As** a template adopter, **I want** to change the landing page content and colors by editing theme tokens and content strings, **so that** the page matches my own product brand.

---

## Technical notes

### Route structure

- Landing page: `ui/app/(marketing)/page.tsx` — Server Component (SSR for SEO).
- The `(marketing)` route group already exists with a layout. The page file is the only addition.
- Root `/` should route to the landing page (not redirect to `/sign-in`).
- Authenticated users visiting `/` should still redirect to `/dashboard`.

### SEO requirements

- Proper `<title>` and `<meta description>` tags.
- Semantic HTML: `<header>`, `<main>`, `<section>`, `<footer>`.
- Open Graph meta tags for social sharing.
- `next/font` for web font loading (already configured).

### Content configurability

- Hero text, feature descriptions, and footer links should be extractable to a content config file or constants module for easy adopter customization.
- Colors and typography automatically follow the theme system — no hardcoded color values.

---

## Success metrics

- Root URL (`/`) renders the landing page (not a redirect to sign-in).
- Landing page loads in < 2 seconds (SSR, no client-side data fetching).
- "Get Started" CTA navigates to `/sign-up`.
- "Sign in" navigates to `/sign-in`.
- Lighthouse performance score >= 90.
- Page is fully readable on 320px viewport.

## Risks

- Landing page content is too generic for adopters to reuse without heavy customization.
- SSR landing page adds to cold start time on serverless deployments.
- SEO metadata needs to be adopter-configurable (not hardcoded "Enterprise").

## Open questions

- Should the pricing section be dynamic (read from DB plans table) or static in MVP?
- Should the root redirect logic live in middleware or in the root page component?
- Should there be an "About" or "How it works" section in MVP?

---

## Traceability

| Concern | Approach |
|---------|----------|
| Audit events | None — public page, no mutations |
| Sentry instrumentation | Standard error boundary on (marketing) layout |
| Seed data | None |
| E2E flows | Smoke test: landing page loads, CTAs navigate correctly |
| External adapters | None |
| Env vars | Optional `NEXT_PUBLIC_LANDING_HERO_TITLE` for content override |

---

*Last updated: 2026-05-23*
