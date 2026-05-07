import { expect, test } from "@playwright/test";
import { AuthPage } from "./auth-page";

const OWNER_EMAIL = "admin@enterprise.dev";
const OWNER_PASSWORD = "password123";

test.describe("Auth flows", () => {
  test("sign-in success with seeded valid credentials lands on /dashboard and shows signed-in user card", async ({
    page,
  }) => {
    const authPage = new AuthPage(page);

    await authPage.gotoSignIn();
    await authPage.signIn(OWNER_EMAIL, OWNER_PASSWORD);

    await authPage.expectOnDashboard();
    await authPage.expectDashboardFacts(OWNER_EMAIL, "owner");
  });

  test("sign-in failure with invalid credentials shows error banner and does not enter dashboard", async ({
    page,
  }) => {
    const authPage = new AuthPage(page);

    await authPage.gotoSignIn();
    await authPage.signIn(OWNER_EMAIL, "wrong-password");

    await authPage.expectOnSignIn();
    await expect(page.getByRole("heading", { name: "Dashboard" })).toHaveCount(0);
    await expect(page.getByText("Invalid email or password.")).toBeVisible();
  });

  test("sign-in with empty fields shows inline field errors", async ({ page }) => {
    const authPage = new AuthPage(page);

    await authPage.gotoSignIn();
    await authPage.submitEmptySignIn();

    await authPage.expectOnSignIn();
    await expect(page.getByRole("alert").first()).toBeVisible();
  });

  test("sign-in with redirectTo=/dashboard/settings lands on /dashboard/settings", async ({
    page,
  }) => {
    const authPage = new AuthPage(page);

    await authPage.gotoSignIn("/dashboard/settings");
    await authPage.signIn(OWNER_EMAIL, OWNER_PASSWORD);

    await authPage.expectOnDashboardSettings();
  });

  test("sign-out from authenticated UI returns to /sign-in", async ({ page }) => {
    const authPage = new AuthPage(page);

    await authPage.gotoSignIn();
    await authPage.signIn(OWNER_EMAIL, OWNER_PASSWORD);
    await authPage.expectOnDashboard();

    await authPage.signOut();
    await authPage.expectOnSignIn();
  });

  test("sign-up success with unique email redirects to /sign-in?registered=1 and shows success notice", async ({
    page,
  }) => {
    const authPage = new AuthPage(page);
    const email = `new-user-${Date.now()}@enterprise.dev`;

    await authPage.gotoSignUp();
    await authPage.signUp("New User", email, OWNER_PASSWORD);

    await authPage.expectOnSignIn();
    await authPage.expectRegistrationSuccessNotice();
  });

  test("sign-up validation failure (password < 8) stays on /sign-up and shows inline field error", async ({
    page,
  }) => {
    const authPage = new AuthPage(page);
    const email = `invalid-user-${Date.now()}@enterprise.dev`;

    await authPage.gotoSignUp();
    await authPage.signUpWithoutNativeValidation("Invalid User", email, "short");

    await expect(page).toHaveURL(/\/sign-up/);
    await expect(page.getByRole("alert").first()).toBeVisible();
  });

  test("forgot-password request with valid email redirects to /forgot-password?sent=1 and shows sent notice", async ({
    page,
  }) => {
    const authPage = new AuthPage(page);

    await authPage.gotoForgotPassword();
    await authPage.requestPasswordReset("reset@enterprise.dev");

    await expect(page).toHaveURL(/\/forgot-password\?sent=1/);
    await authPage.expectResetRequestSentNotice();
  });

  test("reset-password with mismatched passwords shows confirmPassword field error", async ({
    page,
  }) => {
    const authPage = new AuthPage(page);

    await page.goto("/reset-password");
    await authPage.submitMismatchedPasswords("password123", "different456");

    await expect(page).toHaveURL(/\/reset-password/);
    await expect(page.getByText("Passwords do not match")).toBeVisible();
  });

  test("authenticated dashboard access shows user email, role, and workspace facts", async ({
    page,
  }) => {
    const authPage = new AuthPage(page);

    await authPage.gotoSignIn();
    await authPage.signIn(OWNER_EMAIL, OWNER_PASSWORD);

    await authPage.expectDashboardFacts(OWNER_EMAIL, "owner");
  });

  test("authenticated settings access shows Account and Workspace cards", async ({ page }) => {
    const authPage = new AuthPage(page);

    await authPage.gotoSignIn();
    await authPage.signIn(OWNER_EMAIL, OWNER_PASSWORD);
    await authPage.goToSettingsFromMenu();

    await authPage.expectOnDashboardSettings();
    await authPage.expectSettingsCards();
  });

  test("unauthenticated access to protected route /dashboard/settings redirects to /sign-in?redirectTo=/dashboard/settings", async ({
    page,
  }) => {
    await page.goto("/dashboard/settings");

    await expect(page).toHaveURL(/\/sign-in\?redirectTo=%2Fdashboard%2Fsettings/);
  });
});
