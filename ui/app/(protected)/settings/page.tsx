import { redirect } from "next/navigation";
import { requireAuth } from "@/features/auth/queries";
import { LogoUpload } from "@/features/workspace-admin/components/logo-upload";
import { ProfileForm } from "@/features/workspace-admin/components/profile-form";
import { RegionalForm } from "@/features/workspace-admin/components/regional-form";
import { SecurityForm } from "@/features/workspace-admin/components/security-form";
import { SettingsSidebar } from "@/features/workspace-admin/components/settings-sidebar";
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

      <div className="flex gap-8">
        <SettingsSidebar role={user.role} />

        <div className="flex flex-1 flex-col gap-8">
          <section id="profile">
            <ProfileForm settings={settings} role={user.role} />
          </section>

          <section id="logo">
            <LogoUpload settings={settings} />
          </section>

          <section id="regional">
            <RegionalForm settings={settings} />
          </section>

          {user.role === "owner" && (
            <section id="security">
              <SecurityForm settings={settings} />
            </section>
          )}
        </div>
      </div>
    </div>
  );
}
