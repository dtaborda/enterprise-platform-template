import { redirect } from "next/navigation";
import { requireAuth } from "@/features/auth/queries";
import { SettingsTabs } from "@/features/workspace-admin/components/settings-tabs";
import { fetchWorkspaceSettings } from "@/features/workspace-admin/queries";
import { ROUTES } from "@/lib/routes";

export const metadata = { title: "Settings" };

export default async function SettingsPage() {
  const user = await requireAuth();

  // Member and guest roles cannot access settings
  if (user.role !== "owner" && user.role !== "admin") {
    redirect(ROUTES.dashboard);
  }

  const settings = await fetchWorkspaceSettings(user.tenantId);

  if (!settings) {
    redirect(ROUTES.dashboard);
  }

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="font-headline text-2xl font-bold">Settings</h1>
        <p className="text-muted-foreground">Manage workspace configuration</p>
      </div>

      <SettingsTabs settings={settings} role={user.role} />
    </div>
  );
}
