---
title: "File storage module RFC"
description: "Defines technical design for tenant-isolated file storage with Supabase Storage integration."
owner: "Engineering"
lastUpdated: "2026-05-07"
---

# File storage module RFC

## Purpose

Define technical architecture for a tenant-safe storage module aligned with Supabase Storage and existing service patterns.

## Scope

- Included: storage path policy, metadata model, signed URL access, and service interfaces.
- Excluded: asset transformation pipelines and external object storage abstractions.

---

## Summary

Storage operations are exposed through service-layer functions that enforce tenant-scoped paths and metadata consistency before interacting with Supabase Storage.

## Technical objective

- Ensure storage paths are deterministic and tenant-bounded.
- Keep access control enforced through RLS-backed metadata and signed URL strategy.
- Reuse module contracts across UI and API surfaces.

---

## Proposed design

| Area | Design |
|------|--------|
| Pathing | Use centralized path builder for `tenant/{tenantId}/...` storage keys |
| Data model | `files` table with storage key, owner, size, mime type, checksum |
| Service layer | `file-storage-service.ts` with upload init, finalize, access URL, delete |
| Storage | Supabase Storage private bucket with signed URL access |
| Contracts | Upload and file metadata schemas in `@enterprise/contracts` |

## Security and tenant isolation implications

- Direct path concatenation is avoided; path builder enforces tenant prefix.
- File reads/writes validate tenant ownership before storage operation.
- Signed URLs are short-lived and never treated as long-term authorization tokens.

---

## Trade-offs

- **Chosen:** private bucket + signed URLs for stronger default isolation.
- **Not chosen:** public bucket with application-level obscurity, because exposure risk is higher.

## Risks

- Orphaned storage objects if metadata and storage writes diverge.
- Expired signed URLs may hurt UX if refresh flow is unclear.
- Large file uploads need robust timeout and retry strategy.

---

## Rollout and implementation phases

1. Contracts and metadata schema.
2. Service functions with unit tests.
3. UI integration for upload/list/delete.
4. Quota and audit integration.

## Open questions

- Should uploads be single-step or multipart in MVP?
- Which checksum strategy is required for integrity validation?
- How should failed upload cleanup be handled?

---

*Last updated: 2026-05-07*
