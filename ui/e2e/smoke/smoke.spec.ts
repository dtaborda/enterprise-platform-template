import { test } from "@playwright/test";
import { SmokePage } from "./smoke-page";

test.describe("Smoke", () => {
  test("sign-in page renders the authentication form", async ({ page }) => {
    const smokePage = new SmokePage(page);

    await smokePage.gotoSignIn();
    await smokePage.expectSignInFormVisible();
  });

  test("login route redirects to sign-in", async ({ page }) => {
    const smokePage = new SmokePage(page);

    await smokePage.gotoLogin();
    await smokePage.expectOnSignInRoute();
    await smokePage.expectSignInFormVisible();
  });

  test("sign-up route renders starter registration form", async ({ page }) => {
    const smokePage = new SmokePage(page);

    await smokePage.gotoSignUp();
    await smokePage.expectSignUpFormVisible();
  });

  test("forgot-password route renders reset request form", async ({ page }) => {
    const smokePage = new SmokePage(page);

    await smokePage.gotoForgotPassword();
    await smokePage.expectForgotPasswordFormVisible();
  });

  test("dashboard settings redirects to sign-in for unauthenticated users", async ({ page }) => {
    const smokePage = new SmokePage(page);

    await smokePage.gotoDashboardSettings();
    await smokePage.expectOnSignInRoute();
  });
});
