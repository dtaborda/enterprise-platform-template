---
title: "Notifications RFC"
description: "Defines the implementation-ready technical architecture for tenant-scoped notifications, email delivery, user preferences, and real-time badge updates."
owner: "Engineering"
lastUpdated: "2026-05-29"
---

# Notifications RFC

## Purpose

Define an implementation-ready technical approach for tenant-scoped notifications aligned with the service layer, contracts, adapter, and traceability conventions of the Enterprise Platform.

## Scope

- Included: data model, Row-Level Security (RLS) policies, Zod contracts, service APIs, notification dispatch integration, email adapter, Supabase Realtime for badge updates, Server Actions, UI routes, seed data, and testing strategy.
- Excluded: SMS/push channels, event-driven architecture (message queue, pub/sub), digest emails, notification grouping, rich notification actions, webhook delivery failure notifications.

---

## Summary

Implement notifications as a tenant-bounded, user-scoped module using Drizzle schema for `notifications` and `notification_preferences` tables with RLS policies, Zod contracts in `@enterprise/contracts` for all inputs and outputs, function-based services in `@enterprise/core/src/services/notification-service.ts`, a port/adapter pattern for email delivery (Resend in production, console in development), thin Server Actions in `ui/features/notifications/actions.ts`, and Supabase Realtime for live unread badge updates. Other services (billing, team) call `createNotification()` directly after their mutations — no event bus in MVP. All mutations are auditable via `AuditService.log()` and traceable via Sentry instrumentation under the `notifications` area.

## Technical objectives

- Notifications are always tenant-scoped and user-scoped — no cross-tenant or cross-user data leaks.
- Critical events (billing past_due, billing canceled, team invited, team removed) bypass user preferences and always deliver.
- Local development works without Resend credentials via `ConsoleNotificationEmailAdapter`.
- Notification dispatch is synchronous and direct — other services call `createNotification()` without a message queue.
- Unread badge count updates in real-time via Supabase Realtime subscription without page reload.

---

## Data model

Location: `packages/db/src/schema/notifications.ts` — **new file**

### New enums

```typescript
export const notificationTypeEnum = pgEnum("notification_type", [
  "team_invited",
  "team_invitation_accepted",
  "team_role_changed",
  "team_removed",
  "billing_past_due",
  "billing_plan_upgraded",
  "billing_plan_downgraded",
  "billing_canceled",
  "billing_activated",
]);

export const notificationCategoryEnum = pgEnum("notification_category", [
  "team",
  "billing",
  "system",
]);
```

### `notifications` table

| Column | Type | Constraints |
|--------|------|-------------|
| `id` | `uuid` | PK, `defaultRandom()` |
| `tenant_id` | `uuid` | NOT NULL, FK `tenants.id` ON DELETE CASCADE |
| `user_id` | `uuid` | NOT NULL (recipient — references `auth.users.id`) |
| `type` | `notification_type` enum | NOT NULL |
| `category` | `notification_category` enum | NOT NULL |
| `title` | `text` | NOT NULL |
| `body` | `text` | NOT NULL |
| `metadata` | `text` | NULLABLE (JSON string — source event details) |
| `is_read` | `boolean` | NOT NULL, default `false` |
| `read_at` | `timestamptz` | NULLABLE |
| `source_event` | `text` | NULLABLE (original event name, e.g. `'tenant_member.invited'`) |
| `source_entity_id` | `uuid` | NULLABLE (ID of the entity that triggered notification) |
| `created_at` | `timestamptz` | NOT NULL, `defaultNow()` |

### `notification_preferences` table

| Column | Type | Constraints |
|--------|------|-------------|
| `id` | `uuid` | PK, `defaultRandom()` |
| `user_id` | `uuid` | NOT NULL (references `auth.users.id`) |
| `tenant_id` | `uuid` | NOT NULL, FK `tenants.id` ON DELETE CASCADE |
| `category` | `notification_category` enum | NOT NULL |
| `in_app_enabled` | `boolean` | NOT NULL, default `true` |
| `email_enabled` | `boolean` | NOT NULL, default `true` |
| `created_at` | `timestamptz` | NOT NULL, `defaultNow()` |
| `updated_at` | `timestamptz` | NOT NULL, `defaultNow()` |

### Indexes

