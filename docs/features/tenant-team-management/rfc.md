---
title: "Tenant team management RFC"
description: "Defines the technical plan for tenant-scoped member, role, and invitation management."
owner: "Engineering"
lastUpdated: "2026-05-07"
---

# Tenant team management RFC

## Purpose

Define a technical approach for secure tenant-scoped team management aligned with the service layer and contracts patterns.

## Scope

- Included: contracts, service APIs, Server Actions, data model updates, and RLS policy implications.
- Excluded: external identity provider integrations and enterprise provisioning protocols.

---

## Summary

Implement team management as a tenant-bounded module using Next.js Server Actions as thin wrappers, service functions in `@enterprise/core`, and Row-Level Security (RLS) enforced in Supabase.

## Technical objective

- Ensure role and membership mutations never bypass tenant boundaries.
- Keep role checks centralized in service functions.
- Use contracts as input/output source of truth.

---

## Proposed design

| Layer | Design |
|------|--------|
| Contracts | Add invitation, member list, and role-change schemas in `@enterprise/contracts` |
| Service layer | Add `tenant-team-service.ts` with invite, revoke, accept, role change, remove member |
| App layer | Add thin actions under `ui/features/tenant-team-management/actions.ts` |
| Database | Add `tenant_invitations` table and tenant-scoped relationships in Drizzle |
| Audit | Log CUD operations with existing audit abstraction |

## Security and tenant isolation implications

- Membership reads and writes remain tenant-scoped through RLS policies.
- Owner-only transitions (for example owner transfer) are guarded in service layer and policy checks.
- Invitation acceptance validates token ownership and tenant context before membership mutation.

---

## Trade-offs

- **Chosen:** explicit service functions per action for clarity and auditability.
- **Not chosen:** generic role mutation endpoint, because it obscures authorization intent.

## Risks

- RLS policy drift between memberships and invitations.
- Race conditions on simultaneous role updates.
- Email invite lifecycle complexity if provider behavior varies.

---

## Rollout and implementation phases

1. Contracts and data model foundations.
2. Service functions with unit tests.
3. Server Actions and UI integration.
4. E2E flows for invite, role update, removal.

## Open questions

- Should invitation token storage be hashed at rest in MVP?
- Should owner role be immutable in v1?
- What audit metadata fields are required for compliance-ready logs?

---

*Last updated: 2026-05-07*
