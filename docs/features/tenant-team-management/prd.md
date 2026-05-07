---
title: "Tenant team management PRD"
description: "Defines product requirements for managing tenant members, roles, and invitations."
owner: "Engineering"
lastUpdated: "2026-05-07"
---

# Tenant team management PRD

## Purpose

Define roadmap-level product requirements for tenant-scoped team management in a multi-tenant SaaS template.

## Scope

- Included: member lifecycle, role assignment, invitations, and governance at tenant level.
- Excluded: low-level authorization architecture and RLS implementation details (covered in the RFC and shared architecture docs).

---

## Problem

Teams need a clear way to add, remove, and manage members per tenant without exposing cross-tenant data or overloading global admins.

## Users and stakeholders

| Role | Need |
|------|------|
| Tenant owner | Full control of membership and sensitive role changes |
| Tenant admin | Day-to-day team operations |
| Member | Predictable access and self-visibility |
| Platform engineering | Consistent access model across features |

## Goals

- Provide reliable tenant-scoped member management.
- Reduce manual support requests for role and access changes.
- Keep role semantics consistent across the platform.

---

## MVP scope

- List tenant members with role and status.
- Invite member by email with expiration.
- Accept or revoke invitations.
- Change member role with owner/admin restrictions.
- Remove member from tenant.

## Out of scope

- Cross-tenant user directories.
- SCIM or external identity provisioning.
- Custom role builders and permission matrices.

---

## Success metrics

- Invitation acceptance rate per tenant.
- Median time from invite to active membership.
- Monthly support tickets related to team access.
- Zero confirmed cross-tenant visibility incidents.

## Risks

- Role confusion causes accidental privilege escalation.
- Invitation links may be shared or misused.
- Complex role transitions increase support burden.

## Open questions

- Should owner transfer be in MVP or follow-up?
- Should removed users keep historical attribution in activity logs?
- What invitation expiration default is safest for most teams?

---

*Last updated: 2026-05-07*
