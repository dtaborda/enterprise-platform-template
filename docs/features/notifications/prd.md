---
title: "Notifications PRD"
description: "Defines product requirements for tenant-scoped in-app notifications, email delivery for critical events, and user notification preferences."
owner: "Engineering"
lastUpdated: "2026-05-29"
---

# Notifications PRD

## Purpose

Define implementation-ready product requirements for tenant-scoped notifications in a multi-tenant SaaS template, including an in-app notification center, email delivery for critical events, user-configurable preferences, and a service-level notification dispatch API.

## Scope

- Included: in-app notification center, email delivery for critical events, per-user preference controls, event-to-notification catalog, notification bell with unread badge, Supabase Realtime for badge updates, and traceability.
- Excluded: SMS or push channels, workflow builder and conditional rules engine, multi-step digest customization, campaign automation, advanced segmentation, marketing messaging, webhook delivery failure notifications (follow-up with webhooks feature).

---

## Problem

Users miss important events (invitations, role changes, billing issues) because the platform has no consistent notification model. Critical billing alerts go unseen, team changes happen without awareness, and there is no way for users to control notification volume.

## Users and stakeholders

| Role | Need |
|------|------|
| Tenant members | Timely awareness of team and billing events relevant to their role |
| Tenant admins | Visibility into operational events and team changes |
| Tenant owners | Immediate alerts for critical billing issues and subscription changes |
| Product team | Reusable notification dispatch API that other features can hook into |
| Template adopter | A notification foundation they can extend with custom event types |

## Goals

- Surface important events in-app with clear relevance and read/unread state.
- Deliver critical billing and access events via email regardless of user preferences.
- Provide per-user, per-category preference controls for non-critical notifications.
- Expose a service-level `createNotification()` API that other services call to dispatch notifications.
- Keep the notification bell updated in real-time via Supabase Realtime.

---

## Permission matrix

| Action | Owner | Admin | Member | Guest |
|--------|-------|-------|--------|-------|
| View own notifications | Yes | Yes | Yes | No |
| View unread badge in header | Yes | Yes | Yes | No |
| Mark own notification as read | Yes | Yes | Yes | No |
| Mark all own notifications as read | Yes | Yes | Yes | No |
| Configure notification preferences | Yes | Yes | Yes | No |
| Access /notifications page | Yes | Yes | Yes | No (redirect) |
| Access /settings/notifications | Yes | Yes | Yes | No (redirect) |

> **Important**: Guests have no notification access in MVP. All notification operations are scoped to the current tenant — users only see notifications for their active tenant.

---

## MVP scope

### Notification model and lifecycle

- Each notification represents a single event dispatched to a single user.
- Notifications are tenant-scoped and user-scoped — a user sees only notifications for their current tenant.
- Notifications have: id, tenant, recipient user, type, category, title, body, metadata, read state, source event reference, and creation timestamp.
- Notifications are immutable after creation — only the `is_read` flag and `read_at` timestamp change.
- Notification retention: 90 days. No automatic cleanup in MVP (configurable cleanup is a follow-up).

### Channel strategy

Notifications are delivered via two channels: in-app (always active) and email (for critical events).

| Event | Type | Category | In-app | Email | Opt-out allowed |
|-------|------|----------|--------|-------|-----------------|
| Team member invited | `team_invited` | `team` | Yes | Yes (always) | No — invitation delivery is essential |
| Invitation accepted | `team_invitation_accepted` | `team` | Yes | No | Yes |
| Member role changed | `team_role_changed` | `team` | Yes | No | Yes |
| Member removed | `team_removed` | `team` | No (loses access) | Yes (always) | No — access revocation notice |
| Subscription past due | `billing_past_due` | `billing` | Yes | Yes (always) | No — critical financial alert |
| Plan upgraded | `billing_plan_upgraded` | `billing` | Yes | No | Yes |
| Plan downgraded | `billing_plan_downgraded` | `billing` | Yes | No | Yes |
| Subscription canceled | `billing_canceled` | `billing` | Yes | Yes (always) | No — critical financial alert |
| Subscription activated | `billing_activated` | `billing` | Yes | No | Yes |

### Recipient determination

