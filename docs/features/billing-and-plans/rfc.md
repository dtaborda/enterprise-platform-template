---
title: "Billing and plans RFC"
description: "Defines the technical architecture for subscription state, plans, and entitlement synchronization."
owner: "Engineering"
lastUpdated: "2026-05-07"
---

# Billing and plans RFC

## Purpose

Define a technical plan for billing and plan management that remains provider-agnostic at service boundaries.

## Scope

- Included: data model, service interfaces, webhook ingestion boundary, and entitlement sync.
- Excluded: provider-specific SDK internals and finance back-office systems.

---

## Summary

Billing state lives in tenant-scoped tables. External payment events enter through a bounded adapter and update subscription state through service functions.

## Technical objective

- Keep billing source-of-truth consistent and auditable.
- Expose stable plan and entitlement contracts to app features.
- Protect tenant isolation while processing cross-tenant provider events.

---

## Proposed design

| Area | Design |
|------|--------|
| Contracts | Add plan, subscription, and entitlement schemas in `@enterprise/contracts` |
| Service layer | Add `billing-service.ts` with sync and transition handlers |
| Data model | Add `plans`, `tenant_subscriptions`, and `billing_events` in Drizzle |
| Ingestion | Route webhook events to a provider adapter, then service-layer mutation |
| App layer | Server Actions read subscription state and request plan transitions |

## Security and tenant isolation implications

- Provider events are verified before processing.
- Tenant-scoped subscription reads remain under RLS.
- Background event handlers use strict mapping from provider customer ID to tenant ID.

---

## Trade-offs

- **Chosen:** normalized subscription state for traceability.
- **Not chosen:** storing only opaque provider payloads, because it hurts queryability and entitlement checks.

## Risks

- Delayed events can produce temporary plan mismatch.
- Idempotency bugs can duplicate transitions.
- Provider outage affects near-real-time state updates.

---

## Rollout and implementation phases

1. Plan and subscription schema with contracts.
2. Billing service with idempotent event processing.
3. UI integration for plan display and change requests.
4. Entitlement enforcement integration with limits/quotas.

## Open questions

- Which events are mandatory for MVP parity across providers?
- Should canceled subscriptions retain last entitlements during grace period?
- What retry policy is required for failed webhook processing?

---

*Last updated: 2026-05-07*
