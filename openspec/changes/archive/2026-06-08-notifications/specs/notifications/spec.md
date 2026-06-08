# Notifications Specification

## Purpose

Tenant-scoped, user-scoped notification system. Delivers in-app alerts and critical-event emails. Provides per-user, per-category preference controls and a service-level dispatch API for other platform services.

---

## Data Model

### Enums

| Enum | Values |
|------|--------|
| `notification_type` | `team_invited`, `team_invitation_accepted`, `team_role_changed`, `team_removed`, `billing_past_due`, `billing_plan_upgraded`, `billing_plan_downgraded`, `billing_canceled`, `billing_activated` |
| `notification_category` | `team`, `billing`, `system` |

### Table: `notifications`

| Column | Type | Constraints |
|--------|------|-------------|
| `id` | `uuid` | PK, `defaultRandom()` |
| `tenant_id` | `uuid` | NOT NULL, FK `tenants.id` ON DELETE CASCADE |
| `user_id` | `uuid` | NOT NULL (recipient — `auth.users.id`) |
| `type` | `notification_type` | NOT NULL |
| `category` | `notification_category` | NOT NULL |
| `title` | `text` | NOT NULL |
| `body` | `text` | NOT NULL |
| `metadata` | `text` | NULLABLE — JSON string |
| `is_read` | `boolean` | NOT NULL, default `false` |
| `read_at` | `timestamptz` | NULLABLE |
| `source_event` | `text` | NULLABLE |
| `source_entity_id` | `uuid` | NULLABLE |
| `created_at` | `timestamptz` | NOT NULL, `defaultNow()` |

### Table: `notification_preferences`

| Column | Type | Constraints |
|--------|------|-------------|
| `id` | `uuid` | PK, `defaultRandom()` |
| `user_id` | `uuid` | NOT NULL (`auth.users.id`) |
| `tenant_id` | `uuid` | NOT NULL, FK `tenants.id` ON DELETE CASCADE |
| `category` | `notification_category` | NOT NULL |
| `in_app_enabled` | `boolean` | NOT NULL, default `true` |
| `email_enabled` | `boolean` | NOT NULL, default `true` |
| `created_at` | `timestamptz` | NOT NULL, `defaultNow()` |
| `updated_at` | `timestamptz` | NOT NULL, `defaultNow()` |

UNIQUE constraint: `(user_id, tenant_id, category)`.

### Indexes

| Index | Columns |
|-------|---------|
| `notifications_user_tenant_idx` | `user_id`, `tenant_id` |
| `notifications_user_unread_idx` | `user_id`, `tenant_id`, `is_read` |
| `notifications_category_idx` | `category` |
| `notifications_created_at_idx` | `created_at` |
| `notifications_source_event_idx` | `source_event` |
| `preferences_user_tenant_idx` | `user_id`, `tenant_id` |

---

## RLS Policies

### `notifications`

| Policy | Operation | Role | Condition |
|--------|-----------|------|-----------|
| `notifications_select` | SELECT | `authenticated` | `user_id = auth.uid()` AND `tenant_id` matches JWT claim |
| `notifications_insert` | INSERT | `service_role` | Service role only |
| `notifications_update` | UPDATE | `authenticated` | `user_id = auth.uid()` AND `tenant_id` matches JWT claim |
| `notifications_delete` | DELETE | — | None — no deletes |

### `notification_preferences`

| Policy | Operation | Role | Condition |
|--------|-----------|------|-----------|
| `preferences_select` | SELECT | `authenticated` | `user_id = auth.uid()` AND `tenant_id` matches JWT claim |
| `preferences_insert` | INSERT | `authenticated` | `user_id = auth.uid()` AND `tenant_id` matches JWT claim |
| `preferences_update` | UPDATE | `authenticated` | `user_id = auth.uid()` AND `tenant_id` matches JWT claim |
| `preferences_delete` | DELETE | — | None |

