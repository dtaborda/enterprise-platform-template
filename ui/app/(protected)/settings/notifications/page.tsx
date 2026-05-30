import { PageHeader } from "@enterprise/ui/components/page-header";
import { redirect } from "next/navigation";
import { requireAuth } from "@/features/auth/queries";
import { NotificationPreferencesForm } from "@/features/notifications/components/notification-preferences-form";
import { getNotificationPreferences } from "@/features/notifications/queries";
import { ROUTES } from "@/lib/routes";

export const metadata = { title: "Notification preferences" };

export default async function NotificationPreferencesPage() {
  const user = await requireAuth();

  // Guests cannot access notification preferences
  if (user.role === "guest") {
    redirect(ROUTES.dashboard);
  }

  const preferences = await getNotificationPreferences();

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Notification preferences"
        subtitle="Choose which notifications you receive"
      />

      <NotificationPreferencesForm preferences={preferences} />
    </div>
  );
}
