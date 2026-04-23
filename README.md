# 🚀 Enterprise Platform Template

**A production-ready multi-tenant starter for building secure enterprise applications.**  
Built with Next.js 15, React 19, TypeScript 5.7, Supabase, Drizzle ORM, Tailwind CSS 4, and Turborepo.

![TypeScript](https://img.shields.io/badge/TypeScript-5.7+-3178C6?logo=typescript&logoColor=white)
![Next.js](https://img.shields.io/badge/Next.js-15+-000000?logo=next.js&logoColor=white)
![React](https://img.shields.io/badge/React-19-149ECA?logo=react&logoColor=white)
![Tailwind CSS](https://img.shields.io/badge/Tailwind_CSS-4-06B6D4?logo=tailwind-css&logoColor=white)
![Turborepo](https://img.shields.io/badge/Turborepo-2.9+-EF4444?logo=turborepo&logoColor=white)
![pnpm](https://img.shields.io/badge/pnpm-9+-F69220?logo=pnpm&logoColor=white)
![Supabase](https://img.shields.io/badge/Supabase-latest-3ECF8E?logo=supabase&logoColor=white)
![Drizzle ORM](https://img.shields.io/badge/Drizzle_ORM-1-111827)
![Biome](https://img.shields.io/badge/Biome-2-60A5FA)
![Playwright](https://img.shields.io/badge/Playwright-latest-2EAD33?logo=playwright&logoColor=white)
![Vitest](https://img.shields.io/badge/Vitest-3-6E9F18?logo=vitest&logoColor=white)
![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)

---

## ✨ Features

- 🏗️ **Monorepo Architecture** — Turborepo + pnpm with 5 packages
- 🏢 **Multi-Tenant** — RLS-based tenant isolation, ready for SaaS
- 🔐 **Auth System** — Sign in, sign up, password reset, role-based access
- 📊 **Dashboard Shell** — Protected pages with sidebar navigation
- 🧩 **Reference Module** — Full CRUD example (Resources) showing every pattern
- 🗄️ **Drizzle ORM** — Type-safe PostgreSQL schema with RLS policies
- 📦 **Shared Contracts** — Zod schemas as single source of truth
- 🎨 **shadcn/ui** — Component library with design tokens
- 🧪 **Testing** — Vitest unit tests + Playwright E2E with Page Objects
- 🤖 **AI Agent Skills** — 20+ curated skills for AI-assisted development
- 📝 **Architecture Docs** — Comprehensive docs for onboarding

> This repository is a template starter, not a finished product. Use it as a strong foundation for your own SaaS domain.

## 📦 Tech Stack

| Category | Technology | Version | Purpose |
|----------|-----------|---------|---------|
| Framework | Next.js | 15+ | App Router, Server Actions, SSR |
| UI Library | React | 19 | Server Components, React Compiler |
| Language | TypeScript | 5.7+ | Strict mode everywhere |
| Styling | Tailwind CSS | 4 | Utility-first with theme tokens |
| Components | shadcn/ui | latest | Radix + CVA primitives |
| State | Zustand | 5 | Client state (selective) |
| Validation | Zod | 3 | Runtime schema validation |
| Database | Drizzle ORM | 1 | Type-safe PostgreSQL schema |
| Backend | Supabase | latest | Auth + DB + RLS + Storage + Realtime |
| Monorepo | Turborepo | 2.9+ | Build orchestration + caching |
| Lint/Format | Biome | 2 | Single tool (replaces ESLint + Prettier) |
| Unit Tests | Vitest | 3 | Fast unit testing |
| E2E Tests | Playwright | latest | Browser automation + Page Objects |
| Package Manager | pnpm | 9+ | Fast, disk-efficient |

## 🏛️ Architecture

```text
┌─────────────────────────────────────────────────────────┐
│                   @enterprise/web (ui/)                │
│             Next.js 15 · App Router · SSR              │
│                                                         │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐              │
│  │  (auth)  │  │(dashboard)│ │ features │              │
│  │ Sign In  │  │  Shell   │  │Resources │              │
│  │ Sign Up  │  │ Settings │  │  CRUD    │              │
│  └──────────┘  └──────────┘  └──────────┘              │
├─────────────────────────────────────────────────────────┤
│         ▼              ▼             ▼                 │
│  ┌─────────────────────────────────────────────────┐    │
│  │             @enterprise/contracts               │    │
│  │         Zod Schemas · Shared DTOs · Types      │    │
│  └─────────────────────────────────────────────────┘    │
│         ▼              ▼             ▼                 │
│  ┌────────────┐ ┌────────────┐ ┌────────────┐          │
│  │@enterprise/│ │@enterprise/│ │@enterprise/│          │
│  │core        │ │db          │ │ui          │          │
│  │Services,   │ │Drizzle ORM │ │shadcn/ui,  │          │
│  │Auth, Utils │ │Schema, RLS │ │Tokens      │          │
│  └────────────┘ └────────────┘ └────────────┘          │
└─────────────────────────────────────────────────────────┘
```

| Package | Path | Responsibility | Allowed Dependencies |
|---------|------|----------------|----------------------|
| `@enterprise/web` | `ui/` | Next.js app, routes, Server Actions, feature UI | `@enterprise/contracts`, `@enterprise/core`, `@enterprise/db`, `@enterprise/ui` |
| `@enterprise/contracts` | `packages/contracts/` | Zod schemas, DTOs, shared types | `zod` only |
| `@enterprise/core` | `packages/core/` | Services, auth utilities, Supabase clients | `@enterprise/contracts`, `@enterprise/db` |
| `@enterprise/db` | `packages/db/` | Drizzle schema, policies, exported DB types | `drizzle-orm` only |
| `@enterprise/ui` | `packages/ui/` | Shared design system primitives | UI-only deps (`clsx`, `tailwind-merge`, CVA, Radix, icons) |

## 👥 Users and Roles

| Role | Read | Create | Update | Archive | Manage Users | View Audit | Enforcement |
|------|------|--------|--------|---------|--------------|------------|-------------|
| `owner` | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | RLS + UI guards |
| `admin` | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | RLS + UI guards |
| `member` | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ | RLS + UI guards |
| `guest` | ✅ (limited) | ❌ | ❌ | ❌ | ❌ | ❌ | RLS + UI guards |

Roles are stored in the `profiles` table and mirrored into JWT `app_metadata` (`tenant_id`, `role`) so PostgreSQL policies can evaluate authorization directly at query time.

In this template, write operations are intentionally strict (`owner` and `admin` only for resources) to model enterprise defaults. You can extend this matrix per module, but keep the same policy-first approach.

## 🏢 Multi-Tenant Model

```text
Supabase Auth (auth.users)
        │
        ▼ trigger: handle_new_user()
   ┌─────────┐
   │ tenants │ ← one per organization
   └────┬────┘
        │
   ┌────▼────┐
   │profiles │ ← user + tenant + role
   └────┬────┘
        │
   ┌────▼─────────────────────────┐
   │ domain tables (resources...) │
   │ all have tenant_id + RLS     │
   └──────────────────────────────┘
```

When a user signs up, the `handle_new_user()` trigger creates a tenant and a profile automatically.

All domain tables include `tenant_id`. Every query is filtered by RLS, and policy checks read `tenant_id` + `role` from JWT claims in `app_metadata`. This keeps tenant isolation enforced in the database, not only in UI code.

## 🔐 Security and RLS

This template uses a three-layer security model:

1. **Auth layer** — Supabase Auth issues JWTs and validates sessions.
2. **Database layer** — RLS policies run on every protected table.
3. **UI layer** — role checks hide unauthorized actions and routes.

RLS claim pattern used across policies:

```sql
auth.jwt()->'app_metadata'->>'tenant_id'
auth.jwt()->'app_metadata'->>'role'
```

Practical result:

- Even if a UI bug exposes a button, unauthorized writes are blocked by RLS.
- Even if someone crafts a direct API call, tenant isolation still holds.
- Authorization is centralized in SQL policies, with UI checks for better UX.

## 🧩 Example Module: Resources

The `resources` module is the reference vertical slice for building new features.

It demonstrates the full chain:

1. **DB schema** (`packages/db/src/schema/resources.ts`) and RLS policies.
2. **Contracts** (`packages/contracts/src/schemas/resources.ts`, DTOs/types).
3. **Service** (`packages/core/src/services/resource-service.ts`) with `ServiceResult<T>`.
4. **Actions/queries** (`ui/features/resources/actions.ts`, `queries.ts`) as thin wrappers.
5. **Pages/components** under `ui/app/(dashboard)/dashboard/resources/` and `ui/features/resources/components/`.
6. **Tests** in unit + E2E (`packages/*/resources*.test.ts`, `ui/e2e/resources/`).

Use this as your blueprint for new modules such as projects, customers, assets, or tickets.

## 🧪 Testing Strategy

| Type | Tool | What | Location |
|------|------|------|----------|
| Unit | Vitest | Contracts, services, utils | `*.test.ts` colocated |
| E2E | Playwright | Auth flows, CRUD, settings | `ui/e2e/` |

Quality gates:

```bash
pnpm typecheck
pnpm lint
pnpm test
pnpm e2e
```

`pnpm test` runs workspace unit projects through Turborepo.  
`pnpm e2e` runs browser flows with Page Object patterns.

## 🚀 Quick Start

### 1) Prerequisites

- Node.js `>=20`
- pnpm `>=9`
- [Docker Desktop](https://www.docker.com/products/docker-desktop/)
- [Supabase CLI](https://supabase.com/docs/guides/cli/getting-started)

### 2) Install + configure

```bash
pnpm install
cp .env.example .env.local
ln -s ../.env.local ui/.env.local
```

Notes:

- `.env.example` is pre-configured for local Supabase defaults.
- The symlink makes Next.js in `ui/` consume the root `.env.local`.

### 3) Start Supabase local

```bash
supabase start
```

This starts Postgres + Auth + Storage + Studio, applies migrations, and runs `supabase/seed.sql`.

| Service | URL |
|---------|-----|
| API | http://127.0.0.1:55331 |
| Studio | http://127.0.0.1:55333 |
| Inbucket | http://127.0.0.1:55334 |
| Postgres | `postgresql://postgres:postgres@127.0.0.1:55332/postgres` |

Seeded users for local development:

- `admin@enterprise.dev` / `password123` (owner)
- `member@enterprise.dev` / `password123`
- `guest@enterprise.dev` / `password123`
- `reset@enterprise.dev` / `password123`
- `reset2@enterprise.dev` / `password123`

### 4) Run dev

```bash
pnpm dev
```

Default routes:

- Auth: `http://localhost:3000/sign-in`
- Dashboard: `http://localhost:3000/dashboard`

### 5) Useful commands

```bash
supabase start
supabase stop
supabase db reset
supabase status

pnpm typecheck
pnpm lint
pnpm test
pnpm e2e
```

## 📁 Project Structure

```text
enterprise-platform-template/
├── ui/                          → @enterprise/web (Next.js app)
│   ├── app/(auth)/              → Auth pages
│   ├── app/(dashboard)/         → Protected dashboard
│   ├── features/resources/      → Example feature module
│   └── e2e/                     → Playwright tests
├── packages/
│   ├── contracts/               → Zod schemas, DTOs, types
│   ├── core/                    → Services, auth, Supabase clients
│   ├── db/                      → Drizzle schema, RLS policies
│   └── ui/                      → shadcn/ui components, tokens
├── supabase/
│   ├── config.toml              → Local Supabase config
│   ├── migrations/              → SQL migrations
│   └── seed.sql                 → Test user seed data
└── docs/                        → Architecture and guides
```

## 📚 Documentation

### Architecture

- [Architecture Overview](./docs/architecture/overview.md)
- [Users and Roles](./docs/architecture/users-and-roles.md)
- [Multi-Tenant Model](./docs/architecture/multi-tenant.md)
- [Service Layer](./docs/architecture/service-layer.md)
- [Request Flow](./docs/architecture/request-flow.md)
- [Resources Module](./docs/architecture/resources-module.md)
- [MDX Migration Note](./docs/architecture/mdx-migration.md)

### Project Guides

- [Onboarding checklist](./docs/onboarding-checklist.md)
- [Extension patterns](./docs/extension-patterns.md)
- [Code conventions](./docs/code-conventions.md)
- [Testing architecture](./docs/testing-architecture.md)

### External Services

- [Supabase setup](./docs/supabase-setup.md)
- [Vercel deployment](./docs/vercel-deployment.md)
- [Sentry setup](./docs/sentry-setup.md)
- [Resend setup](./docs/resend-setup.md)

### ADRs

- [ADR 001: Platform architecture](./docs/adr/001-platform-architecture.md)
- [ADR 002: RLS helper functions](./docs/adr/002-rls-helper-functions.md)
- [ADR 003: Service layer](./docs/adr/003-service-layer.md)
- [ADR 004: Package dependencies](./docs/adr/004-package-dependencies.md)

## 🤖 AI Skills

This template includes repo-local AI skills under `skills/` to accelerate repetitive architecture and implementation tasks.

```bash
pnpm skills:setup      # Wire skills for OpenCode runtime
pnpm skills:setup:all  # Wire all supported runtimes
pnpm skills:sync       # Regenerate AGENTS auto-invoke tables
```

If you add or modify a skill, update metadata and rerun `skills:sync`.

## 📝 License

MIT. See [LICENSE](./LICENSE).
