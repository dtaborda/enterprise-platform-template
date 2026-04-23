import { expect, type Page } from "@playwright/test";

export class SettingsPage {
  constructor(private readonly page: Page) {}

  async gotoSettings(): Promise<void> {
    await this.page.goto("/dashboard/settings");
    await this.page.waitForURL(/\/dashboard\/settings(?:\?.*)?$/, { timeout: 10_000 });
  }

  async expectSettingsHeading(): Promise<void> {
    await expect(
      this.page.getByRole("main").getByRole("heading", { name: "Settings" }),
    ).toBeVisible();
  }

  async expectAccountCard(): Promise<void> {
    await expect(this.page.getByText("Account", { exact: true })).toBeVisible();
  }

  async expectWorkspaceCard(): Promise<void> {
    await expect(this.page.getByText("Workspace", { exact: true })).toBeVisible();
  }
}
