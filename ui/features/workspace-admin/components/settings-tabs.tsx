"use client";

import type { UserRole } from "@enterprise/contracts";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@enterprise/ui/components/tabs";
import { LogoUpload } from "@/features/workspace-admin/components/logo-upload";
import { ProfileForm } from "@/features/workspace-admin/components/profile-form";
import { RegionalForm } from "@/features/workspace-admin/components/regional-form";
import { SecurityForm } from "@/features/workspace-admin/components/security-form";
import type { WorkspaceSettings } from "@/features/workspace-admin/types";
import { getSettingsTabValues } from "./settings-tabs-utils";

interface SettingsTabsProps {
  settings: WorkspaceSettings;
  role: UserRole;
}

function SettingsTabs({ settings, role }: SettingsTabsProps) {
  const tabs = getSettingsTabValues(role);

  return (
    <Tabs defaultValue="profile">
      <TabsList variant="line">
        {tabs.map((tab) => (
          <TabsTrigger key={tab.value} value={tab.value} data-testid={`settings-tab-${tab.value}`}>
            {tab.label}
          </TabsTrigger>
        ))}
      </TabsList>

      <TabsContent value="profile" className="mt-6">
        <ProfileForm settings={settings} role={role} />
      </TabsContent>

      <TabsContent value="logo" className="mt-6">
        <LogoUpload settings={settings} />
      </TabsContent>

      <TabsContent value="regional" className="mt-6">
        <RegionalForm settings={settings} />
      </TabsContent>

      {role === "owner" && (
        <TabsContent value="security" className="mt-6">
          <SecurityForm settings={settings} />
        </TabsContent>
      )}
    </Tabs>
  );
}

export type { SettingsTabConfig } from "./settings-tabs-utils";
export { getSettingsTabValues } from "./settings-tabs-utils";
export { SettingsTabs };
