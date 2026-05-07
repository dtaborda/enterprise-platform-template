---
title: "Feature flags RFC"
description: "Defines technical design for flag evaluation, targeting, and rollout safety controls."
owner: "Engineering"
lastUpdated: "2026-05-07"
---

# Feature flags RFC

## Purpose

Define technical architecture for evaluating and enforcing feature flags in server and client flows.

## Scope

- Included: flag model, evaluation service, cache strategy, and audit requirements.
- Excluded: third-party experimentation platforms and advanced analytics attribution.

---

## Summary

Flags are defined in tenant-aware configuration and evaluated via a single service entry point to ensure consistent behavior across routes and services.

## Technical objective

- Keep flag evaluation deterministic and low-latency.
- Avoid duplicated targeting logic across modules.
- Ensure auditability of operational flag changes.

---

## Proposed design

| Area | Design |
|------|--------|
| Data model | `feature_flags`, `feature_flag_targets`, `feature_flag_audit` |
| Service layer | `feature-flag-service.ts` with `isEnabled(context, flagKey)` |
| App integration | Server Components and Actions call service before gated behavior |
| Contracts | Flag definition and evaluation result schemas in `@enterprise/contracts` |
| Caching | Short-lived server cache keyed by tenant + environment |

## Security and tenant isolation implications

- Tenant-specific targeting cannot reference external tenant identifiers.
- Flag mutations require privileged roles and audit logs.
- Evaluation context avoids user-controlled fields for sensitive targeting.

---

## Trade-offs

- **Chosen:** centralized evaluation API for consistency.
- **Not chosen:** ad-hoc per-feature checks, because drift and bugs increase quickly.

## Risks

- Cache invalidation errors can expose stale flag states.
- Targeting rule growth can increase evaluation complexity.
- Missing ownership can create long-lived flag debt.

---

## Rollout and implementation phases

1. Flag schema and contracts.
2. Evaluation service and role-guarded mutation APIs.
3. Initial integration in selected high-risk features.
4. Operational dashboard and cleanup workflows.

## Open questions

- Should default evaluation fail open or fail closed when data is unavailable?
- How long should evaluation cache TTL be in MVP?
- Which metadata fields are mandatory for flag ownership tracking?

---

*Last updated: 2026-05-07*