| Index | Columns | Purpose |
|-------|---------|---------|
| `notifications_user_tenant_idx` | `user_id`, `tenant_id` | User+tenant scoped queries |
| `notifications_user_unread_idx` | `user_id`, `tenant_id`, `is_read` | Unread count queries |
| `notifications_category_idx` | `category` | Category filtering |
| `notifications_created_at_idx` | `created_at` | Pagination ordering |
| `notifications_source_event_idx` | `source_event` | Source event lookup |
| `preferences_user_tenant_idx` | `user_id`, `tenant_id` | User preferences lookup |

### Constraints

- UNIQUE on `notification_preferences(user_id, tenant_id, category)` — one preference row per user per tenant per category.
- `notifications.metadata` stores JSON as `text`; parsing happens at the service layer.
- No foreign key from `notifications.user_id` to `profiles` — notifications may be created for users who were subsequently removed.

### Type exports

```typescript
export type Notification = typeof notifications.$inferSelect;
export type NewNotification = typeof notifications.$inferInsert;

export type NotificationPreference = typeof notificationPreferences.$inferSelect;
export type NewNotificationPreference = typeof notificationPreferences.$inferInsert;
```

---

## RLS policies

### `notifications`

| Policy | Operation | Role | Condition |
|--------|-----------|------|-----------|
| `notifications_select` | SELECT | `authenticated` | `user_id = auth.uid()` AND `tenant_id` matches JWT claim |
| `notifications_insert` | INSERT | `service_role` | Service role only — notifications created by services |
| `notifications_update` | UPDATE | `authenticated` | `user_id = auth.uid()` AND `tenant_id` matches JWT claim (mark as read only) |
| `notifications_delete` | DELETE | — | No deletes — retention cleanup is a follow-up |

### `notification_preferences`

| Policy | Operation | Role | Condition |
|--------|-----------|------|-----------|
| `preferences_select` | SELECT | `authenticated` | `user_id = auth.uid()` AND `tenant_id` matches JWT claim |
| `preferences_insert` | INSERT | `authenticated` | `user_id = auth.uid()` AND `tenant_id` matches JWT claim |
| `preferences_update` | UPDATE | `authenticated` | `user_id = auth.uid()` AND `tenant_id` matches JWT claim |
| `preferences_delete` | DELETE | — | No deletes — preferences are updated, not removed |

> **Note**: Notification creation uses the **admin client** (`service_role`) because notifications are generated by service-layer code (billing, team services) that may not have the recipient's JWT context. The admin client is used ONLY for creating notifications, never for reading or updating.

---

## Contracts

Location: `packages/contracts/src/dto/notifications.ts`

### Output schemas

```typescript
import { z } from "zod";

// Notification display shape
export const notificationSchema = z.object({
  id: z.string().uuid(),
  tenantId: z.string().uuid(),
  userId: z.string().uuid(),
  type: z.enum([
    "team_invited",
    "team_invitation_accepted",
    "team_role_changed",
    "team_removed",
    "billing_past_due",
    "billing_plan_upgraded",
    "billing_plan_downgraded",
    "billing_canceled",
    "billing_activated",
  ]),
  category: z.enum(["team", "billing", "system"]),
  title: z.string(),
  body: z.string(),
  metadata: z.string().nullable(),
  isRead: z.boolean(),
  readAt: z.string().datetime().nullable(),
  sourceEvent: z.string().nullable(),
  sourceEntityId: z.string().uuid().nullable(),
  createdAt: z.string().datetime(),
});

// Notification preference display shape
export const notificationPreferenceSchema = z.object({
  id: z.string().uuid(),
  userId: z.string().uuid(),
  tenantId: z.string().uuid(),
  category: z.enum(["team", "billing", "system"]),
  inAppEnabled: z.boolean(),
  emailEnabled: z.boolean(),
});

// Unread count shape
export const unreadCountSchema = z.object({
  count: z.number().int().min(0),
});
```

### Input schemas