---

## Contracts

Location: `packages/contracts/src/dto/notifications.ts`

### Output Schemas

```typescript
export const notificationSchema = z.object({
  id: z.string().uuid(),
  tenantId: z.string().uuid(),
  userId: z.string().uuid(),
  type: z.enum(["team_invited","team_invitation_accepted","team_role_changed","team_removed",
    "billing_past_due","billing_plan_upgraded","billing_plan_downgraded","billing_canceled","billing_activated"]),
  category: z.enum(["team","billing","system"]),
  title: z.string(),
  body: z.string(),
  metadata: z.string().nullable(),
  isRead: z.boolean(),
  readAt: z.string().datetime().nullable(),
  sourceEvent: z.string().nullable(),
  sourceEntityId: z.string().uuid().nullable(),
  createdAt: z.string().datetime(),
});

export const notificationPreferenceSchema = z.object({
  id: z.string().uuid(),
  userId: z.string().uuid(),
  tenantId: z.string().uuid(),
  category: z.enum(["team","billing","system"]),
  inAppEnabled: z.boolean(),
  emailEnabled: z.boolean(),
});

export const unreadCountSchema = z.object({ count: z.number().int().min(0) });
```

### Input Schemas

```typescript
export const markAsReadSchema = z.object({ notificationId: z.string().uuid() });
export const markAllAsReadSchema = z.object({});

export const updatePreferencesSchema = z.object({
  preferences: z.array(z.object({
    category: z.enum(["team","billing","system"]),
    inAppEnabled: z.boolean(),
    emailEnabled: z.boolean(),
  })),
});

export const notificationsQuerySchema = z.object({
  category: z.enum(["team","billing","system"]).optional(),
  isRead: z.boolean().optional(),
  limit: z.number().int().min(1).max(100).default(20),
  offset: z.number().int().min(0).default(0),
});

export const createNotificationSchema = z.object({
  tenantId: z.string().uuid(),
  userId: z.string().uuid(),
  type: z.enum([/* all 9 types */]),
  category: z.enum(["team","billing","system"]),
  title: z.string().min(1).max(200),
  body: z.string().min(1).max(1000),
  metadata: z.string().nullable().optional(),
  sourceEvent: z.string().nullable().optional(),
  sourceEntityId: z.string().uuid().nullable().optional(),
});
```

---

## Service API

Location: `packages/core/src/services/notification-service.ts`

| Function | Signature | Notes |
|----------|-----------|-------|
| `listNotifications` | `(client, tenantId, userId, query) → ServiceResult<Notification[]>` | Paginated, filtered by category/isRead |
| `getUnreadCount` | `(client, tenantId, userId) → ServiceResult<{ count: number }>` | Unread count for badge |
| `markAsRead` | `(client, tenantId, userId, notificationId) → ServiceResult<null>` | Sets `is_read=true`, `read_at=now()` |
| `markAllAsRead` | `(client, tenantId, userId) → ServiceResult<{ updated: number }>` | Bulk update all unread |
| `createNotification` | `(adminClient, input) → ServiceResult<Notification>` | Checks preferences, dispatches email |
| `createBulkNotifications` | `(adminClient, inputs[]) → ServiceResult<Notification[]>` | Multi-recipient dispatch |
| `getPreferences` | `(client, tenantId, userId) → ServiceResult<NotificationPreference[]>` | Missing rows = defaults (enabled) |
| `updatePreferences` | `(client, tenantId, userId, input) → ServiceResult<NotificationPreference[]>` | Upsert; audit logs change |

### Critical Types Constant

```typescript
const CRITICAL_TYPES: NotificationType[] = [
  "billing_past_due", "billing_canceled", "team_invited", "team_removed",
];
function isCritical(type: NotificationType): boolean {
  return CRITICAL_TYPES.includes(type);
}
```

---

## Email Adapter

### Interface