| Event | Recipients |
|-------|-----------|
| `team_invited` | The invited user (by email) |
| `team_invitation_accepted` | The user who sent the invitation |
| `team_role_changed` | The affected member |
| `team_removed` | The removed member (email only) |
| `billing_past_due` | Owner + all admins |
| `billing_plan_upgraded` | Owner |
| `billing_plan_downgraded` | Owner |
| `billing_canceled` | Owner + all admins |
| `billing_activated` | Owner |

### Preference model

- Per-user, per-tenant, per-category preference rows.
- Categories: `team`, `billing`, `system` (system reserved for future use).
- Each preference row controls `in_app_enabled` and `email_enabled` independently.
- Default behavior (no preference row exists): both channels enabled.
- Critical notifications bypass preferences entirely — always delivered.
- Preferences UI lives at `/settings/notifications`.

### Notification center

- Accessible at `/notifications` from the header bell icon.
- Full-page list with pagination (not a dropdown in MVP).
- Each notification shows: icon (by category), title, body, relative timestamp, read/unread indicator.
- Click on a notification marks it as read.
- "Mark all as read" bulk action.
- Filter by category (team, billing) and read state (all, unread).

### Real-time badge updates

- The notification bell in the header shows an unread count badge.
- Badge updates via Supabase Realtime subscription on the `notifications` table, filtered by `user_id`.
- When a new notification is inserted, the badge count increments without page reload.
- The full notification list page uses server-side pagination — it does NOT use Realtime for the list (follow-up).

### Out of scope (MVP)

- SMS or push notification channels.
- Workflow builder and conditional rules engine.
- Digest emails (daily/weekly summary).
- Notification grouping or batching.
- Rich notification actions (inline buttons to accept invite, etc.).
- Event-driven architecture (message queue, pub/sub) — direct service calls in MVP.
- Webhook delivery failure notifications (comes with webhooks feature).
- System category notifications (reserved for future features).
- Automatic cleanup/retention enforcement.

---

## UX specification

### Routes

- `/notifications` — notification center (full page)
- `/settings/notifications` — notification preferences

### Notification bell (global header component)

The notification bell is a persistent icon in the application header, visible on all protected pages.

- Shows a red dot or numeric badge when unread count > 0.
- Badge shows count up to 99; shows "99+" for higher counts.
- Clicking the bell navigates to `/notifications`.
- Badge updates in real-time via Supabase Realtime.

### Notification center page layout

```
+------------------------------------------------------------------+
| Header: "Notifications" + "Stay updated on team and billing"     |
|                                              [Mark all as read]  |
+------------------------------------------------------------------+
| Filters row:                                                     |
|   [All] [Unread]  |  Category: [All] [Team] [Billing]           |
+------------------------------------------------------------------+
| Notification list:                                               |
|   +------------------------------------------------------------+ |
|   | * [Team icon] You were invited to join Acme Corp           | |
|   |    John Doe invited you as a member - 2 hours ago          | |
|   +------------------------------------------------------------+ |
|   |    [Billing icon] Your subscription is past due            | |
|   |    Update your payment method before Jun 15 - 1 day ago    | |
|   +------------------------------------------------------------+ |
|   |    [Team icon] Your role was changed to admin              | |
|   |    Jane Smith updated your role - 3 days ago               | |
|   +------------------------------------------------------------+ |
|                                                                  |
| Pagination: [<- Previous] Page 1 of 3 [Next ->]                 |
+------------------------------------------------------------------+
```

### Notification preferences page layout

```
+------------------------------------------------------------------+
| Header: "Notification preferences"                               |
| "Choose which notifications you receive"                         |
+------------------------------------------------------------------+
| Team notifications                                               |
|   Invitation accepted        [In-app: on] [Email: on]           |
|   Role changes               [In-app: on] [Email: on]           |
|   Note: Invitation and removal notices are always sent           |
+------------------------------------------------------------------+
| Billing notifications                                            |
|   Plan upgrades              [In-app: on] [Email: on]           |
|   Plan downgrades            [In-app: on] [Email: on]           |
|   Subscription activated     [In-app: on] [Email: on]           |
|   Note: Past due and cancellation alerts are always sent         |
+------------------------------------------------------------------+
|                                                   [Save changes] |
+------------------------------------------------------------------+
```

### Components and interactions

