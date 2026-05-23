import { expect, test } from "@playwright/test";
import { login } from "../helpers/auth";
import { ROUTES } from "../helpers/routes";

test.describe("Design System Consistency", () => {
  test.beforeEach(async ({ page }) => {
    await login(page);
  });

  const PROTECTED_PAGES = [
    { name: "dashboard", path: ROUTES.dashboard },
    { name: "team", path: ROUTES.team },
    { name: "resources", path: ROUTES.resources.root },
    { name: "billing", path: ROUTES.billing },
    { name: "settings", path: ROUTES.settings },
  ] as const;

  for (const { name, path } of PROTECTED_PAGES) {
    test(`${name} page has exactly one h1`, async ({ page }) => {
      await page.goto(path);
      await expect(page.locator("h1")).toHaveCount(1);
      await expect(page.locator("h1")).toBeVisible();
    });
  }
});
