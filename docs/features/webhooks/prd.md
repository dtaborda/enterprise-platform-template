---
title: "Webhooks PRD"
description: "Defines product requirements for outbound event delivery to customer endpoints."
owner: "Engineering"
lastUpdated: "2026-05-07"
---

# Webhooks PRD

## Purpose

Define product requirements for tenant-managed webhooks so external systems can react to platform events.

## Scope

- Included: endpoint registration, signing secret lifecycle, delivery visibility, and retry behavior.
- Excluded: workflow orchestration and event transformation pipelines.

---

## Problem

Without webhooks, customers depend on polling APIs and miss near-real-time event handling for business workflows.

## Users and stakeholders

| Role | Need |
|------|------|
| Tenant admin | Register and monitor webhook endpoints safely |
| Integrator | Reliable event delivery with signature verification |
| Support/ops | Troubleshoot failed deliveries quickly |

## Goals

- Enable secure outbound event delivery.
- Provide transparent delivery status and retry behavior.
- Keep webhook setup manageable for non-specialist teams.

---

## MVP scope

- Create webhook endpoint per tenant with selected events.
- Generate and rotate signing secret.
- Delivery attempts with exponential backoff retries.
- Delivery log with status and failure reason summary.

## Out of scope

- Event payload customization templates.
- Per-endpoint workflow scripting.
- Guaranteed exactly-once delivery semantics.

---

## Success metrics

- Successful delivery rate.
- Median time to detect and resolve failed endpoint configs.
- Number of active endpoints per tenant.

## Risks

- Endpoint misconfiguration can create high failure rates.
- Secret leakage can allow forged event payloads.
- Retry storms can increase infrastructure load.

## Open questions

- Which events must be included in MVP catalog?
- How long should delivery logs be retained?
- Should suspended endpoints auto-resume or require manual action?

---

*Last updated: 2026-05-07*