| Component | Behavior |
|-----------|----------|
| **Notification bell** | Persistent header icon. Shows unread count badge (red dot for 1-9, numeric for 10+). Navigates to `/notifications` on click. Updates via Realtime subscription. |
| **Notification list** | Paginated list of notifications. Unread items have a blue dot indicator and slightly different background. Clicking an item marks it as read. Supports category and read-state filters. |
| **Notification item** | Displays category icon, title, body (truncated to 2 lines), relative timestamp. Unread indicator (blue dot) on left edge. |
| **Mark all as read button** | Bulk action in header. Disabled when no unread notifications exist. Shows confirmation count: "Mark 5 as read". |
| **Filter bar** | Toggle between All/Unread. Category dropdown: All, Team, Billing. Filters are URL query params for shareable state. |
| **Preferences form** | Toggle switches per category per channel. Critical events shown as always-on (disabled toggles with explanation). Save button submits all changes at once. |
| **Empty state** | "You're all caught up" message when no notifications match the current filter. |

### UI states

| State | Behavior |
|-------|----------|
| **Loading** | Skeleton rows in notification list, skeleton toggle in preferences |
| **Empty (no notifications ever)** | "No notifications yet" with illustration. Subtitle: "We'll let you know when something happens." |
| **Empty (all read, unread filter active)** | "You're all caught up" message |
| **Unread notifications present** | Blue dot on unread items, badge on bell |
| **All notifications read** | No badge on bell, no blue dots |
| **Error loading notifications** | "Could not load notifications. Try again." with retry button |
| **Preferences saved** | Toast: "Notification preferences updated" |
| **Guest access** | Redirect to `/dashboard` — guests have no notification access |

### Role-specific visibility

| Element | Owner | Admin | Member | Guest |
|---------|-------|-------|--------|-------|
| Notification bell + badge | Yes | Yes | Yes | No |
| `/notifications` page | Yes | Yes | Yes | No (redirect) |
| `/settings/notifications` | Yes | Yes | Yes | No (redirect) |
| Mark as read actions | Yes | Yes | Yes | No |
| Preference toggles | Yes | Yes | Yes | No |

---

## User stories and acceptance criteria

### US-1: User receives in-app notification for team invitation

**As** a registered user, **I want** to receive an in-app notification when I am invited to a tenant so I can respond promptly.

Acceptance criteria:
1. When an admin invites a user by email, a notification of type `team_invited` is created for the invited user.
2. The notification appears in the user's notification center immediately.
3. The unread badge on the bell increments without page reload (Realtime).
4. The notification title says "You were invited to join {tenant_name}".
5. The notification body includes the inviter's name and assigned role.
6. An invitation email is also sent (always — not affected by preferences).

### US-2: User views notification center

**As** a tenant member, **I want** to view all my notifications in one place so I can stay informed about team and billing activity.

Acceptance criteria:
1. Navigating to `/notifications` displays a paginated list of the user's notifications for the current tenant.
2. Unread notifications show a blue dot indicator.
3. Notifications are ordered by creation date, newest first.
4. Each notification displays category icon, title, body, and relative timestamp.
5. Default page size is 20 notifications.

### US-3: User marks a notification as read

**As** a tenant member, **I want** to mark a notification as read so I can track which events I have already acknowledged.

Acceptance criteria:
1. Clicking on an unread notification marks it as read.
2. The blue dot indicator disappears.
3. The unread badge count in the header decrements.
4. A `notification.marked_read` audit event is NOT logged (read actions are too frequent for audit).

### US-4: User marks all notifications as read

**As** a tenant member, **I want** to mark all my notifications as read so I can clear my notification backlog.

Acceptance criteria:
1. Clicking "Mark all as read" marks all unread notifications for the current tenant as read.
2. The header badge disappears (count becomes 0).
3. All blue dot indicators disappear in the list.
4. The button is disabled when no unread notifications exist.

### US-5: User receives email for critical billing event

**As** a tenant owner, **I want** to receive an email when my subscription enters past_due status so I can resolve billing issues even if I am not using the app.

Acceptance criteria:
1. When the billing system transitions a subscription to `past_due`, email notifications are sent to the owner and all admins.
2. The email includes the tenant name, grace period end date, and a link to the billing page.
3. This email is sent regardless of the user's notification preferences (critical, no opt-out).
4. A `notification.email_sent` audit event is logged.

### US-6: User configures notification preferences

**As** a tenant member, **I want** to control which non-critical notifications I receive so I am not overwhelmed by low-priority alerts.

