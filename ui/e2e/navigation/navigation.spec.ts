import { expect, test } from "@playwright/test";
import { login } from "../helpers/auth";
import { ROUTES } from "../helpers/routes";
import { NavigationPage } from "./navigation-page";

const OWNER_EMAIL = "admin@enterprise.dev";
const ADMIN_EMAIL = "admin-role@enterprise.dev";
const MEMBER_EMAIL = "member@enterprise.dev";
const GUEST_EMAIL = "guest@enterprise.dev";
const PASSWORD = "password123";

test.describe("Navigation", () => {
  test.describe("Desktop sidebar", () => {
    test("owner sees full sidebar navigation", { tag: ["@critical"] }, async ({ page }) => {
      const navigationPage = new NavigationPage(page);

      await login(page, OWNER_EMAIL, PASSWORD);
      await navigationPage.gotoDashboard();

      await expect(navigationPage.sidebarLink("Dashboard")).toBeVisible();
      await expect(navigationPage.sidebarLink("Resources")).toBeVisible();
      await expect(navigationPage.sidebarLink("Team")).toBeVisible();
      await expect(navigationPage.sidebarLink("Billing")).toBeVisible();
      await expect(navigationPage.sidebarLink("Settings")).toBeVisible();
    });

    test("member sees role-gated sidebar links", { tag: ["@critical"] }, async ({ page }) => {
      const navigationPage = new NavigationPage(page);

      await login(page, MEMBER_EMAIL, PASSWORD);
      await navigationPage.gotoDashboard();

      await expect(navigationPage.sidebarLink("Dashboard")).toBeVisible();
      await expect(navigationPage.sidebarLink("Resources")).toBeVisible();
      await expect(navigationPage.sidebarLink("Team")).toBeVisible();
      await expect(navigationPage.sidebarLink("Billing")).toHaveCount(0);
      await expect(navigationPage.sidebarLink("Settings")).toHaveCount(0);
    });

    test("guest sees only public sidebar links", async ({ page }) => {
      const navigationPage = new NavigationPage(page);

      await login(page, GUEST_EMAIL, PASSWORD);
      await navigationPage.gotoDashboard();

      await expect(navigationPage.sidebarLink("Dashboard")).toBeVisible();
      await expect(navigationPage.sidebarLink("Resources")).toBeVisible();
      await expect(navigationPage.sidebarLink("Team")).toBeVisible();
      await expect(navigationPage.sidebarLink("Billing")).toHaveCount(0);
      await expect(navigationPage.sidebarLink("Settings")).toHaveCount(0);
    });

    test("sidebar links navigate to target routes", async ({ page }) => {
      const navigationPage = new NavigationPage(page);

      await login(page, OWNER_EMAIL, PASSWORD);
      await navigationPage.gotoDashboard();

      await navigationPage.sidebarLink("Resources").click();
      await expect(page).toHaveURL(new RegExp(ROUTES.resources.root));

      await navigationPage.sidebarLink("Team").click();
      await expect(page).toHaveURL(new RegExp(ROUTES.team));

      await navigationPage.sidebarLink("Billing").click();
      await expect(page).toHaveURL(new RegExp(ROUTES.billing));
    });
  });

  test.describe("Mobile bottom tab bar", () => {
    test.use({ viewport: { width: 375, height: 812 } });

    test("bottom tab bar is visible on mobile", { tag: ["@critical"] }, async ({ page }) => {
      const navigationPage = new NavigationPage(page);

      await login(page, OWNER_EMAIL, PASSWORD);
      await navigationPage.gotoDashboard();

      await navigationPage.expectBottomBarVisible();
      await expect(navigationPage.bottomTabItem("Dashboard")).toBeVisible();
      await expect(navigationPage.bottomTabItem("Resources")).toBeVisible();
      await expect(navigationPage.bottomTabItem("Team")).toBeVisible();
    });

    test("owner sees Billing item in bottom bar", async ({ page }) => {
      const navigationPage = new NavigationPage(page);

      await login(page, OWNER_EMAIL, PASSWORD);
      await navigationPage.gotoDashboard();

      await expect(navigationPage.bottomTabItem("Billing")).toBeVisible();
    });

    test("owner Billing bottom tab navigates to billing route", async ({ page }) => {
      const navigationPage = new NavigationPage(page);

      await login(page, OWNER_EMAIL, PASSWORD);
      await navigationPage.gotoDashboard();

      await navigationPage.bottomTabItem("Billing").click();
      await expect(page).toHaveURL(new RegExp(ROUTES.billing));
    });

    test("member hides Billing and Settings in mobile nav", { tag: ["@critical"] }, async ({
      page,
    }) => {
      const navigationPage = new NavigationPage(page);

      await login(page, MEMBER_EMAIL, PASSWORD);
      await navigationPage.gotoDashboard();

      await expect(navigationPage.bottomTabItem("Billing")).toHaveCount(0);
      await navigationPage.openMoreDrawer();
      await expect(page.getByTestId("bottom-tab-more-settings")).toHaveCount(0);
    });

    test("More drawer opens and shows owner actions", async ({ page }) => {
      const navigationPage = new NavigationPage(page);

      await login(page, OWNER_EMAIL, PASSWORD);
      await navigationPage.gotoDashboard();
      await navigationPage.openMoreDrawer();

      await expect(page.getByTestId("bottom-tab-more-settings")).toBeVisible();
      await expect(page.getByTestId("bottom-tab-more-sign-out")).toBeVisible();
      await expect(page.getByTestId("bottom-tab-tenant-info")).toBeVisible();
    });

    test("admin sees Settings action in More drawer", async ({ page }) => {
      const navigationPage = new NavigationPage(page);

      await login(page, ADMIN_EMAIL, PASSWORD);
      await navigationPage.gotoDashboard();
      await navigationPage.openMoreDrawer();

      await expect(page.getByTestId("bottom-tab-more-settings")).toBeVisible();
    });
  });

  test.describe("Auth pages", () => {
    test.use({ viewport: { width: 375, height: 812 } });

    test("bottom tab bar is hidden on auth pages", { tag: ["@critical"] }, async ({ page }) => {
      const navigationPage = new NavigationPage(page);

      await page.goto("/sign-in");
      await navigationPage.expectBottomBarHidden();

      await page.goto("/sign-up");
      await navigationPage.expectBottomBarHidden();
    });
  });

  test("bottom tab bar is hidden on desktop", { tag: ["@critical"] }, async ({ page }) => {
    const navigationPage = new NavigationPage(page);

    await login(page, OWNER_EMAIL, PASSWORD);
    await navigationPage.gotoDashboard();

    await navigationPage.expectBottomBarHidden();
  });
});