```typescript
// Mark single notification as read
export const markAsReadSchema = z.object({
  notificationId: z.string().uuid(),
});

// Mark all as read (no input — uses auth context)
export const markAllAsReadSchema = z.object({});

// Update preferences
export const updatePreferencesSchema = z.object({
  preferences: z.array(
    z.object({
      category: z.enum(["team", "billing", "system"]),
      inAppEnabled: z.boolean(),
      emailEnabled: z.boolean(),
    }),
  ),
});

// List notifications query
export const notificationsQuerySchema = z.object({
  category: z.enum(["team", "billing", "system"]).optional(),
  isRead: z.boolean().optional(),
  limit: z.number().int().min(1).max(100).default(20),
  offset: z.number().int().min(0).default(0),
});

// Create notification (internal — used by services, not exposed as Server Action)
export const createNotificationSchema = z.object({
  tenantId: z.string().uuid(),
  userId: z.string().uuid(),
  type: z.enum([
    "team_invited",
    "team_invitation_accepted",
    "team_role_changed",
    "team_removed",
    "billing_past_due",
    "billing_plan_upgraded",
    "billing_plan_downgraded",
    "billing_canceled",
    "billing_activated",
  ]),
  category: z.enum(["team", "billing", "system"]),
  title: z.string().min(1).max(200),
  body: z.string().min(1).max(1000),
  metadata: z.string().nullable().optional(),
  sourceEvent: z.string().nullable().optional(),
  sourceEntityId: z.string().uuid().nullable().optional(),
});
```

### Type exports

All DTOs derive types via `z.infer<typeof schema>`.

---

## Service layer

Location: `packages/core/src/services/notification-service.ts`

Pattern: function-based (per `packages/core/AGENTS.md`).

### Service functions

| Function | Args | Returns | Notes |
|----------|------|---------|-------|
| `listNotifications` | `client, tenantId, userId, query` | `ServiceResult<Notification[]>` | RLS-scoped read with pagination and filters |
| `getUnreadCount` | `client, tenantId, userId` | `ServiceResult<{ count: number }>` | Count of unread notifications for badge |
| `markAsRead` | `client, tenantId, userId, notificationId` | `ServiceResult<null>` | Sets `is_read = true`, `read_at = now()` |
| `markAllAsRead` | `client, tenantId, userId` | `ServiceResult<{ updated: number }>` | Bulk update all unread for user+tenant |
| `createNotification` | `adminClient, input` | `ServiceResult<Notification>` | Creates notification, checks preferences, dispatches email if needed |
| `createBulkNotifications` | `adminClient, inputs[]` | `ServiceResult<Notification[]>` | Creates notifications for multiple recipients (e.g. billing events for owner+admins) |
| `getPreferences` | `client, tenantId, userId` | `ServiceResult<NotificationPreference[]>` | Returns user's preferences; missing categories use default (enabled) |
| `updatePreferences` | `client, tenantId, userId, input` | `ServiceResult<NotificationPreference[]>` | Upserts preference rows; audit logs the change |

### Critical event bypass

`createNotification` and `createBulkNotifications` MUST check if the notification type is critical before consulting preferences:

```typescript
const CRITICAL_TYPES: NotificationType[] = [
  "billing_past_due",
  "billing_canceled",
  "team_invited",
  "team_removed",
];

function isCritical(type: NotificationType): boolean {
  return CRITICAL_TYPES.includes(type);
}
```

If the type is critical, skip preference check and always deliver to all applicable channels.

### Email dispatch flow

```
createNotification(adminClient, input)
  |
  +- 1. Determine if type requires email (see channel strategy table)
  +- 2. If email required AND (isCritical(type) OR user preference allows email):
  |       +- Call emailAdapter.sendNotificationEmail(...)
  |             +- Success -> log audit event: notification.email_sent
  |             +- Failure -> log audit event: notification.email_failed
  |                          -> capture in Sentry (non-blocking)
  +- 3. If in-app required AND (isCritical(type) OR user preference allows in-app):
  |       +- INSERT into notifications table via adminClient
  |             +- Supabase Realtime broadcasts to subscribed clients
  +- 4. Return created notification(s)
```

### Integration pattern (notification dispatch)

Other services call `createNotification()` or `createBulkNotifications()` after their mutations succeed. This is a DIRECT SERVICE CALL, not an event-driven dispatch.

Example integration in `billing-service.ts`:

```typescript
// After successful plan upgrade
await createNotification(adminClient, {
  tenantId,
  userId: ownerId,
  type: "billing_plan_upgraded",
  category: "billing",
  title: "Plan upgraded",
  body: `Your plan has been upgraded to ${newPlan.name}.`,
  metadata: JSON.stringify({ fromPlanId, toPlanId }),
  sourceEvent: "billing.plan_upgraded",
  sourceEntityId: subscriptionId,
});
```

