---
title: "Documentation structure"
description: "Defines how documentation is organized, including per-feature PRD and RFC conventions."
owner: "Engineering"
lastUpdated: "2026-05-07"
---

# Documentation structure

## Purpose

Provide a single index for how documentation is organized in this repository and where to place new documents.

## Scope

- Included: folder responsibilities, naming conventions, and feature documentation placement.
- Excluded: implementation details of individual features (see each feature PRD/RFC).

---

## Top-level structure

| Path | Purpose |
|------|---------|
| `docs/developer-guide/` | Developer onboarding, setup, architecture walkthroughs, and operational guides |
| `docs/architecture/` | Technical architecture deep-dives |
| `docs/adr/` | Architecture Decision Records (ADR) |
| `docs/features/` | Per-feature PRD and RFC documents |

---

## Feature documentation convention

Each feature must use this structure:

```text
docs/features/<feature>/
├── prd.md
└── rfc.md
```

Rules:

- Use kebab-case for `<feature>`.
- Keep product intent in `prd.md` and technical design in `rfc.md`.
- Do not duplicate cross-feature rules; link to shared docs in `docs/developer-guide/` or `docs/architecture/`.
- Keep implementation order in `docs/features/roadmap.md` as the single source of truth for priorities.

---

## Current feature documents

| Feature | PRD | RFC |
|---------|-----|-----|
| Example resource management | `docs/features/example-resource-management/prd.md` | `docs/features/example-resource-management/rfc.md` |
| Form validation | `docs/features/form-validation/prd.md` | `docs/features/form-validation/rfc.md` |
| Theme system | `docs/features/theme-system/prd.md` | `docs/features/theme-system/rfc.md` |
| Tenant team management | `docs/features/tenant-team-management/prd.md` | `docs/features/tenant-team-management/rfc.md` |
| Workspace admin | `docs/features/workspace-admin/prd.md` | — |
| Billing and plans | `docs/features/billing-and-plans/prd.md` | `docs/features/billing-and-plans/rfc.md` |
| Notifications | `docs/features/notifications/prd.md` | — |
| Public API and API keys | `docs/features/public-api-and-api-keys/prd.md` | `docs/features/public-api-and-api-keys/rfc.md` |
| Webhooks | `docs/features/webhooks/prd.md` | `docs/features/webhooks/rfc.md` |
| Usage limits and quotas | `docs/features/usage-limits-and-quotas/prd.md` | `docs/features/usage-limits-and-quotas/rfc.md` |
| Tenant onboarding | `docs/features/tenant-onboarding/prd.md` | — |
| File storage module | `docs/features/file-storage-module/prd.md` | `docs/features/file-storage-module/rfc.md` |
| i18n and regional settings | `docs/features/i18n-and-regional-settings/prd.md` | — |
| Feature flags | `docs/features/feature-flags/prd.md` | `docs/features/feature-flags/rfc.md` |
| Secure impersonation | `docs/features/secure-impersonation/prd.md` | `docs/features/secure-impersonation/rfc.md` |

---

## Roadmap

Use `docs/features/roadmap.md` as the canonical priority order for feature implementation.

---

*Last updated: 2026-05-07*
