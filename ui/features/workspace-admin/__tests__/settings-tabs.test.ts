import { describe, expect, it } from "vitest";
import { getSettingsTabValues } from "../components/settings-tabs-utils";

describe("getSettingsTabValues", () => {
  describe("base tabs — always present for owner and admin", () => {
    it("owner sees profile, logo, regional, and security tabs", () => {
      const tabs = getSettingsTabValues("owner");
      const values = tabs.map((t) => t.value);
      expect(values).toContain("profile");
      expect(values).toContain("logo");
      expect(values).toContain("regional");
      expect(values).toContain("security");
    });

    it("admin sees profile, logo, and regional tabs", () => {
      const tabs = getSettingsTabValues("admin");
      const values = tabs.map((t) => t.value);
      expect(values).toContain("profile");
      expect(values).toContain("logo");
      expect(values).toContain("regional");
    });
  });

  describe("security tab — owner-only gating (SET-02)", () => {
    it("owner gets security tab", () => {
      const tabs = getSettingsTabValues("owner");
      const hasSecurityTab = tabs.some((t) => t.value === "security");
      expect(hasSecurityTab).toBe(true);
    });

    it("admin does NOT get security tab", () => {
      const tabs = getSettingsTabValues("admin");
      const hasSecurityTab = tabs.some((t) => t.value === "security");
      expect(hasSecurityTab).toBe(false);
    });

    it("member does NOT get security tab", () => {
      const tabs = getSettingsTabValues("member");
      const hasSecurityTab = tabs.some((t) => t.value === "security");
      expect(hasSecurityTab).toBe(false);
    });

    it("guest does NOT get security tab", () => {
      const tabs = getSettingsTabValues("guest");
      const hasSecurityTab = tabs.some((t) => t.value === "security");
      expect(hasSecurityTab).toBe(false);
    });
  });

  describe("tab count", () => {
    it("owner has exactly 4 tabs", () => {
      expect(getSettingsTabValues("owner")).toHaveLength(4);
    });

    it("admin has exactly 3 tabs", () => {
      expect(getSettingsTabValues("admin")).toHaveLength(3);
    });
  });

  describe("tab labels and testid pattern (SET-03)", () => {
    it("each tab has a label and matching data-testid value", () => {
      const tabs = getSettingsTabValues("owner");
      for (const tab of tabs) {
        expect(tab.label).toBeTruthy();
        expect(tab.value).toBeTruthy();
        // value used to build data-testid="settings-tab-{value}"
        expect(tab.value).toMatch(/^[a-z]+$/);
      }
    });

    it("profile tab is always first", () => {
      const ownerTabs = getSettingsTabValues("owner");
      const adminTabs = getSettingsTabValues("admin");
      expect(ownerTabs.at(0)?.value).toBe("profile");
      expect(adminTabs.at(0)?.value).toBe("profile");
    });
  });
});