Example integration in `tenant-team-service.ts`:

```typescript
// After successful invitation
await createNotification(adminClient, {
  tenantId,
  userId: invitedUserId,
  type: "team_invited",
  category: "team",
  title: `You were invited to join ${tenantName}`,
  body: `${inviterName} invited you as ${role}.`,
  metadata: JSON.stringify({ inviterId, role }),
  sourceEvent: "tenant_member.invited",
  sourceEntityId: invitationId,
});
```

> **Important**: Notification creation failures MUST NOT break the parent operation. Wrap `createNotification` calls in try/catch and log failures to Sentry — the billing or team mutation should still succeed even if notification dispatch fails.

---

## Server Actions

Location: `ui/features/notifications/actions.ts`

All actions follow the thin wrapper pattern:

```
validate input (Zod) -> get authenticated client -> call service -> map to ActionResult -> revalidatePath
```

### Actions list

| Action | Schema | Service function | Sentry area |
|--------|--------|-----------------|-------------|
| `listNotificationsAction` | `notificationsQuerySchema` | `listNotifications` | `notifications` |
| `getUnreadCountAction` | — | `getUnreadCount` | `notifications` |
| `markAsReadAction` | `markAsReadSchema` | `markAsRead` | `notifications` |
| `markAllAsReadAction` | `markAllAsReadSchema` | `markAllAsRead` | `notifications` |
| `getPreferencesAction` | — | `getPreferences` | `notifications` |
| `updatePreferencesAction` | `updatePreferencesSchema` | `updatePreferences` | `notifications` |

### Sentry instrumentation

Every action wraps its body with `Sentry.withServerActionInstrumentation`. Non-validation errors call `captureActionError` with:
- `actionName`: the action function name
- `area`: `"notifications"`
- `tenantId`, `userId`, `userRole` from auth context
- `inputShape`: `Object.keys(parsed.data)` — NEVER values
- `errorCode`: from `ServiceResult.code`

---

## Sentry area registration

Add `notifications` to the `SentryArea` union in `ui/lib/sentry.ts`:

```typescript
export type SentryArea = "auth" | "billing" | "dashboard" | "notifications" | "resources" | "settings" | "team" | "webhook";
```

---

## Email adapter

### Interface

Location: `packages/core/src/services/ports/notification-email-port.ts`

```typescript
export interface NotificationEmailPort {
  sendNotificationEmail(params: {
    to: string;
    subject: string;
    title: string;
    body: string;
    ctaUrl?: string;
    ctaLabel?: string;
  }): Promise<{ success: boolean; error?: string }>;
}
```

### Implementations

| Adapter | Location | Behavior | Selection |
|---------|----------|----------|-----------|
| `ConsoleNotificationEmailAdapter` | `packages/core/src/services/adapters/console-notification-email.ts` | Logs email content to `console.info` | Default when `RESEND_API_KEY` is not set |
| `ResendNotificationEmailAdapter` | `packages/core/src/services/adapters/resend-notification-email.ts` | Sends via Resend API using a generic notification template | When `RESEND_API_KEY` is set |

### Adapter factory

```typescript
// packages/core/src/services/adapters/notification-email-adapter-factory.ts

export function createNotificationEmailAdapter(): NotificationEmailPort {
  const resendKey = process.env["RESEND_API_KEY"];
  if (resendKey) {
    return new ResendNotificationEmailAdapter(resendKey);
  }
  return new ConsoleNotificationEmailAdapter();
}
```

Selection is based on env var presence, NOT `NODE_ENV`.

---

## Realtime integration

### Unread badge subscription

The notification bell component subscribes to Supabase Realtime on the `notifications` table to receive live unread count updates.

```typescript
// ui/features/notifications/hooks/use-unread-count.ts

// Subscribe to INSERT events on notifications table
// Filter: user_id = current user, tenant_id = current tenant
// On INSERT event: increment local unread count
// On component unmount: unsubscribe

const channel = supabase
  .channel("notifications-badge")
  .on(
    "postgres_changes",
    {
      event: "INSERT",
      schema: "public",
      table: "notifications",
      filter: `user_id=eq.${userId}`,
    },
    (payload) => {
      setUnreadCount((prev) => prev + 1);
    },
  )
  .subscribe();
```

### Realtime scope

