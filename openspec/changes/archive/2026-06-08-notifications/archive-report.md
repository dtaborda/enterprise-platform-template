# Archive Report: Notifications

**Archived**: 2026-06-08
**Status**: Shipped (implemented and merged to `main`)

## Summary

The notifications feature described by this change was fully implemented and merged
to `main` ahead of this archive. The planning artifacts (proposal, design, specs,
tasks) were never committed during the change lifecycle, so they are archived here
retroactively to preserve the design rationale.

## Evidence of Completion

| Area | Shipped Artifact |
|------|------------------|
| Service layer | `packages/core/src/services/notification-service.ts` (+ tests) |
| Email adapter | `packages/core/src/services/ports/notification-email-port.ts` + console/Resend adapters |
| UI | `ui/features/notifications/`, `ui/app/(protected)/notifications/`, `ui/app/(protected)/settings/notifications/` |
| E2E | `ui/e2e/notifications/` |
| Roadmap | `docs/features/roadmap.md` — Notifications (#10) marked **Done** |

## Notes

- No reverse migration or rollback was required; the feature is live.
- This archive is documentation-only and introduces no code changes.
