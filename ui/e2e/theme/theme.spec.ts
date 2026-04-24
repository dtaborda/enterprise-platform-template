import { expect, test } from "@playwright/test";
import { login } from "../helpers/auth";

/**
 * Theme E2E Tests — T4.10
 *
 * Tests:
 * - Page loads with data-theme="dark" by default
 * - Theme toggle button is visible in the dashboard header
 * - Theme toggle switches to light mode (data-theme changes)
 * - Theme toggle switches back to dark
 * - Theme preference persists across navigation (localStorage)
 *
 * Note: The ThemeToggle is rendered in the dashboard header (requires auth).
 * The default data-theme check is verifiable without auth (see layout.tsx).
 */

test.describe("Theme System", () => {
  test("sign-in page loads with data-theme=dark by default", async ({ page }) => {
    await page.goto("/sign-in");

    const htmlElement = page.locator("html");
    await expect(htmlElement).toHaveAttribute("data-theme", "dark");
  });

  test("html element has suppressHydrationWarning (no mismatch errors)", async ({ page }) => {
    // Verify the page loads without Next.js hydration mismatch errors
    const errors: string[] = [];
    page.on("console", (msg) => {
      if (msg.type() === "error" && msg.text().includes("Hydration")) {
        errors.push(msg.text());
      }
    });

    await page.goto("/sign-in");
    await page.waitForLoadState("networkidle");

    // No hydration errors expected
    expect(errors).toHaveLength(0);
  });

  test.describe("Dashboard theme toggle (requires auth)", () => {
    test.beforeEach(async ({ page }) => {
      await login(page);
      await page.waitForURL(/\/dashboard/);
    });

    test("theme toggle button is visible in dashboard header", async ({ page }) => {
      const toggleButton = page.getByRole("button", { name: "Toggle theme" });
      await expect(toggleButton).toBeVisible();
    });

    test("clicking theme toggle switches from dark to light mode", async ({ page }) => {
      // Ensure we start in dark mode
      await expect(page.locator("html")).toHaveAttribute("data-theme", "dark");

      const toggleButton = page.getByRole("button", { name: "Toggle theme" });
      await toggleButton.click();

      await expect(page.locator("html")).toHaveAttribute("data-theme", "light");
    });

    test("clicking theme toggle again switches back to dark mode", async ({ page }) => {
      const toggleButton = page.getByRole("button", { name: "Toggle theme" });

      // Switch to light
      await toggleButton.click();
      await expect(page.locator("html")).toHaveAttribute("data-theme", "light");

      // Switch back to dark
      await toggleButton.click();
      await expect(page.locator("html")).toHaveAttribute("data-theme", "dark");
    });

    test("theme preference persists to localStorage", async ({ page }) => {
      const toggleButton = page.getByRole("button", { name: "Toggle theme" });

      // Switch to light mode
      await toggleButton.click();
      await expect(page.locator("html")).toHaveAttribute("data-theme", "light");

      // Verify localStorage was updated
      const storedTheme = await page.evaluate(() => localStorage.getItem("enterprise-theme-mode"));
      expect(storedTheme).toBe("light");
    });

    test("theme preference is restored from localStorage on navigation", async ({ page }) => {
      // Set localStorage to light before navigation
      await page.evaluate(() => {
        localStorage.setItem("enterprise-theme-mode", "light");
      });

      // Navigate to another dashboard page
      await page.goto("/dashboard/settings");
      await page.waitForLoadState("networkidle");

      // data-theme should be restored to light from localStorage
      await expect(page.locator("html")).toHaveAttribute("data-theme", "light");
    });
  });
});