| Feature | Realtime | Polling | Rationale |
|---------|----------|---------|-----------|
| Unread badge count | Yes (INSERT events) | No | Immediate feedback on new notifications |
| Notification list page | No | Manual refresh / revalidate | Pagination complexity; Realtime full-feed is follow-up |
| Preference changes | No | N/A | Preference saves trigger server-side revalidation |

### Realtime RLS

Supabase Realtime respects RLS policies. The subscription only receives events for rows where the user's JWT satisfies the `notifications_select` policy. No additional filtering is needed beyond the channel filter.

---

## UI routes and components

### Routes

| Route | Component | Auth | Description |
|-------|-----------|------|-------------|
| `/notifications` | `NotificationsPage` | Required, owner/admin/member | Notification center with filters and pagination |
| `/settings/notifications` | `NotificationPreferencesPage` | Required, owner/admin/member | Per-category preference toggles |

### Feature module structure

```
ui/features/notifications/
+-- actions.ts                              # Server Actions (thin wrappers)
+-- queries.ts                              # Server-side data fetching
+-- types.ts                                # Feature-local types
+-- components/
|   +-- notification-bell.tsx               # Header bell icon with unread badge
|   +-- notification-list.tsx               # Paginated notification list
|   +-- notification-item.tsx               # Single notification row
|   +-- notification-filters.tsx            # Category and read-state filter bar
|   +-- notification-empty-state.tsx        # Empty state illustrations
|   +-- notification-preferences-form.tsx   # Per-category toggle grid
|   +-- mark-all-read-button.tsx            # Bulk action button
+-- hooks/
    +-- use-unread-count.ts                 # Supabase Realtime subscription hook
```

### App routes

```
ui/app/(protected)/notifications/
+-- page.tsx                                # Server Component — fetches data, passes to views
+-- error.tsx                               # Error boundary with Sentry

ui/app/(protected)/settings/notifications/
+-- page.tsx                                # Server Component — preferences page
+-- error.tsx                               # Error boundary with Sentry
```

> Routes registered in `ui/lib/routes.ts`:
> ```typescript
> notifications: "/notifications",
> notificationPreferences: "/settings/notifications",
> ```

---

## Seed data

Location: additions to `supabase/seed.sql`

### Seed notifications

```sql
-- Unread team invitation notification for member user
INSERT INTO public.notifications (
  id, tenant_id, user_id, type, category,
  title, body, metadata,
  is_read, source_event, source_entity_id,
  created_at
) VALUES (
  'c0000001-0000-0000-0000-000000000001',
  '<demo_tenant_id>',
  '<member_user_id>',
  'team_invited', 'team',
  'You were invited to join Demo Workspace',
  'Admin User invited you as a member.',
  '{"inviterId":"<admin_user_id>","role":"member"}',
  false, 'tenant_member.invited', null,
  now() - interval '2 hours'
);

-- Unread billing past_due notification for owner user
INSERT INTO public.notifications (
  id, tenant_id, user_id, type, category,
  title, body, metadata,
  is_read, source_event, source_entity_id,
  created_at
) VALUES (
  'c0000001-0000-0000-0000-000000000002',
  '<demo_tenant_id>',
  '<owner_user_id>',
  'billing_past_due', 'billing',
  'Your subscription is past due',
  'Update your payment method before the grace period ends.',
  '{"graceEndsAt":"2026-06-15T00:00:00Z"}',
  false, 'billing.subscription_past_due', null,
  now() - interval '1 day'
);

-- Read billing upgrade notification for owner user
INSERT INTO public.notifications (
  id, tenant_id, user_id, type, category,
  title, body, metadata,
  is_read, read_at, source_event, source_entity_id,
  created_at
) VALUES (
  'c0000001-0000-0000-0000-000000000003',
  '<demo_tenant_id>',
  '<owner_user_id>',
  'billing_plan_upgraded', 'billing',
  'Plan upgraded to Pro',
  'Your plan has been upgraded from Free to Pro.',
  '{"fromPlan":"free","toPlan":"pro"}',
  true, now() - interval '2 days',
  'billing.plan_upgraded', null,
  now() - interval '3 days'
);

-- Read invitation accepted notification for admin user
INSERT INTO public.notifications (
  id, tenant_id, user_id, type, category,
  title, body, metadata,
  is_read, read_at, source_event, source_entity_id,
  created_at
) VALUES (
  'c0000001-0000-0000-0000-000000000004',
  '<demo_tenant_id>',
  '<admin_user_id>',
  'team_invitation_accepted', 'team',
  'Member User accepted your invitation',
  'Member User joined Demo Workspace as member.',
  '{"acceptedByName":"Member User","role":"member"}',
  true, now() - interval '5 days',
  'tenant_invitation.accepted', null,
  now() - interval '6 days'
);

-- Unread role changed notification for member user
INSERT INTO public.notifications (
  id, tenant_id, user_id, type, category,
  title, body, metadata,
  is_read, source_event, source_entity_id,
  created_at
) VALUES (
  'c0000001-0000-0000-0000-000000000005',
  '<demo_tenant_id>',
  '<member_user_id>',
  'team_role_changed', 'team',
  'Your role was changed to admin',
  'Owner User updated your role from member to admin.',
  '{"previousRole":"member","newRole":"admin","changedBy":"<owner_user_id>"}',
  false, 'tenant_member.role_changed', null,
  now() - interval '12 hours'
);
```

