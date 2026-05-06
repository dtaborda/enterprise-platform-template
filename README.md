# Enterprise Platform Template

A production-ready multi-tenant SaaS starter built with Next.js 15, React 19, TypeScript, Supabase, and Tailwind CSS 4.

![TypeScript](https://img.shields.io/badge/TypeScript-5.7+-3178C6?logo=typescript&logoColor=white)
![Next.js](https://img.shields.io/badge/Next.js-15+-000000?logo=next.js&logoColor=white)
![React](https://img.shields.io/badge/React-19-149ECA?logo=react&logoColor=white)
![Supabase](https://img.shields.io/badge/Supabase-latest-3ECF8E?logo=supabase&logoColor=white)
![Tailwind CSS](https://img.shields.io/badge/Tailwind_CSS-4-06B6D4?logo=tailwind-css&logoColor=white)
![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)

---

## Choose Your Path

### Path A — Run locally now

Best for daily development, local E2E tests, and validating RLS behavior.

### Prerequisites

- [Node.js](https://nodejs.org) `>=20`
- [pnpm](https://pnpm.io) `>=9`
- [Docker](https://www.docker.com/products/docker-desktop/) (for local Supabase)
- [Supabase CLI](https://supabase.com/docs/guides/cli/getting-started)

### Setup

```bash
# 1. Clone and install
git clone <repository-url> enterprise-platform
cd enterprise-platform
pnpm install

# 2. Configure environment
cp .env.example .env.local
ln -s ../.env.local ui/.env.local

# 3. Start local Supabase (requires Docker)
supabase start    # first run applies migrations + seed data

# 4. Run dev server
pnpm dev
```

Open [http://localhost:3000](http://localhost:3000).

### Seeded Test Users

| Email | Password | Role |
|-------|----------|------|
| `admin@enterprise.dev` | `password123` | owner |
| `member@enterprise.dev` | `password123` | member |
| `guest@enterprise.dev` | `password123` | guest |

### Without Docker (Cloud Supabase)

If you prefer not to install Docker, you can point to a hosted Supabase project instead. See the [Getting Started guide](./docs/developer-guide/getting-started.mdx) for both options.

---

### Path B — Deploy an MVP to the cloud quickly

Best when you want a hosted demo or first production-like version without setting up CI automation yet.

No GitHub Secrets are required for this path.

```bash
supabase link --project-ref <ref>
supabase db push
```

Then configure the **6 minimum required Vercel variables** and deploy.

Use the dedicated guide:

- [MVP Cloud Deploy](./docs/developer-guide/mvp-cloud-deploy.mdx)

---

### Path C — Production-ready automation

The full production stack: **Supabase Cloud** (database + auth) + **Vercel** (hosting) + optional **Sentry** (monitoring) + **Resend** (email).

This path assumes GitHub Secrets are configured and the optional Supabase migration workflow is enabled.

See the step-by-step [Production Deployment guide](./docs/developer-guide/production-deployment.mdx).

Quick version:

```bash
# 1. Create a Supabase project at supabase.com
# 2. Push database schema to cloud
supabase link --project-ref <ref>
supabase db push

# 3. Import repo in Vercel, add env vars, deploy
```

---

## Tech Stack

| Category | Technology |
|----------|-----------|
| Framework | Next.js 15+ (App Router) |
| UI | React 19, Tailwind CSS 4, shadcn/ui |
| Language | TypeScript 5.7+ (strict) |
| Backend | Supabase (PostgreSQL + Auth + RLS + Storage) |
| ORM | Drizzle ORM |
| Validation | Zod 3 |
| State | Zustand 5 (client), Server Components (server) |
| Monorepo | pnpm workspaces + Turborepo |
| Lint/Format | Biome 2 |
| Testing | Vitest 3 (unit) + Playwright (E2E) |

## Features

- **Multi-Tenant** — RLS-based tenant isolation, ready for SaaS
- **Auth System** — Sign in, sign up, password reset, role-based access
- **Dashboard Shell** — Protected pages with sidebar navigation
- **Reference Module** — Full CRUD example (Resources) showing every pattern
- **Theme System** — JSON-configurable light/dark mode switching
- **Service Layer** — Business logic in testable services, not in Server Actions
- **Shared Contracts** — Zod schemas as single source of truth for DTOs
- **Testing** — Unit tests + E2E with Page Object Model
- **AI Agent Skills** — 20+ curated skills for AI-assisted development

---

## Project Structure

```
enterprise-platform/
├── ui/                    → @enterprise/web (Next.js app)
│   ├── app/               → App Router routes
│   ├── features/          → Feature modules (resources, auth)
│   ├── components/        → Layout components
│   └── e2e/               → Playwright E2E tests
├── packages/
│   ├── contracts/         → Zod schemas, DTOs, types
│   ├── core/              → Services, auth, Supabase clients
│   ├── db/                → Drizzle schema, RLS policies
│   └── ui/                → shadcn/ui components, theme tokens
├── supabase/
│   ├── config.toml        → Local Supabase config
│   ├── migrations/        → SQL migrations
│   └── seed.sql           → Test user seed data
└── docs/                  → Developer guide, architecture
```

### Package Dependencies

```
@enterprise/web → contracts, core, db, ui
@enterprise/core → contracts, db
@enterprise/contracts → zod only
@enterprise/db → drizzle-orm only
@enterprise/ui → UI-only deps (no business logic)
```

---

## Documentation

### Developer Guide (start here)

- [Getting Started](./docs/developer-guide/getting-started.mdx) — Local setup with Docker or cloud Supabase
- [MVP Cloud Deploy](./docs/developer-guide/mvp-cloud-deploy.mdx) — Fastest path to a hosted MVP
- [Supabase Setup](./docs/developer-guide/supabase-setup.mdx) — Auth, storage, RLS, migrations
- [Environment Guide](./docs/developer-guide/environment-guide.mdx) — All env vars per environment
- [Architecture](./docs/developer-guide/architecture.mdx) — Monorepo structure, service layer, conventions
- [Conventions](./docs/developer-guide/conventions.mdx) — TypeScript, Zod, Drizzle, Git commits
- [Testing Strategy](./docs/developer-guide/testing-strategy.mdx) — Vitest + Playwright, coverage matrix
- [Theme System](./docs/developer-guide/theme-system.mdx) — JSON themes, light/dark switching
- [Production Deployment](./docs/developer-guide/production-deployment.mdx) — Supabase + Vercel + Sentry + Resend
- [Onboarding Checklist](./docs/developer-guide/onboarding-checklist.mdx) — New developer checklist

### Architecture Deep-Dives

- [Architecture Overview](./docs/architecture/overview.md)
- [Multi-Tenant Model](./docs/architecture/multi-tenant.md)
- [Users and Roles](./docs/architecture/users-and-roles.md)
- [Service Layer](./docs/architecture/service-layer.md)
- [Request Flow](./docs/architecture/request-flow.md)
- [Resources Module](./docs/architecture/resources-module.md)
- [Extension Patterns](./docs/architecture/extension-patterns.md)

### ADRs

- [ADR 001: Platform Architecture](./docs/adr/001-platform-architecture.md)
- [ADR 002: RLS Helper Functions](./docs/adr/002-rls-helper-functions.md)
- [ADR 003: Service Layer](./docs/adr/003-service-layer.md)
- [ADR 004: Package Dependencies](./docs/adr/004-package-dependencies.md)

---

## Daily Commands

```bash
pnpm dev              # Start dev server
pnpm typecheck        # TypeScript verification
pnpm lint             # Biome code quality
pnpm test             # Vitest unit tests
pnpm e2e              # Playwright E2E (requires local Supabase)
supabase start        # Start local Supabase
supabase stop         # Stop local Supabase
supabase db reset     # Reset and re-seed local DB
```

## What is optional vs required?

### Required for local development

- Node.js
- pnpm
- Supabase CLI
- Docker (only if using local Supabase)

### Required for a hosted MVP

- Supabase cloud project
- `supabase db push`
- 6 Vercel environment variables

### Optional until you want production hardening

- GitHub Secrets for automated migration deploy
- Sentry DSN / source map upload
- Resend email integration

## AI Skills

This template includes repo-local AI skills under `skills/` for AI-assisted development.

```bash
pnpm skills:setup      # Wire skills for OpenCode runtime
pnpm skills:sync       # Regenerate AGENTS auto-invoke tables
```

See [docs/developer-guide/ai-skills.mdx](./docs/developer-guide/ai-skills.mdx) for:

- skills setup for OpenCode, Claude Code, Gemini, Codex, and Copilot
- `skills:sync` usage and scoped sync examples
- project MCP configuration via `.mcp.json` for Claude Code
- the difference between Claude Code MCP config and OpenCode `opencode.json`

## License

MIT. See [LICENSE](./LICENSE).
