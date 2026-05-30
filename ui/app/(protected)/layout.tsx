import { DashboardShell } from "@/components/layout/dashboard-shell";
import { requireAuth } from "@/features/auth/queries";
import { getNotificationUnreadCount } from "@/features/notifications/queries";

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const user = await requireAuth();
  const initialUnreadCount = user.role !== "guest" ? await getNotificationUnreadCount() : 0;

  return (
    <DashboardShell
      userRole={user.role}
      userLabel={user.name ?? user.email}
      userId={user.id}
      tenantId={user.tenantId}
      initialUnreadCount={initialUnreadCount}
    >
      {children}
    </DashboardShell>
  );
}
