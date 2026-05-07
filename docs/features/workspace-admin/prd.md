---
title: "Workspace admin PRD"
description: "Defines product requirements for tenant-scoped workspace administration settings."
owner: "Engineering"
lastUpdated: "2026-05-07"
---

# Workspace admin PRD

## Purpose

Define product requirements for a workspace administration area where tenant owners and admins configure tenant-level settings.

## Scope

- Included: workspace profile, operational settings, and governance controls at tenant level.
- Excluded: billing engine internals, feature-flag engine, and authentication provider internals.

---

## Problem

Without a structured admin area, tenant configuration is scattered and difficult to audit, which leads to inconsistent setup and support load.

## Users and stakeholders

| Role | Need |
|------|------|
| Tenant owner | Centralized control over workspace configuration |
| Tenant admin | Operational settings with safe guardrails |
| Support team | Predictable settings model for troubleshooting |

## Goals

- Centralize tenant-level settings in one navigation surface.
- Reduce ad-hoc configuration support tasks.
- Improve consistency across tenants.

---

## MVP scope

- Workspace profile fields (name, slug display, logo reference).
- Regional defaults pointer (timezone, locale entry point).
- Security-relevant toggles that do not require external providers.
- Admin activity visibility for configuration changes.

## Out of scope

- Full IAM policy builder.
- Custom workflows and automation engine.
- Multi-workspace hierarchy within a tenant.

---

## Success metrics

- Percentage of tenants completing workspace setup.
- Decrease in support requests for basic workspace configuration.
- Time to complete first admin setup session.

## Risks

- Too many settings in MVP can overwhelm admins.
- Unclear ownership for sensitive toggles.
- Inconsistent defaults across new tenants.

## Open questions

- Which settings require owner-only approval?
- Should config changes trigger notifications in MVP?
- What settings should be immutable after onboarding?

---

*Last updated: 2026-05-07*