Acceptance criteria:
1. Navigating to `/settings/notifications` shows toggle switches per category (team, billing).
2. Each category has independent toggles for in-app and email channels.
3. Critical events (billing.past_due, billing.canceled, team.invited, team.removed) are shown as always-on with a disabled toggle and explanation text.
4. Saving preferences updates the user's notification preferences for the current tenant.
5. Preferences take effect immediately — the next notification dispatch checks updated preferences.
6. A toast confirms "Notification preferences updated" on save.

### US-7: System generates notification on billing event

**As** the system, **I want** to create notifications when billing events occur so affected users are informed.

Acceptance criteria:
1. When `billing-service.changePlan()` succeeds, a `billing_plan_upgraded` or `billing_plan_downgraded` notification is created for the owner.
2. When `billing-service.cancelSubscription()` succeeds, a `billing_canceled` notification is created for the owner and all admins.
3. When `billing-service.processWebhookEvent()` transitions to `past_due`, a `billing_past_due` notification is created for the owner and all admins.
4. When subscription activates, a `billing_activated` notification is created for the owner.
5. For critical events (past_due, canceled), email is also dispatched regardless of preferences.

### US-8: System generates notification on team event

**As** the system, **I want** to create notifications when team membership changes so affected users are informed.

Acceptance criteria:
1. When `tenant-team-service.inviteTenantMember()` succeeds, a `team_invited` notification is created for the invited user.
2. When `tenant-team-service.acceptTenantInvitation()` succeeds, a `team_invitation_accepted` notification is created for the inviter.
3. When `tenant-team-service.changeTenantMemberRole()` succeeds, a `team_role_changed` notification is created for the affected member.
4. When `tenant-team-service.removeTenantMember()` succeeds, a `team_removed` email notification is sent to the removed member (no in-app — they lose access).

### US-9: Guest cannot access notifications

**As** the system, **I want** to prevent guests from accessing notifications so the permission model is consistent.

Acceptance criteria:
1. Guests do not see the notification bell in the header.
2. Navigating to `/notifications` as a guest redirects to `/dashboard`.
3. Navigating to `/settings/notifications` as a guest redirects to `/dashboard`.
4. Notification service does not create notifications for users with the `guest` role.

---

## Success metrics

- Read rate for critical notifications (billing past_due, canceled): target > 95% within 24 hours.
- Median time from event to notification read: target < 4 hours for in-app.
- Notification preference opt-out rate: target < 30% of users disable any category (healthy signal balance).
- Email delivery success rate for critical events: target > 99%.
- Reduction in missed-action support incidents (billing past_due not noticed): target > 60% reduction.

## Risks

| Risk | Mitigation |
|------|------------|
| Over-notification reduces trust in the channel | Category preferences allow users to opt out of non-critical notifications |
| Poor event classification hides critical alerts | Critical events (past_due, canceled, invited, removed) bypass preferences entirely |
| Delivery failures go unnoticed | Email adapter failures logged to audit; Sentry captures delivery errors |
| Realtime subscription exhausts Supabase connections | Badge subscription uses a single channel per user; unsubscribe on logout |
| High notification volume degrades page performance | Server-side pagination with limit/offset; no client-side notification accumulation |
| Notification table grows unbounded | 90-day retention policy defined; cleanup job is a follow-up |
| Stale badge count after preference change | Badge count re-fetched after preference save |

---

## Traceability

### Audit events

| Event | Trigger | Metadata |
|-------|---------|----------|
| `notification.created` | Service creates a new notification | `{ type, category, recipientUserId, sourceEvent, tenantId }` |
| `notification.email_sent` | Email adapter successfully sends notification email | `{ type, recipientEmail, tenantId }` |
| `notification.email_failed` | Email adapter fails to send | `{ type, recipientEmail, errorCode, tenantId }` |
| `notification.preferences_updated` | User updates notification preferences | `{ userId, tenantId, changes }` |

> **Note**: `notification.marked_read` and `notification.marked_all_read` are NOT audited — read actions are too frequent and low-value for audit.

### Sentry

- Area: `notifications`
- Instrumented actions: `listNotificationsAction`, `getUnreadCountAction`, `markAsReadAction`, `markAllAsReadAction`, `getPreferencesAction`, `updatePreferencesAction`
- Captured errors: DB failures, email delivery failures, Realtime subscription errors
- PII exclusions: notification body content, email addresses, user names
- Allowed metadata: `inputShape` keys, `errorCode`, `tenantId`, `userId`, `userRole`, `notificationType`, `category`

