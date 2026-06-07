# Tasks: Notifications

## Review Workload Forecast

| Field | Value |
|-------|-------|
| Estimated changed lines | ~2,300 additions + ~50 modifications = ~2,350 total |
| 400-line budget risk | High |
| 800-line budget risk | High |
| Chained PRs recommended | Yes |
| Delivery strategy | auto-forecast → chained PRs |
| Chain strategy | feature-branch-chain |

Decision needed before apply: No
Chained PRs recommended: Yes
Chain strategy: feature-branch-chain
400-line budget risk: High

### Suggested Work Units

| Unit | Goal | Likely PR | Notes |
|------|------|-----------|-------|
| 1 | Contracts + DB schema + email adapter + service | PR 1 | Base: `feat/notifications`; includes unit + contract tests |
| 2 | Integration into billing-service + tenant-team-service | PR 2 | Base: PR 1 branch; non-blocking dispatch + Sentry |
| 3 | Server Actions + Sentry area + routes | PR 3 | Base: PR 2 branch |
| 4 | UI components + pages + Realtime hook + header bell | PR 4 | Base: PR 3 branch |
| 5 | Seed data + E2E tests | PR 5 | Base: PR 4 branch; 11 Playwright flows |

---

## Phase 1: Contracts — Zod Schemas and Types

- [x] 1.1 Create `packages/contracts/src/dto/notifications.ts` — output schemas: `notificationSchema`, `notificationPreferenceSchema`, `unreadCountSchema`
- [x] 1.2 Add input schemas to same file: `markAsReadSchema`, `markAllAsReadSchema`, `updatePreferencesSchema`, `notificationsQuerySchema`, `createNotificationSchema`
- [x] 1.3 Export all schemas and inferred types (`Notification`, `NotificationPreference`, `CreateNotificationInput`, etc.)
- [x] 1.4 Add re-export for `notifications.ts` to `packages/contracts/src/dto/index.ts` (or create it if missing)
- [x] 1.5 Write `packages/contracts/src/__tests__/notifications.test.ts` — valid/boundary/rejection cases for all 8 schemas

**Work unit commit**: `feat(contracts): add notification Zod schemas and types`

---

## Phase 2: Data Model — Drizzle Schema, RLS, Migration

- [x] 2.1 Create `packages/db/src/schema/notifications.ts` — define `notificationTypeEnum` (9 values) and `notificationCategoryEnum` (3 values)
- [x] 2.2 Add `notifications` table to same file — all columns per spec (uuid PK, tenant_id FK cascade, user_id, type/category enums, title/body, metadata text, is_read, read_at, source_event, source_entity_id, created_at)
- [x] 2.3 Add `notificationPreferences` table — uuid PK, user_id, tenant_id FK cascade, category enum, in_app_enabled, email_enabled, created_at, updated_at; UNIQUE(user_id, tenant_id, category)
- [x] 2.4 Add 6 indexes: `notifications_user_tenant_idx`, `notifications_user_unread_idx`, `notifications_category_idx`, `notifications_created_at_idx`, `notifications_source_event_idx`, `preferences_user_tenant_idx`
- [x] 2.5 Add 5 RLS policies via `pgPolicy()`: `notifications_select` (authenticated), `notifications_insert` (service_role), `notifications_update` (authenticated), `preferences_select` (authenticated), `preferences_insert/update` (authenticated)
- [x] 2.6 Export inferred types: `Notification`, `NewNotification`, `NotificationPreference`, `NewNotificationPreference`
- [x] 2.7 Add `notifications` and `notificationPreferences` exports to `packages/db/src/index.ts`
- [x] 2.8 Run `pnpm db:generate`, flatten migration dir to `supabase/migrations/<timestamp>_add_notifications.sql`, verify SQL contains enums + tables + indexes + RLS

**Work unit commit**: `feat(db): add notifications and notification_preferences schema with RLS`

---

## Phase 3: Email Adapter — Port + Adapters + Factory

