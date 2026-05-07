---
title: "Public API and API keys PRD"
description: "Defines product requirements for tenant-facing API access and API key lifecycle management."
owner: "Engineering"
lastUpdated: "2026-05-07"
---

# Public API and API keys PRD

## Purpose

Define product requirements for exposing tenant-safe API access with manageable API key lifecycle controls.

## Scope

- Included: API key creation, rotation, revocation, and usage visibility.
- Excluded: full external developer portal, OAuth app ecosystem, and SDK generation.

---

## Problem

Teams need machine-to-machine access to tenant data and workflows, but ad-hoc token patterns create security and support risks.

## Users and stakeholders

| Role | Need |
|------|------|
| Tenant owner/admin | Secure key management and auditability |
| Integrator/developer | Stable API contracts and predictable auth |
| Security/compliance | Revocation controls and usage traceability |

## Goals

- Enable secure automation via tenant-scoped API keys.
- Keep key management simple and auditable.
- Maintain parity between app permissions and API permissions.

---

## MVP scope

- Create API key with name, scope, and expiration.
- Show key metadata and last-used timestamp.
- Rotate and revoke keys.
- Tenant-scoped API endpoints for core resources.

## Out of scope

- Third-party app marketplace.
- Fine-grained endpoint-level policy DSL.
- User-delegated OAuth flows.

---

## Success metrics

- Active tenants using API keys.
- Rotation adoption rate.
- Security incidents linked to stale keys.
- Time to revoke compromised key.

## Risks

- Keys may be stored insecurely by customers.
- Scope model can be too broad in MVP.
- API change management can break integrations.

## Open questions

- Should short-lived keys be mandatory for high-risk scopes?
- What default key expiration balances usability and security?
- Which endpoints are safe for first public API release?

---

*Last updated: 2026-05-07*
