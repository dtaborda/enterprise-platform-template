import { expect, type Page } from "@playwright/test";

export class AuthPage {
  constructor(private readonly page: Page) {}

  async gotoSignIn(redirectTo?: string): Promise<void> {
    const suffix = redirectTo ? `?redirectTo=${encodeURIComponent(redirectTo)}` : "";
    await this.page.goto(`/sign-in${suffix}`);
  }

  async gotoSignUp(): Promise<void> {
    await this.page.goto("/sign-up");
  }

  async gotoForgotPassword(): Promise<void> {
    await this.page.goto("/forgot-password");
  }

  async signIn(email: string, password: string): Promise<void> {
    await this.page.getByLabel("Email").fill(email);
    await this.page.getByLabel("Password").fill(password);
    await this.page.getByRole("button", { name: "Sign In" }).click();
  }

  async signUp(name: string, email: string, password: string): Promise<void> {
    await this.page.getByLabel("Full name").fill(name);
    await this.page.getByLabel("Email").fill(email);
    await this.page.getByLabel("Password").fill(password);
    await this.page.getByRole("button", { name: "Create account" }).click();
  }

  async signUpWithoutNativeValidation(
    name: string,
    email: string,
    password: string,
  ): Promise<void> {
    await this.page.getByLabel("Full name").fill(name);
    await this.page.getByLabel("Email").fill(email);
    await this.page.getByLabel("Password").fill(password);
    await this.page.locator("form").evaluate((form) => {
      (form as HTMLFormElement).submit();
    });
  }

  async requestPasswordReset(email: string): Promise<void> {
    await this.page.getByLabel("Email").fill(email);
    await this.page.getByRole("button", { name: "Send reset link" }).click();
  }

  async completePasswordReset(password: string): Promise<void> {
    await this.page.getByLabel("New password").fill(password);
    await this.page.getByLabel("Confirm password").fill(password);
    await this.page.getByRole("button", { name: "Update password" }).click();
  }

  async openUserMenu(): Promise<void> {
    await this.page.locator("header button.rounded-full:visible").click();
  }

  async signOut(): Promise<void> {
    await this.openUserMenu();
    await this.page.getByRole("menuitem", { name: "Sign Out" }).click();
  }

  async goToSettingsFromMenu(): Promise<void> {
    await this.openUserMenu();
    await this.page.getByRole("menuitem", { name: "Settings" }).click();
  }

  async expectOnSignIn(): Promise<void> {
    await expect(this.page).toHaveURL(/\/sign-in(?:\?.*)?$/);
  }

  async expectOnDashboard(): Promise<void> {
    await expect(this.page).toHaveURL(/\/dashboard(?:\?.*)?$/);
  }

  async expectOnDashboardSettings(): Promise<void> {
    await expect(this.page).toHaveURL(/\/dashboard\/settings(?:\?.*)?$/);
  }

  async expectRegistrationSuccessNotice(): Promise<void> {
    await expect(
      this.page.getByText("Your account was created. You can sign in now."),
    ).toBeVisible();
  }

  async expectResetRequestSentNotice(): Promise<void> {
    await expect(
      this.page.getByText(
        "If the account exists, a reset link has been sent to the provided email.",
      ),
    ).toBeVisible();
  }

  async expectPasswordUpdatedNotice(): Promise<void> {
    await expect(
      this.page.getByText("Your password was updated. Sign in with your new password."),
    ).toBeVisible();
  }

  async expectDashboardFacts(email: string, role: string): Promise<void> {
    await expect(
      this.page.getByRole("main").getByRole("heading", { name: "Dashboard" }),
    ).toBeVisible();
    await expect(this.page.getByText("Signed-in account")).toBeVisible();
    await expect(this.page.getByText(email)).toBeVisible();
    await expect(this.page.getByText("Role")).toBeVisible();
    await expect(this.page.getByText(role)).toBeVisible();
    await expect(this.page.getByText("Workspace")).toBeVisible();
  }

  async expectSettingsCards(): Promise<void> {
    await expect(
      this.page.getByRole("main").getByRole("heading", { name: "Settings" }),
    ).toBeVisible();
    await expect(this.page.getByText("Account", { exact: true })).toBeVisible();
    await expect(this.page.getByText("Workspace", { exact: true })).toBeVisible();
  }
}
