import { expect, type Page } from "@playwright/test";
import { ROUTES } from "../helpers/routes";

export class WorkspaceAdminPage {
  constructor(private readonly page: Page) {}

  // ─── Navigation ────────────────────────────────────────────────────────────

  async goto(): Promise<void> {
    await this.page.goto(ROUTES.settings);
    await this.page.waitForURL(new RegExp(ROUTES.settings), { timeout: 10_000 });
  }

  async expectRedirectedToDashboard(): Promise<void> {
    await expect(this.page).toHaveURL(new RegExp(ROUTES.dashboard));
  }

  async expectRedirectedToSignIn(): Promise<void> {
    await expect(this.page).toHaveURL(/\/sign-in/);
  }

  // ─── Headings / Page structure ─────────────────────────────────────────────

  async expectHeadingVisible(): Promise<void> {
    await expect(this.page.getByRole("heading", { name: "Settings" })).toBeVisible();
  }

  // ─── Tab navigation ───────────────────────────────────────────────────────

  async clickTab(name: string): Promise<void> {
    await this.page.getByTestId(`settings-tab-${name}`).click();
  }

  async expectTabActive(name: string): Promise<void> {
    await expect(this.page.getByTestId(`settings-tab-${name}`)).toHaveAttribute(
      "data-state",
      "active",
    );
  }

  async expectSecurityTabAbsent(): Promise<void> {
    await expect(this.page.getByTestId("settings-tab-security")).toHaveCount(0);
  }

  async expectSettingsUrlStable(): Promise<void> {
    await expect(this.page).toHaveURL(new RegExp(`^.*${ROUTES.settings}$`));
  }

  async expectSecondarySettingsSidebarAbsent(): Promise<void> {
    await expect(this.page.locator("main aside")).toHaveCount(0);
  }

  // ─── Profile section ───────────────────────────────────────────────────────

  async fillName(name: string): Promise<void> {
    const input = this.page.getByTestId("workspace-name-input");
    await input.clear();
    await input.fill(name);
  }

  async fillSlug(slug: string): Promise<void> {
    const input = this.page.getByTestId("workspace-slug-input");
    await input.clear();
    await input.fill(slug);
  }

  async saveProfile(): Promise<void> {
    await this.page.getByTestId("save-profile-button").click();
  }

  async expectSlugFieldAbsent(): Promise<void> {
    await expect(this.page.getByTestId("workspace-slug-input")).toHaveCount(0);
  }

  // ─── Slug dialog ───────────────────────────────────────────────────────────

  async confirmSlugDialog(): Promise<void> {
    await expect(this.page.getByRole("dialog")).toBeVisible();
    await this.page.getByTestId("slug-dialog-confirm").click();
  }

  async cancelSlugDialog(): Promise<void> {
    await expect(this.page.getByRole("dialog")).toBeVisible();
    await this.page.getByTestId("slug-dialog-cancel").click();
  }

  async expectSlugDialogVisible(): Promise<void> {
    await expect(this.page.getByRole("dialog")).toBeVisible();
    await expect(this.page.getByText("Change workspace slug?")).toBeVisible();
  }

  async expectSlugDialogAbsent(): Promise<void> {
    await expect(this.page.getByRole("dialog")).toHaveCount(0);
  }

  // ─── Logo upload ──────────────────────────────────────────────────────────

  async uploadLogo(filePath: string): Promise<void> {
    const fileInput = this.page.getByTestId("logo-file-input");
    await fileInput.setInputFiles(filePath);
  }

  async removeLogo(): Promise<void> {
    await this.page.getByTestId("remove-logo-button").click();
  }

  async expectLogoPreviewVisible(): Promise<void> {
    // After upload, the logo appears as an <img> within the logo card
    await expect(this.page.getByRole("img", { name: "Workspace logo" })).toBeVisible();
  }

  async expectLogoPreviewAbsent(): Promise<void> {
    await expect(this.page.getByRole("img", { name: "Workspace logo" })).toHaveCount(0);
  }

  // ─── Regional section ─────────────────────────────────────────────────────

  async selectTimezone(tz: string): Promise<void> {
    await this.page.getByTestId("timezone-select").click();
    await this.page.getByRole("option", { name: tz, exact: true }).click();
  }

  async selectLocale(locale: string): Promise<void> {
    await this.page.getByTestId("locale-select").click();
    await this.page.getByRole("option", { name: locale, exact: true }).click();
  }

  async saveRegional(): Promise<void> {
    await this.page.getByTestId("save-regional-button").click();
  }

  // ─── Security section ─────────────────────────────────────────────────────

  async toggleSecurity(): Promise<void> {
    await this.page.getByTestId("allow-admin-invites-switch").click();
  }

  async saveSecurity(): Promise<void> {
    await this.page.getByTestId("save-security-button").click();
  }

  async expectSecuritySectionAbsent(): Promise<void> {
    await expect(this.page.getByTestId("allow-admin-invites-switch")).toHaveCount(0);
    await expect(this.page.getByTestId("save-security-button")).toHaveCount(0);
  }

  // ─── Success feedback ─────────────────────────────────────────────────────

  async expectSuccessMessage(text: string): Promise<void> {
    await expect(this.page.getByText(text)).toBeVisible({ timeout: 10_000 });
  }

  async expectProfileSaved(): Promise<void> {
    await this.expectSuccessMessage("Profile updated successfully.");
  }

  async expectRegionalSaved(): Promise<void> {
    await this.expectSuccessMessage("Regional settings updated.");
  }

  async expectSecuritySaved(): Promise<void> {
    await this.expectSuccessMessage("Security settings saved.");
  }

  async expectSlugSaved(): Promise<void> {
    await this.expectSuccessMessage("Slug updated successfully.");
  }
}
