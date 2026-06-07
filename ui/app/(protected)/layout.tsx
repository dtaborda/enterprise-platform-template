import { DashboardShell } from "@/components/layout/dashboard-shell";
import { requireAuth } from "@/features/auth/queries";
import { getNotificationUnreadCount } from "@/features/notifications/queries";
import { fetchOnboardingProgress } from "@/features/onboarding/queries";

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const user = await requireAuth();

  const [initialUnreadCount, onboardingProgress] = await Promise.all([
    user.role !== "guest" ? getNotificationUnreadCount() : Promise.resolve(0),
    // Fetch onboarding chip data only for owners; chip is hidden until row is initialized
    user.role === "owner" ? fetchOnboardingProgress() : Promise.resolve(null),
  ]);

  // Build minimal chip data — only shown when state is not yet activated
  const onboardingChip =
    onboardingProgress && onboardingProgress.state !== "activated"
      ? {
          completedCount: onboardingProgress.completedCount,
          totalSteps: onboardingProgress.totalSteps,
        }
      : null;

  return (
    <DashboardShell
      userRole={user.role}
      userLabel={user.name ?? user.email}
      userId={user.id}
      tenantId={user.tenantId}
      initialUnreadCount={initialUnreadCount}
      onboardingChip={onboardingChip}
    >
      {children}
    </DashboardShell>
  );
}