Location: `packages/core/src/services/ports/notification-email-port.ts`

```typescript
export interface NotificationEmailPort {
  sendNotificationEmail(params: {
    to: string; subject: string; title: string; body: string;
    ctaUrl?: string; ctaLabel?: string;
  }): Promise<{ success: boolean; error?: string }>;
}
```

### Implementations

| Adapter | Location | Selection |
|---------|----------|-----------|
| `ConsoleNotificationEmailAdapter` | `adapters/console-notification-email.ts` | Default (no `RESEND_API_KEY`) |
| `ResendNotificationEmailAdapter` | `adapters/resend-notification-email.ts` | When `RESEND_API_KEY` is set |

Factory: `createNotificationEmailAdapter()` in `adapters/notification-email-adapter-factory.ts` — selects by env var presence, NOT `NODE_ENV`.

---

## Server Actions

Location: `ui/features/notifications/actions.ts`

| Action | Input Schema | Service fn | Sentry area |
|--------|-------------|-----------|-------------|
| `listNotificationsAction` | `notificationsQuerySchema` | `listNotifications` | `notifications` |
| `getUnreadCountAction` | — | `getUnreadCount` | `notifications` |
| `markAsReadAction` | `markAsReadSchema` | `markAsRead` | `notifications` |
| `markAllAsReadAction` | `markAllAsReadSchema` | `markAllAsRead` | `notifications` |
| `getPreferencesAction` | — | `getPreferences` | `notifications` |
| `updatePreferencesAction` | `updatePreferencesSchema` | `updatePreferences` | `notifications` |

All actions: `Sentry.withServerActionInstrumentation` wraps the body. `captureActionError` on non-validation errors. PII exclusions: notification body, email addresses, user names.

---

## Realtime

Hook: `ui/features/notifications/hooks/use-unread-count.ts`

- Subscribes to `INSERT` events on `notifications` table filtered by `user_id=eq.{userId}`
- On INSERT: increment local unread count
- On unmount: unsubscribe channel
- RLS enforces row-level visibility — no extra filter needed beyond `user_id`

---

## UI Routes

| Route | Auth | Component |
|-------|------|-----------|
| `/notifications` | owner/admin/member | `NotificationsPage` — paginated list, category+read filters |
| `/settings/notifications` | owner/admin/member | `NotificationPreferencesPage` — per-category toggles |

Query params: `category` (team/billing/all), `isRead` (true/false/all), `page` (offset).

Register in `ui/lib/routes.ts`:
```typescript
notifications: "/notifications",
notificationPreferences: "/settings/notifications",
```

---

## Requirements

### Requirement: Notification Dispatch

The system MUST create a notification record for every eligible event dispatched via `createNotification()` or `createBulkNotifications()`.

A notification MUST be scoped to a single `(tenant_id, user_id)` pair.

The `isCritical()` check MUST run before any preference lookup. If `true`, preferences are bypassed entirely for all channels.

#### Scenario: Critical type bypasses preferences

- GIVEN a user has disabled billing email in preferences
- WHEN `createNotification` is called with `type: "billing_past_due"`
- THEN the notification is created in the DB
- AND the email adapter sends an email regardless of the preference setting

#### Scenario: Non-critical respects in-app preference

- GIVEN a user has `in_app_enabled: false` for category `billing`
- WHEN `createNotification` is called with `type: "billing_plan_upgraded"`
- THEN no in-app notification row is inserted
- AND no email is sent (no email channel for this type)

#### Scenario: Non-critical respects email preference

- GIVEN a user has `email_enabled: false` for category `team`
- WHEN `createNotification` is called with `type: "team_invitation_accepted"` (has email channel)
- THEN the in-app row IS inserted (in-app not disabled)
- AND the email adapter is NOT called

#### Scenario: Missing preference row defaults to enabled

- GIVEN a user has no preference row for category `billing`
- WHEN `createNotification` is called with `type: "billing_plan_upgraded"`
- THEN the in-app row IS inserted (default = enabled)

