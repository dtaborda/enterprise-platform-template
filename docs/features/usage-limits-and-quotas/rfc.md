---
title: "Usage limits and quotas RFC"
description: "Defines technical design for metering, quota enforcement, and entitlement-aware checks."
owner: "Engineering"
lastUpdated: "2026-05-07"
---

# Usage limits and quotas RFC

## Purpose

Define the technical model for measuring tenant usage and enforcing plan quotas across services.

## Scope

- Included: metering records, periodic aggregation, enforcement API, and integration points.
- Excluded: billing invoicing logic and external analytics warehouse exports.

---

## Summary

Usage events are recorded per tenant, aggregated into quota counters, and validated by service-layer guards before quota-sensitive mutations.

## Technical objective

- Keep quota checks deterministic and low-latency.
- Align limits with plan entitlements from billing.
- Preserve tenant isolation in both raw events and aggregates.

---

## Proposed design

| Area | Design |
|------|--------|
| Data model | `usage_events`, `usage_aggregates`, `quota_policies` |
| Service layer | `quota-service.ts` with `checkQuota` and `recordUsage` primitives |
| Integration | Mutation services call quota guard before resource creation |
| Contracts | Quota status schemas in `@enterprise/contracts` |
| Background jobs | Aggregate raw events to period counters |

## Security and tenant isolation implications

- Quota reads and usage records are tenant-scoped via RLS.
- Enforcement uses tenant context from authenticated request, never client-provided tenant values.
- Admin overrides (if enabled later) require elevated role checks and audit logging.

---

## Trade-offs

- **Chosen:** event + aggregate model for auditability and query performance.
- **Not chosen:** aggregate-only counters, because backfills and forensic analysis become difficult.

## Risks

- Counter drift if aggregation jobs fail.
- High write volume for usage events at scale.
- Inconsistent enforcement if some services skip guard calls.

---

## Rollout and implementation phases

1. Quota contracts and policy model.
2. Metering primitives and aggregation job.
3. Service integration for selected dimensions.
4. Admin visibility and alert thresholds.

## Open questions

- Which dimensions need real-time enforcement in MVP?
- Should aggregation be near-real-time or interval-based by default?
- What backfill strategy is required after outage recovery?

---

*Last updated: 2026-05-07*
