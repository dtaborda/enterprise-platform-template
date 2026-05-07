---
title: "Feature roadmap"
description: "Defines the implementation priority order for planned feature work in the multi-tenant SaaS template."
owner: "Engineering"
lastUpdated: "2026-05-07"
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
| 1 | P0 | Tenant team management | Planned | Completes the core multi-tenant member lifecycle. |
| 2 | P0 | Workspace admin | Planned | Makes tenant operations usable in day-to-day product workflows. |
| 3 | P0 | Billing and plans | Planned | Enables SaaS monetization and plan-based packaging. |
| 4 | P1 | Notifications | Planned | Supports invites, billing events, and critical product communication. |
| 5 | P1 | Public API and API keys | Planned | Unlocks integrations and external automation. |
| 6 | P1 | Webhooks | Planned | Completes outbound integration workflows for technical adopters. |
| 7 | P1 | Usage limits and quotas | Planned | Enforces plan value and protects shared resources. |
| 8 | P2 | Tenant onboarding | Planned | Improves activation and first-run time-to-value. |
| 9 | P2 | File storage module | Planned | Covers a common SaaS need for tenant-scoped file handling. |
| 10 | P2 | i18n and regional settings | Planned | Expands reuse across regions and teams. |
| 11 | P3 | Feature flags | Planned | Adds rollout and packaging control after the core platform exists. |
| 12 | P3 | Secure impersonation | Planned | Adds advanced support tooling after admin and audit flows mature. |

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
- [Tenant team management PRD](./tenant-team-management/prd.md)
- [Billing and plans PRD](./billing-and-plans/prd.md)
- [Public API and API keys PRD](./public-api-and-api-keys/prd.md)

---

*Last updated: 2026-05-07*
