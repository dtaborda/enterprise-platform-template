import { existsSync, readdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import { ROUTES } from "../lib/routes";

// __tests__/ is one level below ui/, so go up two levels to get ui/
const UI_DIR = join(dirname(fileURLToPath(import.meta.url)), "..");
const APP_DIR = join(UI_DIR, "app");

describe("Route Directory Structure", () => {
  it("ui/app/(protected)/ directory EXISTS", () => {
    const protectedDir = join(APP_DIR, "(protected)");
    expect(existsSync(protectedDir)).toBe(true);
  });

  it("ui/app/(dashboard)/ directory does NOT exist", () => {
    const dashboardDir = join(APP_DIR, "(dashboard)");
    expect(existsSync(dashboardDir)).toBe(false);
  });

  it("ui/app/(protected)/settings/ directory EXISTS", () => {
    const settingsDir = join(APP_DIR, "(protected)", "settings");
    expect(existsSync(settingsDir)).toBe(true);
  });

  it("ui/app/(protected)/team/ directory EXISTS", () => {
    const teamDir = join(APP_DIR, "(protected)", "team");
    expect(existsSync(teamDir)).toBe(true);
  });

  it("ui/app/(protected)/resources/ directory EXISTS", () => {
    const resourcesDir = join(APP_DIR, "(protected)", "resources");
    expect(existsSync(resourcesDir)).toBe(true);
  });

  it("ui/app/(protected)/dashboard/ contains ONLY page.tsx (no subdirs with page files)", () => {
    const dashboardDir = join(APP_DIR, "(protected)", "dashboard");
    expect(existsSync(dashboardDir)).toBe(true);

    // Check that there are no subdirectories containing page.tsx files
    function hasNestedPageFiles(dir: string): boolean {
      const entries = readdirSync(dir, { withFileTypes: true });
      for (const entry of entries) {
        if (entry.isDirectory()) {
          const subDir = join(dir, entry.name);
          const subEntries = readdirSync(subDir, { withFileTypes: true });
          // Check if this subdir has a page.tsx
          const hasPage = subEntries.some((e) => e.isFile() && e.name === "page.tsx");
          if (hasPage) return true;
          // Recurse
          if (hasNestedPageFiles(subDir)) return true;
        }
      }
      return false;
    }

    const hasFeatureNested = hasNestedPageFiles(dashboardDir);
    expect(hasFeatureNested).toBe(false);
  });
});

describe("ROUTES constant (route-structure integration)", () => {
  it("ROUTES contains all required keys (no undefined)", () => {
    expect(ROUTES.dashboard).toBeDefined();
    expect(ROUTES.settings).toBeDefined();
    expect(ROUTES.team).toBeDefined();
    expect(ROUTES.resources).toBeDefined();
    expect(ROUTES.resources.root).toBeDefined();
    expect(ROUTES.resources.new).toBeDefined();
  });

  it("typeof ROUTES.resources.detail equals function", () => {
    expect(typeof ROUTES.resources.detail).toBe("function");
  });

  it("ROUTES.settings does NOT start with /dashboard", () => {
    expect(ROUTES.settings.startsWith("/dashboard")).toBe(false);
  });

  it("ROUTES.team does NOT start with /dashboard", () => {
    expect(ROUTES.team.startsWith("/dashboard")).toBe(false);
  });

  it("ROUTES.resources.root does NOT start with /dashboard", () => {
    expect(ROUTES.resources.root.startsWith("/dashboard")).toBe(false);
  });
});
