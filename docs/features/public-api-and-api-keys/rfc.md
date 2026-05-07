---
title: "Public API and API keys RFC"
description: "Defines the technical design for tenant-scoped API authentication, authorization, and key lifecycle."
owner: "Engineering"
lastUpdated: "2026-05-07"
---

# Public API and API keys RFC

## Purpose

Define the technical architecture for a tenant-safe public API with API keys and scoped authorization.

## Scope

- Included: authentication model, key storage, request authorization, contracts, and service-layer integration.
- Excluded: external OAuth authorization server and SDK packaging.

---

## Summary

Public API requests authenticate with hashed tenant-scoped API keys, then authorize against scope claims mapped to service-layer capabilities.

## Technical objective

- Enforce tenant isolation for every API request path.
- Prevent raw key storage and support key rotation.
- Keep API responses aligned with contracts package schemas.

---

## Proposed design

| Area | Design |
|------|--------|
| Auth | API key prefix + secret format, one-time reveal, hashed at rest |
| Data model | `api_keys` table with tenant_id, scopes, expires_at, revoked_at |
| API surface | Route Handlers in Next.js validate key then call core services |
| Contracts | Request/response schemas in `@enterprise/contracts` |
| Observability | Audit log + request metadata for key usage tracing |

## Security and tenant isolation implications

- No plaintext keys persisted after creation.
- Tenant ID derives from key record, never from request payload.
- Scope checks execute before service calls; service layer re-validates contextual permissions.

---

## Trade-offs

- **Chosen:** API key scopes mapped to coarse capabilities for MVP simplicity.
- **Not chosen:** per-endpoint scope granularity initially, to avoid policy explosion.

## Risks

- Leaked keys can be abused until revoked.
- Missing rate limits can amplify abuse impact.
- Scope naming drift can cause inconsistent authorization.

---

## Rollout and implementation phases

1. Key schema and secure storage primitives.
2. Middleware/auth verification path.
3. Initial endpoint set with contracts and tests.
4. Rotation UX and audit visibility.

## Open questions

- Should key auth include optional IP allow lists in MVP?
- Which hash algorithm and rotation policy should be standard?
- Should API keys support read-only defaults at creation?

---

*Last updated: 2026-05-07*
