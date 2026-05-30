// Feature-local type re-exports and UI state types for the notifications feature.
// Consumers in this feature should import from here, not directly from @enterprise/contracts.

import type {
  NotificationCategory,
  NotificationDto,
  NotificationPreferenceDto,
} from "@enterprise/contracts";

export type {
  NotificationCategory,
  NotificationDto,
  NotificationPreferenceDto,
  NotificationType,
  NotificationsQueryDto,
  UnreadCountDto,
  UpdatePreferencesDto,
} from "@enterprise/contracts";

// ─── UI State Types ───────────────────────────────────────────────────────────

/** Filter state used by notification-filters component and page URL params */
export interface NotificationFilters {
  category?: NotificationCategory;
  isRead?: boolean;
}

/** Props passed from the notifications page to the notification list component */
export interface NotificationListProps {
  initialItems: NotificationDto[];
  totalUnread: number;
  filters: NotificationFilters;
}

/** Props for a single notification item row */
export interface NotificationItemProps {
  notification: NotificationDto;
}

/** Props for the notification preferences form */
export interface NotificationPreferencesFormProps {
  preferences: NotificationPreferenceDto[];
}

/** Bell component props (initial server-fetched count; realtime hook takes over) */
export interface NotificationBellProps {
  initialCount: number;
  userId: string;
  tenantId: string;
}
