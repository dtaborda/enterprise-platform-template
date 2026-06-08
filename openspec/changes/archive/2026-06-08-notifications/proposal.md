# Proposal: Notifications

## Intent

Users miss critical events (billing past_due, team invitations, role changes) because the platform has no notification system. No in-app alerts, no email delivery, no preference controls. Services have no dispatch API for downstream features to hook into.

## Scope

### In Scope
- Drizzle schema: `notifications` + `notification_preferences` tables with RLS
- Zod contracts: input/output schemas in `@enterprise/contracts`
- Service layer: `notification-service.ts` (create, list, mark-read, preferences, bulk)
- Email adapter: `NotificationEmailPort` + console/Resend implementations
- Integration: wire `createNotification()` into billing-service + tenant-team-service
- Server Actions: 6 thin wrappers with Sentry `notifications` area
- UI: `/notifications` center, `/settings/notifications` preferences, header bell
- Realtime: unread badge via Supabase Realtime (first subscription in codebase)
- Seed data + E2E tests (11 flows)

### Out of Scope
- SMS/push channels
- Event-driven architecture (message queue, pub/sub)
- Digest emails, notification grouping
- Rich notification actions (inline buttons)
- System category notifications
- Automatic retention cleanup cron

## Capabilities

### New Capabilities
- `notifications`: In-app notification center, email dispatch, preferences, Realtime badge, guest exclusion

### Modified Capabilities
- `billing`: billing-service gains `createNotification`/`createBulkNotifications` calls after mutations
- `tenant-team`: tenant-team-service gains `createNotification` calls after invite/accept/role-change/remove

## Approach

Port/adapter pattern mirroring existing `InvitationEmailPort`. Function-based service in `@enterprise/core`. Direct service calls (no event bus). Admin client for notification INSERT (service_role for RLS). Supabase Realtime for badge only. Critical events bypass preferences via centralized `isCritical()` check.

**Key decision — `team_invited` userId gap**: When `inviteTenantMember()` fires, query `auth.users` by email. If user exists: create in-app + email. If not: email-only (no in-app row). When `acceptTenantInvitation()` fires: always create `team_invitation_accepted` for inviter. For `team_removed`: email-only (user loses tenant access).

## Affected Areas

| Area | Impact | Description |
|------|--------|-------------|
| `packages/contracts/src/dto/notifications.ts` | New | Zod schemas for all notification I/O |
| `packages/db/src/schema/notifications.ts` | New | Tables, enums, RLS, indexes |
| `packages/db/src/index.ts` | Modified | Re-export notifications schema |
| `packages/core/src/services/notification-service.ts` | New | All notification business logic |
| `packages/core/src/services/ports/notification-email-port.ts` | New | Email adapter interface |
| `packages/core/src/services/adapters/console-notification-email.ts` | New | Dev email adapter |
| `packages/core/src/services/adapters/resend-notification-email.ts` | New | Prod email adapter |
| `packages/core/src/services/adapters/notification-email-adapter-factory.ts` | New | Adapter factory |
| `packages/core/src/services/billing-service.ts` | Modified | Add createNotification calls (4 functions) |
| `packages/core/src/services/tenant-team-service.ts` | Modified | Add createNotification calls (4 functions) |
| `ui/features/notifications/` | New | Actions, queries, components, hooks |
| `ui/app/(protected)/notifications/` | New | Page + error boundary |
| `ui/app/(protected)/settings/notifications/` | New | Preferences page + error boundary |
| `ui/components/layout/header.tsx` | Modified | Add notification bell |
| `ui/lib/routes.ts` | Modified | Add `notifications` + `notificationPreferences` |
| `ui/lib/sentry.ts` | Modified | Add `"notifications"` to SentryArea |
| `supabase/migrations/` | New | Notification tables migration |
| `supabase/seed.sql` | Modified | Seed notifications + preferences |
| `ui/e2e/notifications/` | New | 11 E2E test flows |

## Risks

| Risk | Likelihood | Mitigation |
|------|------------|------------|
| First Realtime subscription — no patterns to follow | Med | Isolate in `use-unread-count.ts` hook; cleanup on unmount |
| Notification INSERT failure breaks billing/team mutation | Low | Wrap in try/catch; parent mutation always succeeds |
| Cross-tenant notification leak | Low | RLS enforces `user_id = auth.uid()` + `tenant_id` match |
| Bulk recipient lookup adds DB call to billing functions | Low | Single `profiles` query via adminClient; acceptable latency |
| Supabase Realtime connection exhaustion | Low | One channel per user; unsubscribe on unmount/logout |
| Review budget exceeded (~800 lines across 19 files) | High | Chain into 3-4 PRs by RFC phase (contracts+schema, service+integration, UI+E2E) |

## Rollback Plan

1. **Schema**: Drop `notifications` and `notification_preferences` tables via reverse migration
2. **Integration**: Revert `createNotification` calls in billing-service and tenant-team-service (try/catch wrappers make this safe)
3. **UI**: Remove bell from header, remove `/notifications` and `/settings/notifications` routes
4. **Realtime**: Remove channel subscription hook — no other features use Realtime yet

## Dependencies

- Existing billing-service.ts and tenant-team-service.ts must be stable (no concurrent refactors)
- Resend API key for production email (optional — console adapter works without it)
- Supabase Realtime enabled on the project (enabled by default)

## Success Criteria

- [ ] `createNotification()` dispatches in-app + email for critical events regardless of preferences
- [ ] Non-critical notifications respect per-user, per-tenant, per-category preferences
- [ ] Unread badge updates in real-time without page reload
- [ ] Guest users see no bell, cannot access notification routes
- [ ] Billing and team mutations succeed even if notification dispatch fails
- [ ] All 11 E2E flows pass
- [ ] Unit tests cover all service functions with preference/critical bypass logic
- [ ] RLS prevents cross-tenant and cross-user notification access
