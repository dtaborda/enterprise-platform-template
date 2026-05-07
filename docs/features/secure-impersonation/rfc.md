---
title: "Secure impersonation RFC"
description: "Defines technical architecture for controlled impersonation sessions with strict isolation and auditability."
owner: "Engineering"
lastUpdated: "2026-05-07"
---

# Secure impersonation RFC

## Purpose

Define a technical approach for secure, temporary impersonation that preserves tenant isolation and provides full accountability.

## Scope

- Included: session issuance, policy checks, UI signaling, and audit logging.
- Excluded: privileged bypass channels and long-lived delegated identities.

---

## Summary

Impersonation is implemented as a time-bound delegated session with explicit actor/subject separation, strict role gating, and mandatory audit events.

## Technical objective

- Allow support debugging without exposing unrestricted tenant access.
- Distinguish acting user and impersonated subject in every request context.
- Guarantee traceable start/stop and sensitive-action events.

---

## Proposed design

| Area | Design |
|------|--------|
| Session model | `impersonation_sessions` table with actor_id, subject_id, tenant_id, expires_at |
| Auth context | Request context carries both actor and subject claims |
| Service layer | `impersonation-service.ts` handles start/stop/validate session |
| App layer | Visible impersonation banner and session end controls |
| Audit | Structured logs for initiation, sensitive actions, and termination |

## Security and tenant isolation implications

- Actor authorization is validated before session creation.
- Tenant boundary is enforced by subject tenant_id and RLS on all downstream queries.
- Sensitive mutations can require additional policy gates while impersonating.

---

## Trade-offs

- **Chosen:** explicit delegated session model for clarity and auditability.
- **Not chosen:** direct token swap into subject identity, because it obscures who initiated actions.

## Risks

- Incorrect claim propagation can blur actor/subject attribution.
- Session expiration bugs can leave impersonation active too long.
- Policy exceptions can create privilege escalation paths.

---

## Rollout and implementation phases

1. Session schema, contracts, and service logic.
2. Auth context propagation and policy guards.
3. UI indicators and operator controls.
4. E2E tests for lifecycle, expiry, and audit trace.

## Open questions

- Should impersonation require just-in-time approval in production?
- Which endpoints must be blocked categorically during impersonation?
- How should session revocation behave across concurrent browser tabs?

---

*Last updated: 2026-05-07*