- [x] 3.1 Create `packages/core/src/services/ports/notification-email-port.ts` — `NotificationEmailPort` interface with `sendNotificationEmail({ to, subject, title, body, ctaUrl?, ctaLabel? }): Promise<{ success: boolean; error?: string }>`
- [x] 3.2 Create `packages/core/src/services/adapters/console-notification-email.ts` — `ConsoleNotificationEmailAdapter` implements `NotificationEmailPort`; logs to `console.info`
- [x] 3.3 Create `packages/core/src/services/adapters/resend-notification-email.ts` — `ResendNotificationEmailAdapter` implements `NotificationEmailPort`; sends via Resend generic template
- [x] 3.4 Create `packages/core/src/services/adapters/notification-email-adapter-factory.ts` — `createNotificationEmailAdapter()` singleton; selects by `RESEND_API_KEY` presence (NOT `NODE_ENV`)

**Work unit commit**: `feat(core): add NotificationEmailPort interface and console/Resend adapters`

---

## Phase 4: Service Layer — notification-service.ts + Unit Tests

- [x] 4.1 Create `packages/core/src/services/notification-service.ts` — define `CRITICAL_TYPES` array and `isCritical(type)` helper
- [x] 4.2 Implement `createNotification(adminClient, input)` — preference check (skip if critical), INSERT notifications via adminClient, call emailAdapter if channel requires it; non-blocking email failure with Sentry capture; audit `notification.created` + `notification.email_sent/failed`
- [x] 4.3 Implement `createBulkNotifications(adminClient, inputs[])` — loop `createNotification` per recipient; return all created rows
- [x] 4.4 Implement `listNotifications(client, tenantId, userId, query)` — RLS-scoped SELECT with category/isRead filters, ORDER BY created_at DESC, limit/offset pagination
- [x] 4.5 Implement `getUnreadCount(client, tenantId, userId)` — COUNT WHERE is_read = false for user+tenant
- [x] 4.6 Implement `markAsRead(client, tenantId, userId, notificationId)` — UPDATE is_read=true, read_at=now(); idempotent (no error if already read); guard user_id match
- [x] 4.7 Implement `markAllAsRead(client, tenantId, userId)` — bulk UPDATE all unread for user+tenant; return `{ updated: number }`
- [x] 4.8 Implement `getPreferences(client, tenantId, userId)` — SELECT preference rows; missing categories return default (all enabled)
- [x] 4.9 Implement `updatePreferences(client, tenantId, userId, input)` — UPSERT preference rows; audit `notification.preferences_updated`
- [x] 4.10 Write `packages/core/src/services/__tests__/notification-service.test.ts` — all 18 test cases from RFC: list (3), unread count (2), markAsRead (3), markAllAsRead (2), createNotification (5), createBulk (1), getPreferences (2), updatePreferences (1)

**Work unit commit**: `feat(core): add notification service with full unit tests`

---

## Phase 5: Integration — Billing and Team Service Wiring

- [x] 5.1 Modify `packages/core/src/services/billing-service.ts` — import `createNotification`, `createBulkNotifications` from `notification-service`; wrap all calls in try/catch (non-blocking)
- [x] 5.2 Add `billing_past_due` dispatch in billing-service: `createBulkNotifications(adminClient, [owner, ...admins])` — critical, in-app + email
- [x] 5.3 Add `billing_canceled` dispatch: `createBulkNotifications(adminClient, [owner, ...admins])` — critical, in-app + email
- [x] 5.4 Add `billing_plan_upgraded` dispatch: `createNotification(adminClient, owner)` — metadata: `{ fromPlanId, toPlanId }`
- [x] 5.5 Add `billing_plan_downgraded` and `billing_activated` dispatches for owner
- [x] 5.6 Modify `packages/core/src/services/tenant-team-service.ts` — import and wire notification dispatches; all wrapped in try/catch
- [x] 5.7 Add `team_invited` dispatch in team-service: if invited user exists → `createNotification(adminClient, userId)` critical; if no account → email-only via adapter
- [x] 5.8 Add `team_invitation_accepted` dispatch: `createNotification(adminClient, inviterId)` — metadata: `{ acceptedByName, role }`
- [x] 5.9 Add `team_role_changed` dispatch: `createNotification(adminClient, affectedUserId)` — metadata: `{ previousRole, newRole, changedBy }`
- [x] 5.10 Add `team_removed` dispatch: email-only via adapter (no in-app row — user loses access), critical bypass