#### Scenario: Email adapter failure is non-blocking

- GIVEN the email adapter throws an error
- WHEN `createNotification` is called with a type requiring email
- THEN the in-app notification IS created
- AND the error is captured in Sentry
- AND `notification.email_failed` audit event is logged
- AND `ServiceResult` still returns success with the created notification

### Requirement: Notification Lifecycle

Notifications MUST be immutable after creation. Only `is_read` and `read_at` MAY be mutated.

#### Scenario: Mark single as read

- GIVEN an unread notification owned by the current user
- WHEN `markAsRead` is called with the notification ID
- THEN `is_read` becomes `true` and `read_at` is set to `now()`

#### Scenario: Mark as read — wrong user

- GIVEN a notification belonging to another user
- WHEN `markAsRead` is called
- THEN `ServiceResult` returns a permission error
- AND no row is mutated

#### Scenario: Mark as read — already read

- GIVEN a notification with `is_read = true`
- WHEN `markAsRead` is called
- THEN `ServiceResult` returns success (idempotent — no error)

#### Scenario: Mark all as read — no unread

- GIVEN the user has zero unread notifications for the current tenant
- WHEN `markAllAsRead` is called
- THEN `ServiceResult` returns `{ updated: 0 }` (success)

### Requirement: Notification Listing

The system MUST return notifications scoped to the current `(user_id, tenant_id)` pair only.

Results MUST be ordered by `created_at DESC`. Default page size is 20.

#### Scenario: List with category filter

- GIVEN a user has 3 team and 2 billing notifications
- WHEN `listNotifications` is called with `category: "team"`
- THEN only the 3 team notifications are returned

#### Scenario: List with isRead filter

- GIVEN a user has 2 unread and 3 read notifications
- WHEN `listNotifications` is called with `isRead: false`
- THEN only the 2 unread notifications are returned

#### Scenario: List pagination

- GIVEN a user has 25 notifications
- WHEN `listNotifications` is called with `limit: 20, offset: 0`
- THEN 20 notifications are returned ordered newest first
- WHEN `listNotifications` is called with `limit: 20, offset: 20`
- THEN the remaining 5 are returned

#### Scenario: Cross-tenant isolation

- GIVEN user A belongs to tenants T1 and T2, and has notifications in both
- WHEN `listNotifications` is called with T1's `tenant_id`
- THEN only notifications for T1 are returned

### Requirement: Unread Count

The system MUST return an accurate count of unread notifications for the `(user_id, tenant_id)` pair.

#### Scenario: Count after marking all read

- GIVEN a user has 3 unread notifications
- WHEN `markAllAsRead` is called
- AND `getUnreadCount` is called
- THEN the count is `0`

#### Scenario: Count with no notifications

- GIVEN a user has no notifications for the tenant
- WHEN `getUnreadCount` is called
- THEN count is `0`

### Requirement: Unread Badge Realtime

The notification bell MUST display the live unread count and update it without page reload when a new notification is inserted.

Badge shows: `0` = no badge, `1–99` = numeric, `> 99` = "99+".

#### Scenario: Badge increments on new notification

- GIVEN the notification bell shows count `2`
- WHEN a new notification row is inserted for the current user and tenant
- THEN the badge updates to `3` without page reload

#### Scenario: Realtime channel unsubscribes on unmount

- GIVEN the bell component is mounted with an active Realtime subscription
- WHEN the component unmounts
- THEN the Supabase channel is removed (cleanup executed)

### Requirement: Notification Preferences

The system MUST allow users to configure per-tenant, per-category `in_app_enabled` and `email_enabled` flags.

Missing preference rows MUST behave as if both channels are enabled.

Critical events (`billing_past_due`, `billing_canceled`, `team_invited`, `team_removed`) MUST be shown as always-on in the UI (disabled toggles) and MUST bypass preferences in the service.

