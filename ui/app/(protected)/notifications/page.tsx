import { PageHeader } from "@enterprise/ui/components/page-header";
import { redirect } from "next/navigation";
import { requireAuth } from "@/features/auth/queries";
import { MarkAllReadButton } from "@/features/notifications/components/mark-all-read-button";
import { NotificationFilters } from "@/features/notifications/components/notification-filters";
import { NotificationList } from "@/features/notifications/components/notification-list";
import { getNotifications, getNotificationUnreadCount } from "@/features/notifications/queries";
import type { NotificationCategory } from "@/features/notifications/types";
import { ROUTES } from "@/lib/routes";

export const metadata = { title: "Notifications" };

interface NotificationsPageProps {
  searchParams: Promise<{ tab?: string; category?: string }>;
}

export default async function NotificationsPage({ searchParams }: NotificationsPageProps) {
  const user = await requireAuth();

  // Guests cannot access notifications
  if (user.role === "guest") {
    redirect(ROUTES.dashboard);
  }

  const params = await searchParams;
  const tab = params.tab;
  const category = params.category as NotificationCategory | undefined;
  const isReadFilter = tab === "unread" ? false : undefined;

  const [notifications, unreadCount] = await Promise.all([
    getNotifications({
      category,
      isRead: isReadFilter,
      limit: 20,
      offset: 0,
    }),
    getNotificationUnreadCount(),
  ]);

  const hasFilter = Boolean(tab === "unread" || category);

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Notifications"
        subtitle="Stay updated on team and billing"
        action={<MarkAllReadButton unreadCount={unreadCount} />}
      />

      <NotificationFilters />

      <NotificationList initialItems={notifications} hasFilter={hasFilter} />
    </div>
  );
}
