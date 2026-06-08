# Design: Notifications

## Technical Approach

Implement notifications as a new vertical module following the existing platform patterns: Drizzle schema in `packages/db/`, Zod contracts in `packages/contracts/`, function-based service in `packages/core/`, thin Server Actions + feature UI in `ui/`. The email adapter mirrors the existing `InvitationEmailPort` / factory pattern. Supabase Realtime (first subscription in codebase) is scoped to badge-only via a custom hook. Services call `createNotification()` directly — no event bus.

## Architecture Decisions

| Decision | Choice | Alternative | Rationale |
|----------|--------|-------------|-----------|
| Dispatch model | Direct service calls | Event-driven (pub/sub) | No infra dependency for MVP; event-driven is follow-up |
| Notification INSERT auth | Admin client (`service_role`) | Authenticated client | Callers (billing, team) may lack recipient JWT context |
| Email adapter pattern | `NotificationEmailPort` + factory | Inline Resend calls | Mirrors `InvitationEmailPort`; env-based selection; testable |
| Adapter factory caching | Singleton per process (like `payment-adapter-factory.ts`) | Fresh instance per call | Serverless-safe; consistent with existing pattern |
| Realtime scope | Badge count only (INSERT events) | Full feed + list | Lowest complexity for highest UX value; full feed is follow-up |
| Schema file | New `notifications.ts` | Extend `platform.ts` | Domain separation; notifications grow independently |
| Metadata column | `text` (JSON string) | `jsonb` | Consistent with billing `features`/`limits` pattern |
| Preference defaults | Missing row = all enabled | Explicit rows on user creation | Less data; rows only created when user customizes |
| Guest access | No notifications | Limited read-only | Consistent with guest permission model across all features |

## Data Flow

### Notification Creation (service → DB + email)

```
billing-service / tenant-team-service
  │
  ├─ try { createNotification(adminClient, input) }
  │    │
  │    ├─ 1. isCritical(type)? → skip preference check
  │    │   else → query notification_preferences
  │    │
  │    ├─ 2. in_app_enabled OR critical?
  │    │      → INSERT notifications (adminClient, service_role)
  │    │        → Supabase Realtime broadcasts INSERT to subscribed clients
  │    │
  │    ├─ 3. email_enabled OR critical?
  │    │      → emailAdapter.sendNotificationEmail(...)
  │    │        → success: audit log notification.email_sent
  │    │        → failure: audit log notification.email_failed + Sentry
  │    │
  │    └─ 4. return ServiceResult<Notification>
  │
  └─ catch → log to Sentry; parent mutation still succeeds
```

### Unread Badge (Realtime)

```
useUnreadCount hook (Client Component)
  │
  ├─ mount: getUnreadCountAction() → initial count
  ├─ supabase.channel("notifications-badge")
  │    .on("postgres_changes", { event: "INSERT", table: "notifications", filter: user_id })
  │    → increment local count
  ├─ on markAsRead/markAllAsRead → refresh count via action
  └─ unmount: channel.unsubscribe()
```

### Notification Center (Server → Client)

```
/notifications (page.tsx — Server Component)
  │
  ├─ listNotificationsAction(query) → NotificationList (Client Component)
  │    ├─ NotificationItem × N
  │    ├─ NotificationFilters (category, read state)
  │    └─ MarkAllReadButton
  └─ on mutation success → router.refresh()
```

## File Changes