#### Scenario: Save preferences

- GIVEN a user changes billing email to disabled
- WHEN `updatePreferences` is called
- THEN the `notification_preferences` row for `(user_id, tenant_id, "billing")` is upserted
- AND `notification.preferences_updated` audit event is logged with `{ userId, tenantId, changes }`

#### Scenario: Preferences take effect immediately

- GIVEN a user saves billing email disabled at T0
- WHEN `createNotification` is called with `type: "billing_plan_upgraded"` at T1 > T0
- THEN no email is dispatched

#### Scenario: Critical events shown as always-on in UI

- GIVEN the user is on `/settings/notifications`
- WHEN the preferences page renders
- THEN critical event rows show disabled toggles with explanatory text
- AND toggling them is not possible

### Requirement: Guest Exclusion

Guests MUST NOT see the notification bell, access `/notifications`, or access `/settings/notifications`.

#### Scenario: Guest sees no bell

- GIVEN a user with role `guest` is authenticated
- WHEN they view any protected page
- THEN the notification bell is not rendered in the header

#### Scenario: Guest redirected from notification routes

- GIVEN a guest navigates to `/notifications` or `/settings/notifications`
- THEN they are redirected to `/dashboard`
- AND no notification data is fetched

#### Scenario: Notification service excludes guests

- GIVEN the event involves a user with role `guest`
- WHEN notification dispatch is attempted
- THEN no notification row is created for the guest user

### Requirement: Audit Events

| Event | Trigger | Required Metadata |
|-------|---------|-------------------|
| `notification.created` | Notification row inserted | `{ type, category, recipientUserId, sourceEvent, tenantId }` |
| `notification.email_sent` | Email adapter succeeds | `{ type, recipientEmail, tenantId }` |
| `notification.email_failed` | Email adapter fails | `{ type, recipientEmail, errorCode, tenantId }` |
| `notification.preferences_updated` | User saves preferences | `{ userId, tenantId, changes }` |

`notification.marked_read` and `notification.marked_all_read` are NOT audited.

### Requirement: Sentry Instrumentation

All 6 Server Actions MUST be wrapped with `Sentry.withServerActionInstrumentation`. Non-validation errors MUST call `captureActionError` with `area: "notifications"`.

`"notifications"` MUST be added to the `SentryArea` union in `ui/lib/sentry.ts`.

PII MUST NOT be sent: notification body content, email addresses, user names.
Allowed: `inputShape` keys, `errorCode`, `tenantId`, `userId`, `userRole`, `notificationType`, `category`.

---

## Seed Data

Location: additions to `supabase/seed.sql`

| Notification | Recipient | Type | State |
|-------------|-----------|------|-------|
| "You were invited to join Demo Workspace" | member user | `team_invited` | unread |
| "Your subscription is past due" | owner user | `billing_past_due` | unread |
| "Plan upgraded to Pro" | owner user | `billing_plan_upgraded` | read (2 days ago) |
| "Member User accepted your invitation" | admin user | `team_invitation_accepted` | read (5 days ago) |
| "Your role was changed to admin" | member user | `team_role_changed` | unread |

| Preference | User | Category | State |
|-----------|------|----------|-------|
| billing email disabled | member user | billing | `in_app_enabled: true, email_enabled: false` |

---

## E2E Flows

Location: `ui/e2e/notifications/notifications.spec.ts`

| Scenario | Tag | Actor |
|----------|-----|-------|
| Bell shows unread badge | `@critical` | member |
| Opens notification center | `@critical` | member |
| Marks single notification as read | `@critical` | member |
| Marks all as read | | member |
| Filters by category | | member |
| Filters by unread | | member |
| Configures preferences | | member |
| Guest cannot see bell | `@critical` | guest |
| Guest redirected from /notifications | | guest |
| Empty state renders | | clean member |
| Owner sees billing notifications | | owner |
