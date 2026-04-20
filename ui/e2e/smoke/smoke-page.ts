import { expect, type Page } from "@playwright/test";

export class SmokePage {
  constructor(private readonly page: Page) {}

  async gotoSignIn(): Promise<void> {
    await this.page.goto("/sign-in");
  }

  async gotoLogin(): Promise<void> {
    await this.page.goto("/login");
  }

  async gotoSignUp(): Promise<void> {
    await this.page.goto("/sign-up");
  }

  async gotoForgotPassword(): Promise<void> {
    await this.page.goto("/forgot-password");
  }

  async gotoDashboardSettings(): Promise<void> {
    await this.page.goto("/dashboard/settings");
  }

  async expectSignInFormVisible(): Promise<void> {
    await expect(
      this.page.getByText("Enter your credentials to access the platform"),
    ).toBeVisible();
    await expect(this.page.getByLabel("Email")).toBeVisible();
    await expect(this.page.getByLabel("Password")).toBeVisible();
    await expect(this.page.getByRole("button", { name: "Sign In" })).toBeVisible();
  }

  async expectOnSignInRoute(): Promise<void> {
    await expect(this.page).toHaveURL(/\/sign-in(?:\?.*)?$/);
  }

  async expectSignUpFormVisible(): Promise<void> {
    await expect(
      this.page.getByText("Get started with the platform starter in minutes"),
    ).toBeVisible();
    await expect(this.page.getByLabel("Full name")).toBeVisible();
    await expect(this.page.getByLabel("Email")).toBeVisible();
    await expect(this.page.getByLabel("Password")).toBeVisible();
    await expect(this.page.getByRole("button", { name: "Create account" })).toBeVisible();
  }

  async expectForgotPasswordFormVisible(): Promise<void> {
    await expect(
      this.page.getByText("Request a password reset link for your account"),
    ).toBeVisible();
    await expect(this.page.getByLabel("Email")).toBeVisible();
    await expect(this.page.getByRole("button", { name: "Send reset link" })).toBeVisible();
  }
}
