import { requireAuth } from "@/features/auth/queries";
import { DashboardShell } from "@/components/layout/dashboard-shell";

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const user = await requireAuth();

  return <DashboardShell userRole={user.role} userLabel={user.name ?? user.email}>{children}</DashboardShell>;
}