**Work unit commit**: `feat(core): wire notification dispatch into billing and team services`

---

## Phase 6: Server Actions + Sentry Area Registration

- [x] 6.1 Add `"notifications"` to `SentryArea` union in `ui/lib/sentry.ts`
- [x] 6.2 Add `ROUTES.notifications` and `ROUTES.notificationPreferences` to `ui/lib/routes.ts`
- [x] 6.3 Create `ui/features/notifications/actions.ts` (`"use server"`) — import from `@enterprise/core/services` subpath (not barrel)
- [x] 6.4 Implement `listNotificationsAction` — validate with `notificationsQuerySchema`, call `listNotifications`, return `ActionResult<Notification[]>`; Sentry area `"notifications"`
- [x] 6.5 Implement `getUnreadCountAction` — no input validation, call `getUnreadCount`, return `ActionResult<{ count: number }>`
- [x] 6.6 Implement `markAsReadAction` — validate with `markAsReadSchema`, call `markAsRead`, return `ActionResult<null>`; `revalidatePath(ROUTES.notifications)`
- [x] 6.7 Implement `markAllAsReadAction` — no input, call `markAllAsRead`, return `ActionResult<{ updated: number }>`; `revalidatePath(ROUTES.notifications)`
- [x] 6.8 Implement `getPreferencesAction` — no input, call `getPreferences`, return `ActionResult<NotificationPreference[]>`
- [x] 6.9 Implement `updatePreferencesAction` — validate with `updatePreferencesSchema`, call `updatePreferences`, return `ActionResult<NotificationPreference[]>`; `revalidatePath(ROUTES.notificationPreferences)`
- [x] 6.10 Create `ui/features/notifications/queries.ts` — server-side data fetching functions (SSR for pages): `getNotificationsQuery`, `getUnreadCountQuery`, `getPreferencesQuery`
- [x] 6.11 Create `ui/features/notifications/types.ts` — feature-local types (filter state, UI props)

**Work unit commit**: `feat(ui): add notification Server Actions and Sentry instrumentation`

---

## Phase 7: UI — Components, Pages, Routes

- [x] 7.1 Create `ui/features/notifications/components/notification-item.tsx` — category icon, title, body (2-line truncate), relative timestamp, unread blue dot indicator; click marks as read
- [x] 7.2 Create `ui/features/notifications/components/notification-filters.tsx` — read-state toggles (All/Unread) + category dropdown (All/Team/Billing); state as URL query params
- [x] 7.3 Create `ui/features/notifications/components/notification-empty-state.tsx` — "No notifications yet" and "You're all caught up" variants
- [x] 7.4 Create `ui/features/notifications/components/mark-all-read-button.tsx` — disabled when no unread; calls `markAllAsReadAction`; shows count label
- [x] 7.5 Create `ui/features/notifications/components/notification-list.tsx` — Client Component; paginated list with `router.refresh()` after mutations; renders `notification-item` list + `notification-empty-state`
- [x] 7.6 Create `ui/features/notifications/components/notification-preferences-form.tsx` — toggle grid per category per channel; critical events show disabled toggles; calls `updatePreferencesAction`; success toast
- [x] 7.7 Create `ui/features/notifications/components/notification-bell.tsx` — bell icon; unread badge (numeric ≤99, "99+" above); navigates to `/notifications`; receives `initialCount` prop; uses `useUnreadCount` hook; renders only if role ≠ `"guest"`
- [x] 7.8 Create `ui/app/(protected)/notifications/page.tsx` — Server Component; calls `getNotificationsQuery` + `getUnreadCountQuery`; renders `NotificationList` + `MarkAllReadButton` + `NotificationFilters`
- [x] 7.9 Create `ui/app/(protected)/notifications/error.tsx` — error boundary with Sentry; "Could not load notifications. Try again." + retry button
- [x] 7.10 Create `ui/app/(protected)/settings/notifications/page.tsx` — Server Component; calls `getPreferencesQuery`; renders `NotificationPreferencesForm`
- [x] 7.11 Create `ui/app/(protected)/settings/notifications/error.tsx` — error boundary for preferences page

**Work unit commit**: `feat(ui): add notification center, preferences pages and components`

---

