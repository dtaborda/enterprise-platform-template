import { describe, expect, it } from "vitest";
import { filterNavItemsByRole, isNavItemActive } from "../nav-utils";

const DASHBOARD_HREF = "/dashboard";

describe("isNavItemActive", () => {
  describe("dashboard (exact match)", () => {
    it("returns true when pathname equals dashboard href exactly", () => {
      expect(isNavItemActive(DASHBOARD_HREF, "/dashboard", DASHBOARD_HREF)).toBe(true);
    });

    it("returns false when pathname is a sub-route of dashboard", () => {
      expect(isNavItemActive(DASHBOARD_HREF, "/dashboard/stats", DASHBOARD_HREF)).toBe(false);
    });

    it("returns false when pathname has trailing slash on dashboard", () => {
      expect(isNavItemActive(DASHBOARD_HREF, "/dashboard/", DASHBOARD_HREF)).toBe(false);
    });
  });

  describe("non-dashboard routes (prefix match)", () => {
    it("returns true when pathname equals href exactly", () => {
      expect(isNavItemActive("/settings", "/settings", DASHBOARD_HREF)).toBe(true);
    });

    it("returns true when pathname is a sub-route (prefix match)", () => {
      expect(isNavItemActive("/settings", "/settings/profile", DASHBOARD_HREF)).toBe(true);
    });

    it("returns true for nested resource route", () => {
      expect(isNavItemActive("/resources", "/resources/123", DASHBOARD_HREF)).toBe(true);
    });

    it("returns true for deeply nested route", () => {
      expect(isNavItemActive("/resources", "/resources/123/edit", DASHBOARD_HREF)).toBe(true);
    });

    it("returns false when pathname does not match href", () => {
      expect(isNavItemActive("/billing", "/team", DASHBOARD_HREF)).toBe(false);
    });

    it("returns false when pathname is a different route starting with same letters", () => {
      // /team should NOT match /teamwork
      expect(isNavItemActive("/team", "/teamwork", DASHBOARD_HREF)).toBe(false);
    });

    it("returns false for root path on non-root href", () => {
      expect(isNavItemActive("/settings", "/", DASHBOARD_HREF)).toBe(false);
    });

    it("returns false when href is prefix of a sibling route", () => {
      expect(isNavItemActive("/settings", "/settings-old", DASHBOARD_HREF)).toBe(false);
    });
  });

  describe("edge cases", () => {
    it("handles root path as href with exact match", () => {
      expect(isNavItemActive("/", "/", DASHBOARD_HREF)).toBe(true);
    });

    it("returns false when pathname is empty string", () => {
      expect(isNavItemActive("/settings", "", DASHBOARD_HREF)).toBe(false);
    });
  });
});

describe("filterNavItemsByRole", () => {
  const mockItems = [
    { label: "Dashboard", href: "/dashboard", icon: {} as never },
    { label: "Resources", href: "/resources", icon: {} as never },
    { label: "Team", href: "/team", icon: {} as never },
    {
      label: "Billing",
      href: "/billing",
      icon: {} as never,
      roles: ["owner", "admin"] as never,
    },
    {
      label: "Settings",
      href: "/settings",
      icon: {} as never,
      roles: ["owner", "admin"] as never,
    },
  ];

  it("owner sees all items", () => {
    const result = filterNavItemsByRole(mockItems, "owner");
    expect(result).toHaveLength(5);
    expect(result.map((i) => i.label)).toEqual([
      "Dashboard",
      "Resources",
      "Team",
      "Billing",
      "Settings",
    ]);
  });

  it("admin sees all items", () => {
    const result = filterNavItemsByRole(mockItems, "admin");
    expect(result).toHaveLength(5);
  });

  it("member sees items without role restriction (no Billing or Settings)", () => {
    const result = filterNavItemsByRole(mockItems, "member");
    expect(result).toHaveLength(3);
    expect(result.map((i) => i.label)).toEqual(["Dashboard", "Resources", "Team"]);
  });

  it("guest sees only items without role restriction", () => {
    const result = filterNavItemsByRole(mockItems, "guest");
    expect(result).toHaveLength(3);
    expect(result.map((i) => i.label)).toEqual(["Dashboard", "Resources", "Team"]);
  });

  it("preserves item order", () => {
    const result = filterNavItemsByRole(mockItems, "owner");
    const labels = result.map((i) => i.label);
    expect(labels[0]).toBe("Dashboard");
    expect(labels[labels.length - 1]).toBe("Settings");
  });

  it("items with no roles array are visible to all roles", () => {
    const items = [{ label: "Public", href: "/public", icon: {} as never }];
    expect(filterNavItemsByRole(items, "guest")).toHaveLength(1);
    expect(filterNavItemsByRole(items, "member")).toHaveLength(1);
  });
});
