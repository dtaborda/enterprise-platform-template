---
title: "Billing and plans PRD"
description: "Defines product requirements for plan management, subscription lifecycle, and billing visibility."
owner: "Engineering"
lastUpdated: "2026-05-07"
---

# Billing and plans PRD

## Purpose

Define the product scope for monetization primitives in the template: plans, subscription state, and billing-facing tenant controls.

## Scope

- Included: plan catalog, subscription status, upgrade/downgrade flow, and billing visibility.
- Excluded: payment-provider-specific technical implementation details and accounting integrations.

---

## Problem

Template adopters need a baseline billing model to launch paid SaaS offerings without rebuilding subscription behavior from scratch.

## Users and stakeholders

| Role | Need |
|------|------|
| Tenant owner | Understand current plan and manage subscription |
| Finance/ops | Reliable subscription state for operational decisions |
| Product team | Predictable entitlement foundation for gated features |

## Goals

- Provide a clear path from free to paid usage.
- Make plan limits and current subscription state visible.
- Keep plan transitions safe and auditable.

---

## MVP scope

- Plan definitions with monthly/annual variants.
- Tenant subscription state machine (active, trialing, past_due, canceled).
- Upgrade and downgrade workflow entry points.
- Billing history summary view (high-level, not full accounting ledger).

## Out of scope

- Multi-currency tax calculation engine.
- Invoice rendering and legal compliance workflows.
- Revenue recognition reporting.

---

## Success metrics

- Trial-to-paid conversion rate.
- Upgrade completion rate.
- Billing-related support tickets per 100 tenants.
- Failed plan transition incidents.

## Risks

- Entitlements and billing can drift if updates are asynchronous.
- Plan messaging may be unclear for admins.
- External provider failures can degrade subscription state trust.

## Open questions

- Should plan changes apply immediately or at period end by default?
- How should grace periods be represented in UI?
- Which billing events should create in-app notifications in MVP?

---

*Last updated: 2026-05-07*
