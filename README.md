# Enterprise Platform Starter Template

Multi-tenant enterprise starter/template built with Next.js, Supabase, and a strict monorepo architecture.

This repository is a **starter foundation**, not a finished SaaS product.

## What this template includes (current state)

- Monorepo with package boundaries:
  - `@enterprise/contracts` (Zod schemas + DTOs)
  - `@enterprise/db` (Drizzle schema)
  - `@enterprise/core` (Supabase clients, auth/service utilities)
  - `@enterprise/ui` (shared UI primitives/tokens)
  - `@enterprise/web` (Next.js App Router app)
- Auth starter surface:
  - `/sign-in`
  - `/sign-up`
  - `/forgot-password`
  - `/reset-password`
  - `/auth/callback` route for OTP/link flows
  - `/login` compatibility redirect to `/sign-in`
- Protected dashboard shell with starter pages:
  - `/dashboard`
  - `/dashboard/settings`
- Starter dashboard data pulled from real Supabase tables (`tenants`, `profiles`) in server components
- Testing baseline:
  - Unit tests via Vitest (contracts/core/web coverage projects)
  - Smoke E2E via Playwright (`ui/e2e/smoke`)

## What this template does NOT include

- Completed business modules (billing, subscriptions, CRM, analytics, etc.)
- Production-ready onboarding, admin panel, or role workflows beyond starter auth scaffolding
- Fully automated tenant provisioning workflows for your specific product domain

If you publish a fork, plan to define product-specific features and operations for your own product domain.

## Quick start

### 1) Prerequisites

- Node.js `>=20`
- pnpm `>=9`
- A Supabase project (or local Supabase stack) with valid API keys

### 2) Install and configure

```bash
pnpm install
cp .env.example .env.local
```

Then set at least the required environment variables in `.env.local`:

- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`

Optional/conditional variables are documented in [docs/onboarding-checklist.md](./docs/onboarding-checklist.md).

### 3) Run development

```bash
pnpm dev
```

App routes:
- Auth: `http://localhost:3000/sign-in`
- Dashboard: `http://localhost:3000/dashboard`

## Required configuration notes

- `NEXT_PUBLIC_APP_URL` is strongly recommended and used for auth redirect URLs
- In production, a canonical app URL is required (`NEXT_PUBLIC_APP_URL`, fallback `NEXT_PUBLIC_SITE_URL` or `APP_URL`)
- `SUPABASE_SERVICE_ROLE_KEY` is server-only and must never be exposed in client code
- Drizzle uses `DATABASE_URL` for migration tooling

See:
- [Supabase setup](./docs/supabase-setup.md)
- [Onboarding checklist](./docs/onboarding-checklist.md)

## Architecture summary

```text
@enterprise/web -> @enterprise/contracts, @enterprise/core, @enterprise/db, @enterprise/ui
@enterprise/core -> @enterprise/contracts, @enterprise/db
@enterprise/contracts -> zod only
@enterprise/db -> drizzle-orm only
@enterprise/ui -> UI-only dependencies
```

Key principles implemented in the starter:
- Feature-oriented app structure under `ui/features/*`
- Server-first data access with Supabase SSR clients
- Service-layer-driven mutations (actions as thin wrappers)
- Multi-tenant posture via tenant-aware data model + RLS-oriented architecture

## Testing and quality commands

```bash
pnpm typecheck
pnpm lint
pnpm test
pnpm e2e
```

Notes:
- `pnpm test` runs Vitest projects across workspaces
- `pnpm e2e` runs Playwright smoke coverage for starter routes and auth entry points

## Instantiation

Use the provided script to create a new app instance:

```bash
pnpm instantiate --name "My App" --domain "myapp.com"
```

After instantiation, review package names, environment variables, and external service setup before deployment.

## Technology stack

- Next.js 15 (App Router)
- React 19
- TypeScript 5.7+ (strict)
- Tailwind CSS 4 + shadcn/ui
- Supabase (Auth + Postgres + Storage)
- Drizzle ORM
- Vitest + Playwright
- **Zod 3.24-compatible patterns (current repo state)**

## Caveats for public/template usage

- This starter has improved baseline quality, but deeper product workflows still need implementation for real production SaaS use
- Some docs/ADRs are architecture references and may require adaptation for your fork
- Treat this as a strong foundation, not a plug-and-play finished product

## Documentation

### Getting started
- [Onboarding checklist](./docs/onboarding-checklist.md)
- [Extension patterns](./docs/extension-patterns.md)
- [Code conventions](./docs/code-conventions.md)

### External services
- [Supabase setup](./docs/supabase-setup.md)
- [Vercel deployment](./docs/vercel-deployment.md)
- [Sentry setup](./docs/sentry-setup.md)
- [Resend setup](./docs/resend-setup.md)

### Architecture decisions (ADRs)
- [ADR 001: Platform architecture](./docs/adr/001-platform-architecture.md)
- [ADR 002: RLS helper functions](./docs/adr/002-rls-helper-functions.md)
- [ADR 003: Service layer](./docs/adr/003-service-layer.md)
- [ADR 004: Package dependencies](./docs/adr/004-package-dependencies.md)

## License

MIT. See [LICENSE](./LICENSE).