| File | Action | Description |
|------|--------|-------------|
| `packages/contracts/src/dto/notifications.ts` | Create | Zod schemas: input/output contracts, type exports |
| `packages/contracts/src/dto/index.ts` | Modify | Re-export notifications barrel |
| `packages/db/src/schema/notifications.ts` | Create | Enums, tables, RLS policies, indexes, type exports |
| `packages/db/src/index.ts` | Modify | Re-export notifications schema |
| `packages/core/src/services/ports/notification-email-port.ts` | Create | `NotificationEmailPort` interface |
| `packages/core/src/services/adapters/console-notification-email.ts` | Create | Console adapter (dev) |
| `packages/core/src/services/adapters/resend-notification-email.ts` | Create | Resend adapter (prod) |
| `packages/core/src/services/adapters/notification-email-adapter-factory.ts` | Create | Factory: env-based selection with singleton cache |
| `packages/core/src/services/notification-service.ts` | Create | 8 functions: list, count, markRead, markAllRead, create, createBulk, getPrefs, updatePrefs |
| `packages/core/src/services/billing-service.ts` | Modify | Add `createNotification` calls after plan change/cancel/past_due mutations |
| `packages/core/src/services/tenant-team-service.ts` | Modify | Add `createNotification` calls after invite/accept/role-change/remove |
| `ui/features/notifications/actions.ts` | Create | 6 thin Server Actions with Sentry `notifications` area |
| `ui/features/notifications/queries.ts` | Create | Server-side data fetching for pages |
| `ui/features/notifications/components/notification-bell.tsx` | Create | Header bell icon + unread badge (Client Component) |
| `ui/features/notifications/components/notification-list.tsx` | Create | Paginated list container |
| `ui/features/notifications/components/notification-item.tsx` | Create | Single notification row |
| `ui/features/notifications/components/notification-filters.tsx` | Create | Category + read-state filter bar |
| `ui/features/notifications/components/notification-empty-state.tsx` | Create | Empty state illustration |
| `ui/features/notifications/components/notification-preferences-form.tsx` | Create | Per-category toggle grid (Client Component) |
| `ui/features/notifications/components/mark-all-read-button.tsx` | Create | Bulk mark-read action |
| `ui/features/notifications/hooks/use-unread-count.ts` | Create | Supabase Realtime subscription hook |
| `ui/app/(protected)/notifications/page.tsx` | Create | Notification center page (Server Component) |
| `ui/app/(protected)/notifications/error.tsx` | Create | Error boundary with Sentry |
| `ui/app/(protected)/settings/notifications/page.tsx` | Create | Preferences page (Server Component) |
| `ui/app/(protected)/settings/notifications/error.tsx` | Create | Error boundary with Sentry |
| `ui/lib/routes.ts` | Modify | Add `notifications` and `notificationPreferences` routes |
| `ui/lib/sentry.ts` | Modify | Add `"notifications"` to `SentryArea` union |
| `ui/components/layout/header.tsx` | Modify | Insert `NotificationBell` between `ThemeToggle` and user avatar |
| `supabase/migrations/XXXX_notifications.sql` | Create | Tables, enums, indexes, RLS policies |
| `supabase/seed.sql` | Modify | Add seed notifications and preferences |

## Interfaces / Contracts

### NotificationEmailPort (mirrors InvitationEmailPort)

```typescript
// packages/core/src/services/ports/notification-email-port.ts
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

### Non-Blocking Dispatch Wrapper

```typescript
// Used by billing-service and tenant-team-service at call sites
try {
  await createNotification(adminClient, { ...input });
} catch (err) {
  // Parent mutation already succeeded — log and continue
  console.error("[notification-dispatch] Failed:", err);
  // Sentry capture happens inside createNotification
}
```

### Header Bell Integration

```typescript
// header.tsx receives userId and tenantId from layout
// Renders NotificationBell only when role !== "guest"
{userRole !== "guest" && (
  <NotificationBell userId={userId} tenantId={tenantId} />
)}
```

## Testing Strategy

| Layer | What to Test | Approach |
|-------|-------------|----------|
| Unit | notification-service: 18 cases (list, count, markRead, create, preferences, critical bypass, email failure) | Vitest + mocked SupabaseClient + mocked NotificationEmailPort |
| Unit | contracts: all schemas valid/invalid boundaries | Vitest schema.parse / schema.safeParse |
| E2E | 11 flows: bell badge, list, mark read, mark all, filters, preferences, guest exclusion, empty state | Playwright + seed data + Page Object Model |

## Migration / Rollout

### Migration (new schema)

1. Generate migration from `packages/db/src/schema/notifications.ts` via `pnpm --filter @enterprise/db db:generate`
2. Flatten migration directory per Drizzle skill checklist
3. Verify incremental content (no full schema dump)
4. Migration creates: 2 enums, 2 tables, 6 indexes, 1 unique constraint, 5 RLS policies

### Rollout

No feature flags needed — notifications are additive. No existing data is modified. Rollback is a reverse migration + revert of service integration calls.

### Seed data

5 notification rows (mix of read/unread, team/billing categories) + 1 preference row added to `supabase/seed.sql`.

## Open Questions

- [x] All questions resolved in proposal and RFC — no blockers.
