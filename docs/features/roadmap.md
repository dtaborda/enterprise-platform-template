---
title: "Feature roadmap"
description: "Defines the implementation priority order for planned feature work in the multi-tenant SaaS template."
owner: "Engineering"
lastUpdated: "2026-05-12"
---

# Feature roadmap

## Purpose

Define the canonical implementation priority for planned features in this template.

## Scope

- Included: feature order, priority tier, status, and short rationale.
- Excluded: detailed product requirements and technical design (see each feature PRD/RFC).

---

## Priority order

| Order | Priority | Feature | Status | Why now |
|------:|----------|---------|--------|---------|
| 1 | P0 | Example resource management | Done | Reference CRUD module demonstrating the service layer pattern. |
| 2 | P0 | Theme system | Done | JSON-configurable design tokens, build-time CSS generation, light/dark mode. |
| 3 | P0 | Form validation | Done | Shared FormField/FormMessage, useActionState + ActionResult, inline error UX. |
| 4 | P0 | Tenant team management | Done | Completes the core multi-tenant member lifecycle. |
| 5 | P0 | Workspace admin | Done | Makes tenant operations usable in day-to-day product workflows. |
| 6 | P0 | Billing and plans | Planned | Enables SaaS monetization and plan-based packaging. |
| 7 | P1 | Notifications | Planned | Supports invites, billing events, and critical product communication. |
| 8 | P1 | Public API and API keys | Planned | Unlocks integrations and external automation. |
| 9 | P1 | Webhooks | Planned | Completes outbound integration workflows for technical adopters. |
| 10 | P1 | Usage limits and quotas | Planned | Enforces plan value and protects shared resources. |
| 11 | P1 | Brand abstraction layer | Planned | Enables multi-brand support from a single codebase with provider-agnostic branding. |
| 12 | P1 | Brand isolation package | Planned | Enforces brand code boundaries and prevents brand logic leaks into shared packages. |
| 13 | P1 | Backend provider decoupling | Planned | Introduces port/adapter interfaces to decouple @enterprise/core from Supabase. |
| 14 | P2 | Tenant onboarding | Planned | Improves activation and first-run time-to-value. |
| 15 | P2 | File storage module | Planned | Covers a common SaaS need for tenant-scoped file handling. |
| 16 | P2 | i18n and regional settings | Planned | Expands reuse across regions and teams. |
| 17 | P2 | Deployment provider decoupling | Planned | Adds Docker support and deployment-target abstraction for non-Vercel hosting. |
| 18 | P3 | Feature flags | Planned | Adds rollout and packaging control after the core platform exists. |
| 19 | P3 | Secure impersonation | Planned | Adds advanced support tooling after admin and audit flows mature. |

---

## Priority tiers

| Tier | Meaning |
|------|---------|
| P0 | Core platform capability required to operate a serious multi-tenant SaaS template |
| P1 | High-value expansion that improves integration, communication, or monetization enforcement |
| P2 | Important product maturity work that improves adoption and reuse |
| P3 | Advanced operational capability that becomes more valuable after the core platform is stable |

---

## Status model

| Status | Meaning |
|--------|---------|
| Planned | Documented but not started |
| In progress | Actively being designed or implemented |
| Done | Implemented and verified |

---

## Related documents

- [Documentation structure](../README.md)
- [Example resource management PRD](./example-resource-management/prd.md)
- [Theme system PRD](./theme-system/prd.md)
- [Form validation PRD](./form-validation/prd.md)
- [Tenant team management PRD](./tenant-team-management/prd.md)
- [Workspace admin PRD](./workspace-admin/prd.md)
- [Billing and plans PRD](./billing-and-plans/prd.md)
- [Public API and API keys PRD](./public-api-and-api-keys/prd.md)
- [Brand abstraction layer PRD](./brand-abstraction-layer/prd.md)
- [Brand isolation package PRD](./brand-isolation-package/prd.md)
- [Backend provider decoupling PRD](./backend-provider-decoupling/prd.md)
- [Deployment provider decoupling PRD](./deployment-provider-decoupling/prd.md)

---

*Last updated: 2026-05-12*
