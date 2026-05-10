import { expect, test } from "@playwright/test";
import { login } from "../helpers/auth";
import { ROUTES } from "../helpers/routes";
import { SettingsPage } from "./settings-page";

test.describe("Settings", () => {
  test(`unauthenticated request to ${ROUTES.settings} redirects to sign-in`, async ({ page }) => {
    await page.goto(ROUTES.settings);

    await expect(page).toHaveURL(
      new RegExp(`/sign-in\\?redirectTo=${encodeURIComponent(ROUTES.settings)}`),
    );
  });

  test(`authenticated request to ${ROUTES.settings} shows Settings heading`, async ({ page }) => {
    const settingsPage = new SettingsPage(page);

    await login(page);
    await settingsPage.gotoSettings();

    await settingsPage.expectSettingsHeading();
  });

  test(`authenticated settings page at ${ROUTES.settings} shows Account and Workspace cards`, async ({
    page,
  }) => {
    const settingsPage = new SettingsPage(page);

    await login(page);
    await settingsPage.gotoSettings();

    await settingsPage.expectAccountCard();
    await settingsPage.expectWorkspaceCard();
  });

  test(`navigate from dashboard via sidebar to ${ROUTES.settings}`, async ({ page }) => {
    const settingsPage = new SettingsPage(page);

    await login(page);
    await page.getByRole("link", { name: "Settings" }).click();
    await expect(page).toHaveURL(new RegExp(`${ROUTES.settings}(?:\\?.*)?$`));

    await settingsPage.expectSettingsHeading();
  });
});