### Seed notification preferences

```sql
-- Member user has billing email disabled
INSERT INTO public.notification_preferences (
  id, user_id, tenant_id, category,
  in_app_enabled, email_enabled,
  created_at, updated_at
) VALUES (
  'c0000002-0000-0000-0000-000000000001',
  '<member_user_id>',
  '<demo_tenant_id>',
  'billing',
  true, false,
  now(), now()
);
```

> **Note**: `<demo_tenant_id>`, `<owner_user_id>`, `<admin_user_id>`, and `<member_user_id>` reference existing deterministic seed IDs from `seed.sql`.

---

## Testing strategy

### Unit tests

Location: `packages/core/src/services/__tests__/notification-service.test.ts`

| Test | What it verifies |
|------|------------------|
| `listNotifications` returns user's notifications | Correct tenant+user scoping, pagination, ordering |
| `listNotifications` with category filter | Only matching category returned |
| `listNotifications` with isRead filter | Only read or unread returned |
| `getUnreadCount` with mixed notifications | Correct count of unread only |
| `getUnreadCount` with no notifications | Returns 0 |
| `markAsRead` success | Sets `is_read = true`, `read_at` to now |
| `markAsRead` already read | No-op, returns success |
| `markAsRead` wrong user | Returns permission error |
| `markAllAsRead` success | Updates all unread for user+tenant |
| `markAllAsRead` no unread | Returns success with `updated: 0` |
| `createNotification` non-critical, preferences allow | Creates notification in DB |
| `createNotification` non-critical, in-app disabled | Does NOT create in-app notification |
| `createNotification` critical type | Creates notification regardless of preferences |
| `createNotification` with email channel | Calls email adapter |
| `createNotification` email adapter fails | Notification still created; error logged to Sentry |
| `createBulkNotifications` multiple recipients | Creates one notification per recipient |
| `getPreferences` with existing rows | Returns saved preferences |
| `getPreferences` with no rows | Returns defaults (all enabled) |
| `updatePreferences` success | Upserts preference rows |

### Contract tests

Location: `packages/contracts/src/__tests__/notifications.test.ts`

Test all schemas for valid input, boundary values, and rejection of invalid input.

### E2E tests

Location: `ui/e2e/notifications/notifications.spec.ts`

| Test | Tag | Flow |
|------|-----|------|
| User sees notification bell with badge | `@critical` | Login as member -> verify bell shows unread count |
| User opens notification center | `@critical` | Login as member -> click bell -> verify notification list |
| User marks notification as read | `@critical` | Login as member -> click notification -> verify read state |
| User marks all as read | | Login as member -> click "Mark all as read" -> verify badge gone |
| User filters by category | | Login as member -> select "Team" filter -> verify only team notifications |
| User filters by unread | | Login as member -> select "Unread" -> verify only unread shown |
| User configures preferences | | Login as member -> navigate to preferences -> toggle billing email -> save -> verify |
| Guest cannot see bell | `@critical` | Login as guest -> verify no notification bell in header |
| Guest redirected from /notifications | | Login as guest -> navigate -> verify redirect to /dashboard |
| Empty state renders correctly | | Login as clean user -> verify "No notifications yet" message |
| Owner sees billing notifications | | Login as owner -> verify billing notifications in list |

---

