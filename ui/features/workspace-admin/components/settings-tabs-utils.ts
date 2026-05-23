import type { UserRole } from "@enterprise/contracts";

interface SettingsTabConfig {
  readonly value: string;
  readonly label: string;
}

const BASE_TABS: ReadonlyArray<SettingsTabConfig> = [
  { value: "profile", label: "Profile" },
  { value: "logo", label: "Logo" },
  { value: "regional", label: "Regional" },
] as const;

const OWNER_ONLY_TABS: ReadonlyArray<SettingsTabConfig> = [
  { value: "security", label: "Security" },
] as const;

/**
 * Returns the list of settings tabs available for a given user role.
 * Owner gets all tabs including Security (SET-02); other roles get only base tabs.
 */
function getSettingsTabValues(role: UserRole): ReadonlyArray<SettingsTabConfig> {
  if (role === "owner") {
    return [...BASE_TABS, ...OWNER_ONLY_TABS];
  }
  return BASE_TABS;
}

export type { SettingsTabConfig };
export { BASE_TABS, getSettingsTabValues, OWNER_ONLY_TABS };