### Seed data

| Entity | State | Details |
|--------|-------|---------|
| Notification | unread | `team_invited` — "You were invited to join Demo Workspace" for member user |
| Notification | unread | `billing_past_due` — "Your subscription is past due" for owner user |
| Notification | read | `billing_plan_upgraded` — "Plan upgraded to Pro" for owner user, read 2 days ago |
| Notification | read | `team_invitation_accepted` — "John accepted your invitation" for admin user, read 5 days ago |
| Notification | unread | `team_role_changed` — "Your role was changed to admin" for member user |
| Preference | default | Owner: all categories enabled (default) |
| Preference | customized | Member: billing email disabled |

### E2E flows

| Scenario | Actor | Expected outcome |
|----------|-------|------------------|
| User sees notification bell with unread count | Member | Bell shows badge with correct unread count |
| User opens notification center | Member | Paginated list of notifications loads |
| User marks single notification as read | Member | Blue dot disappears, badge decrements |
| User marks all as read | Member | All dots disappear, badge disappears |
| User filters by category | Member | Only notifications of selected category shown |
| User filters by unread | Member | Only unread notifications shown |
| User configures preferences | Member | Toggle switches save correctly |
| Critical notification always shows | Owner | Past due notification appears even with billing disabled |
| Guest cannot access notifications | Guest | Redirected to /dashboard, no bell visible |
| Owner sees billing notifications | Owner | Past due and canceled notifications present |
| Empty state renders | Member (clean user) | "No notifications yet" message displayed |

### External adapters

| Provider | Interface | Local mode | Production mode | Env var |
|----------|-----------|------------|-----------------|---------|
| Email delivery | `NotificationEmailPort` | Console adapter — logs email content | Resend adapter | `RESEND_API_KEY` |

### Environment variables

| Variable | Required | Scope | Fallback behavior |
|----------|----------|-------|-------------------|
| `RESEND_API_KEY` | Optional | Server | Console adapter logs email content locally |

### Production readiness

- [ ] All audit events verified in `audit_log` table for notification creation and email delivery
- [ ] Sentry area `notifications` registered and all Server Actions instrumented
- [ ] `NotificationEmailPort` interface documented with adapter contract
- [ ] Unit tests pass for `notification-service.ts` (all service functions)
- [ ] E2E tests pass for all defined flows
- [ ] RLS policies on `notifications` and `notification_preferences` tables verified (no cross-tenant or cross-user leaks)
- [ ] Seed data committed and `supabase db reset` runs cleanly
- [ ] Realtime subscription for badge count verified (increments on insert)
- [ ] Critical events bypass preference check verified
- [ ] `/notifications` and `/settings/notifications` routes added to `ui/lib/routes.ts`
- [ ] Notification bell component integrated in global header

---

## Decisions log

| Decision | Outcome | Rationale |
|----------|---------|-----------|
| Notification center as full page or dropdown? | Full page at `/notifications` | Better for pagination, filtering, and mobile responsiveness. Dropdown is a follow-up UX enhancement. |
| Direct service calls or event-driven dispatch? | Direct service calls in MVP | Simpler implementation, no message queue dependency. Event-driven architecture is a follow-up. |
| Notification metadata as JSONB or text? | JSON string (`text`) | Consistent with billing pattern (plans.features, plans.limits). Parsed at service layer. |
| Guest notification access? | No access in MVP | Consistent with limited guest permission model across the platform. |
| Real-time for full feed or badge only? | Badge only via Supabase Realtime | Full feed realtime adds complexity; server-side pagination is sufficient for MVP. |
| Critical event opt-out? | No opt-out for billing.past_due, billing.canceled, team.invited, team.removed | These are essential operational and financial alerts that users must receive. |
| Notification retention? | 90 days, no auto-cleanup in MVP | Defines expectation; cleanup cron job is a follow-up. |
| Per-tenant or global preferences? | Per-tenant | User may want different preferences for different workspaces. Consistent with multi-tenant model. |
| Notification grouping? | No grouping in MVP | Individual notifications are simpler and sufficient for current event volume. |
| Email template per type or generic? | Generic notification email template in MVP | Reduces template maintenance; per-type templates are a follow-up for better UX. |
| Unread badge scope? | Tenant-scoped | User sees badge count only for their current tenant. Consistent with all other tenant-scoped data. |

---

*Last updated: 2026-05-29*
