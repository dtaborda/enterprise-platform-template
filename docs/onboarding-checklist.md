# Onboarding Checklist (Starter Template)

Use this checklist when cloning/instantiating the template for a new project.

## 1) Runtime prerequisites

- Node.js `>=20`
- pnpm `>=9`
- Supabase project (cloud or local)

## 2) Environment setup

```bash
cp .env.example .env.local
```

### Required for local app boot

| Variable | Why |
| --- | --- |
| `NEXT_PUBLIC_SUPABASE_URL` | Browser + server Supabase client initialization |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Browser-safe auth/data access key |

### Required in production

At least one canonical URL variable must be set:

- `NEXT_PUBLIC_APP_URL` (preferred)
- `NEXT_PUBLIC_SITE_URL` (fallback)
- `APP_URL` (fallback)

Localhost-like URLs are rejected in production mode.

### Required for specific workflows

| Variable | Needed when |
| --- | --- |
| `SUPABASE_SERVICE_ROLE_KEY` | Server-only admin/service-role operations |
| `DATABASE_URL` | Drizzle migration and schema tooling |
| `RESEND_API_KEY` | Email sending flows |

## 3) First run

```bash
pnpm install
pnpm dev
```

Verify starter routes:

- `/sign-in`
- `/sign-up`
- `/forgot-password`
- `/reset-password`
- `/dashboard`
- `/dashboard/settings`

## 4) Quality checks before publishing your fork

```bash
pnpm typecheck
pnpm lint
pnpm test
pnpm e2e
```

## 5) Scope reminder

This repository is a starter, not a finished SaaS. Before public launch of your fork, you should define:

- Product-specific domain modules
- Production operations and observability standards
- Legal and licensing strategy
