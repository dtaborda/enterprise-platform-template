import { expect, test } from "@playwright/test";
import { login } from "../helpers/auth";
import { SettingsPage } from "./settings-page";

test.describe("Settings", () => {
  test("unauthenticated request to /dashboard/settings redirects to sign-in", async ({ page }) => {
    await page.goto("/dashboard/settings");

    await expect(page).toHaveURL(/\/sign-in\?redirectTo=%2Fdashboard%2Fsettings/);
  });

  test("authenticated request to /dashboard/settings shows Settings heading", async ({ page }) => {
    const settingsPage = new SettingsPage(page);

    await login(page);
    await settingsPage.gotoSettings();

    await settingsPage.expectSettingsHeading();
  });

  test("authenticated settings page shows Account and Workspace cards", async ({ page }) => {
    const settingsPage = new SettingsPage(page);

    await login(page);
    await settingsPage.gotoSettings();

    await settingsPage.expectAccountCard();
    await settingsPage.expectWorkspaceCard();
  });

  test("navigate from dashboard via sidebar to settings", async ({ page }) => {
    const settingsPage = new SettingsPage(page);

    await login(page);
    await page.getByRole("link", { name: "Settings" }).click();
    await expect(page).toHaveURL(/\/dashboard\/settings(?:\?.*)?$/);

    await settingsPage.expectSettingsHeading();
  });
});
