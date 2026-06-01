import { expect, test } from "@playwright/test";
import { login } from "../helpers/auth";
import { ROUTES } from "../helpers/routes";
import { EXPECTED_DEFAULT_THEME } from "../helpers/theme";

/**
 * Theme E2E Tests — T4.10
 *
 * Tests:
 * - SSR emits data-theme matching brand default (no-flash, no hydration mismatch)
 * - Theme toggle button is visible in the dashboard header
 * - Theme toggle switches between modes (light ↔ dark)
 * - Theme preference persists via localStorage
 *
 * Note: The ThemeToggle is rendered in the dashboard header (requires auth).
 * The SSR data-theme checks are verifiable without auth (see layout.tsx).
 */

test.describe("Theme System", () => {
  /**
   * SSR no-flash — proves layout.tsx derives data-theme from brand.themeRef,
   * not a hard-coded literal.  RED: layout.tsx still has data-theme="dark".
   */
  test("SSR HTML contains brand-derived data-theme (no hard-coded literal)", async ({ page }) => {
    // Raw HTTP — no JS execution, proves SSR rendered the correct value.
    const response = await page.request.get("/sign-in");
    const html = await response.text();
    expect(html).toContain(`data-theme="${EXPECTED_DEFAULT_THEME}"`);
  });

  test("sign-in page data-theme matches brand default and is stable after hydration", async ({
    page,
  }) => {
    await page.goto("/sign-in");
    await page.waitForLoadState("networkidle");

    const htmlEl = page.locator("html");
    await expect(htmlEl).toHaveAttribute("data-theme", EXPECTED_DEFAULT_THEME);

    // Attribute must not flip after ~1 s (no-flash guarantee).
    await page.waitForTimeout(1000);
    await expect(htmlEl).toHaveAttribute("data-theme", EXPECTED_DEFAULT_THEME);
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
      await page.waitForURL(new RegExp(ROUTES.dashboard));
      // Clear localStorage so each test starts from the brand default theme.
      // This prevents prior test runs from leaking a stored preference.
      await page.evaluate(() => localStorage.clear());
      await page.reload();
      await page.waitForLoadState("networkidle");
    });

    test("theme toggle button is visible in dashboard header", async ({ page }) => {
      const toggleButton = page.getByRole("button", { name: "Toggle theme" });
      await expect(toggleButton).toBeVisible();
    });

    test("clicking theme toggle switches from default to opposite mode", async ({ page }) => {
      // Confirm we start at the brand default.
      await expect(page.locator("html")).toHaveAttribute("data-theme", EXPECTED_DEFAULT_THEME);

      const toggleButton = page.getByRole("button", { name: "Toggle theme" });
      await toggleButton.click();

      // After one click we are on the opposite mode.
      const opposite = EXPECTED_DEFAULT_THEME === "light" ? "dark" : "light";
      await expect(page.locator("html")).toHaveAttribute("data-theme", opposite);
    });

    test("clicking theme toggle twice returns to default mode", async ({ page }) => {
      const toggleButton = page.getByRole("button", { name: "Toggle theme" });

      // Toggle to opposite.
      await toggleButton.click();
      const opposite = EXPECTED_DEFAULT_THEME === "light" ? "dark" : "light";
      await expect(page.locator("html")).toHaveAttribute("data-theme", opposite);

      // Toggle back to default.
      await toggleButton.click();
      await expect(page.locator("html")).toHaveAttribute("data-theme", EXPECTED_DEFAULT_THEME);
    });

    test("theme preference persists to localStorage", async ({ page }) => {
      const toggleButton = page.getByRole("button", { name: "Toggle theme" });

      // Toggle once — localStorage must reflect the new (opposite) mode.
      await toggleButton.click();
      const opposite = EXPECTED_DEFAULT_THEME === "light" ? "dark" : "light";
      await expect(page.locator("html")).toHaveAttribute("data-theme", opposite);

      const storedTheme = await page.evaluate(() => localStorage.getItem("enterprise-theme-mode"));
      expect(storedTheme).toBe(opposite);
    });

    test("theme preference is restored from localStorage on navigation", async ({ page }) => {
      // Seed localStorage with the opposite theme.
      const opposite = EXPECTED_DEFAULT_THEME === "light" ? "dark" : "light";
      await page.evaluate((mode) => {
        localStorage.setItem("enterprise-theme-mode", mode);
      }, opposite);

      // Navigate to another dashboard page.
      await page.goto(ROUTES.settings);
      await page.waitForLoadState("networkidle");

      // data-theme should be restored from localStorage.
      await expect(page.locator("html")).toHaveAttribute("data-theme", opposite);
    });
  });
});