## Phase 8: Realtime — Badge Subscription Hook + Header Integration

- [x] 8.1 Create `ui/features/notifications/hooks/use-unread-count.ts` — Client-side hook; subscribes to Supabase Realtime `postgres_changes` INSERT on `notifications` table filtered by `user_id=eq.${userId}`; increments count; unsubscribes on unmount; logs Realtime errors to Sentry
- [x] 8.2 Modify `ui/components/layout/header.tsx` — conditionally render `<NotificationBell>` between ThemeToggle and avatar dropdown; pass `userId`, `tenantId`, `initialCount`, `role` from layout context; guard: skip render if `role === "guest"`

**Work unit commit**: `feat(ui): add Realtime unread badge hook and integrate bell in header`

---

## Phase 9: Seed Data + E2E Tests

- [x] 9.1 Add 5 seed notifications and 1 preference row to `supabase/seed.sql` — unread team_invited (member), unread billing_past_due (owner), read billing_plan_upgraded (owner), read team_invitation_accepted (admin), unread team_role_changed (member); preference: member billing email disabled
- [x] 9.2 Create `ui/e2e/notifications/notifications.spec.ts` — Page Object `NotificationsPage` + `NotificationPreferencesPage`; import paths from `ui/e2e/helpers/routes.ts`
- [x] 9.3 E2E: `@critical` — User sees notification bell with badge (login as member, verify unread count > 0)
- [x] 9.4 E2E: `@critical` — User opens notification center (click bell → `/notifications` loads list)
- [x] 9.5 E2E: `@critical` — User marks notification as read (click unread item → blue dot gone, badge decrements)
- [x] 9.6 E2E: User marks all as read ("Mark all as read" → badge gone, all dots gone)
- [x] 9.7 E2E: User filters by category (select "Team" → only team notifications visible)
- [x] 9.8 E2E: User filters by unread (select "Unread" → only unread shown)
- [x] 9.9 E2E: User configures preferences (toggle billing email off → save → verify persisted)
- [x] 9.10 E2E: `@critical` — Guest cannot see bell (login as guest → no bell in header)
- [x] 9.11 E2E: Guest redirected from `/notifications` (navigate → redirected to `/dashboard`)
- [x] 9.12 E2E: Empty state renders correctly (clean user → "No notifications yet" message)
- [x] 9.13 E2E: Owner sees billing notifications (login as owner → billing_past_due present in list)
- [x] 9.14 Add `ROUTES.notifications` and `ROUTES.notificationPreferences` to `ui/e2e/helpers/routes.ts`

**Work unit commit**: `test(ui): add E2E tests and seed data for notifications feature`

---

## Task Summary

| Phase | Tasks | Focus | PR |
|-------|-------|-------|----|
| 1 | 1.1–1.5 (5) | Contracts + contract tests | PR 1 |
| 2 | 2.1–2.8 (8) | DB schema + RLS + migration | PR 1 |
| 3 | 3.1–3.4 (4) | Email adapter port + factory | PR 1 |
| 4 | 4.1–4.10 (10) | Service layer + 18 unit tests | PR 1 |
| 5 | 5.1–5.10 (10) | Integration wiring (billing + team) | PR 2 |
| 6 | 6.1–6.11 (11) | Server Actions + Sentry + routes | PR 3 |
| 7 | 7.1–7.11 (11) | UI components + pages | PR 4 |
| 8 | 8.1–8.2 (2) | Realtime hook + header bell | PR 4 |
| 9 | 9.1–9.14 (14) | Seed data + E2E tests | PR 5 |
| **Total** | **75** | | **5 PRs** |

## Feature-Branch Chain Strategy

```
main
 └─ feat/notifications (tracker)
     ├─ PR 1: feat/notifications-foundation  → base: feat/notifications
     ├─ PR 2: feat/notifications-integration  → base: PR 1 branch
     ├─ PR 3: feat/notifications-actions      → base: PR 2 branch
     ├─ PR 4: feat/notifications-ui           → base: PR 3 branch
     └─ PR 5: feat/notifications-e2e          → base: PR 4 branch
```

Only `feat/notifications` tracker merges to `main`. Each child PR targets the immediate previous branch so diff stays focused on that slice only.