## Trade-offs

| Decision | Chosen | Not chosen | Rationale |
|----------|--------|------------|-----------|
| Notification dispatch model | Direct service calls | Event-driven (pub/sub, message queue) | Simpler for MVP; no infrastructure dependency; event-driven is follow-up |
| Metadata storage | JSON string (`text`) | JSONB column | Consistent with billing pattern; parsed at service layer |
| Preference default behavior | Missing row = enabled | Explicit rows for all categories on user creation | Less data, simpler onboarding; explicit rows only created when user changes defaults |
| Realtime scope | Badge count only | Full feed realtime | Badge is the highest-value use case; full feed adds pagination complexity |
| Email template | Generic notification template | Per-type custom templates | Fewer templates to maintain in MVP; per-type templates are follow-up |
| Notification delivery | Non-blocking (try/catch in callers) | Transactional (fail parent if notification fails) | Notification failures must not break billing or team operations |
| Schema file | New `notifications.ts` | Add to `platform.ts` | Separation of concerns; notifications schema grows independently |
| Guest access | No notifications | Limited read-only | Consistent with guest permission model across all features |

## Risks

| Risk | Mitigation |
|------|------------|
| Notification table grows unbounded | 90-day retention defined; cleanup cron is follow-up |
| Realtime subscription leak (not unsubscribed) | Hook cleanup in `useEffect` return; unsubscribe on logout |
| Email adapter outage blocks critical alerts | Adapter failure is non-blocking; audit event logged; Sentry captures error |
| Preference bypass for critical events not enforced | `isCritical()` check is centralized and unit-tested |
| Cross-tenant notification leak | RLS policies enforce `user_id = auth.uid()` AND `tenant_id` match |
| Race condition: notification created after user removed | Non-blocking; orphaned notifications are harmless (no user to see them) |
| Supabase Realtime connection limit exhaustion | One channel per authenticated user; unsubscribe on unmount |

---

## Implementation phases

| Phase | Deliverable | Dependencies |
|-------|-------------|--------------|
| 1 | Contracts: Zod schemas and types in `@enterprise/contracts` | None |
| 2 | Data model: `notifications.ts` Drizzle schema, enums, RLS policies, migration | Phase 1 |
| 3 | Email adapter: `NotificationEmailPort` interface + `ConsoleNotificationEmailAdapter` + `ResendNotificationEmailAdapter` | Phase 1 |
| 4 | Services: `notification-service.ts` + unit tests | Phases 1-3 |
| 5 | Integration: wire `createNotification()` calls into `billing-service.ts` and `tenant-team-service.ts` | Phase 4 |
| 6 | Server Actions + Sentry area registration | Phase 4 |
| 7 | UI: notification center page, bell component, preferences page, route registration | Phase 6 |
| 8 | Realtime: unread badge subscription hook + header integration | Phase 7 |
| 9 | Seed data + E2E tests | Phase 7 |

---

## Decisions log

| Decision | Outcome | Rationale |
|----------|---------|-----------|
| New schema file or add to `platform.ts`? | New `notifications.ts` file | Separation of concerns; notification schema grows independently |
| `metadata` as JSON string or JSONB? | JSON string (`text`) | Consistent with billing pattern (features, limits); parsed at service layer |
| Direct dispatch or event-driven? | Direct service calls | No message queue dependency; event-driven is architectural follow-up |
| Notification retention policy? | 90 days defined, no auto-cleanup in MVP | Sets expectation; cleanup cron job is follow-up |
| Critical event handling? | Bypass preferences entirely | User safety: billing alerts and access changes must always reach the user |
| Realtime for badge or full feed? | Badge count only | Highest value for lowest complexity; full feed Realtime is follow-up |
| Guest notification access? | No access | Consistent with limited guest model; guests see no bell, no page |
| Per-tenant or global preferences? | Per-tenant | User may work in multiple tenants with different notification needs |
| Email template strategy? | Generic template | Fewer templates; per-type customization is follow-up |
| Notification immutability? | Only `is_read` and `read_at` are mutable | Audit trail integrity; notifications are an immutable event log |
| Preference default? | Missing row = all enabled | Reduces initial data; users only create preference rows when they customize |
| Notification failure impact? | Non-blocking — parent operation succeeds | Billing upgrade should not fail because notification dispatch failed |

---

*Last updated: 2026-05-29*
