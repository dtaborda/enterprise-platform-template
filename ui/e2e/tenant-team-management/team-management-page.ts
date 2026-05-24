import { expect, type Page } from "@playwright/test";
import { ROUTES } from "../helpers/routes";

export class TeamManagementPage {
  constructor(private readonly page: Page) {}

  async goto(): Promise<void> {
    await this.page.goto(ROUTES.team);
    await this.page.waitForURL(new RegExp(ROUTES.team));
  }

  // ─── Invite Member ─────────────────────────────────────────────────────────

  async openInviteDialog(): Promise<void> {
    await this.page.getByTestId("invite-member-button").click();
    await expect(this.page.getByRole("dialog")).toBeVisible();
  }

  async fillInviteForm(email: string, role = "member"): Promise<void> {
    await this.page.getByTestId("invite-email-input").fill(email);
    // Open role select and choose the role
    await this.page.getByTestId("invite-role-select").click();
    await this.page.getByRole("option", { name: role, exact: true }).click();
  }

  async submitInviteForm(): Promise<void> {
    const submitButton = this.page.getByTestId("invite-submit-button");
    await submitButton.click();
    await expect(submitButton).not.toContainText("Sending", { timeout: 30_000 });
  }

  // ─── Member Rows ───────────────────────────────────────────────────────────

  async expectMemberInTable(email: string): Promise<void> {
    await expect(this.page.getByRole("table").first()).toBeVisible({ timeout: 30_000 });
    await expect(this.page.getByTestId("team-member-row").filter({ hasText: email })).toBeVisible({
      timeout: 30_000,
    });
  }

  async getMemberRow(email: string) {
    return this.page.getByTestId("team-member-row").filter({ hasText: email });
  }

  // ─── Change Role ───────────────────────────────────────────────────────────

  async openChangeRoleDialog(memberEmail: string): Promise<void> {
    const row = await this.getMemberRow(memberEmail);
    await row.getByTestId("change-role-button").click();
    await expect(this.page.getByRole("dialog")).toBeVisible();
  }

  async selectNewRole(role: string): Promise<void> {
    await this.page.getByTestId("change-role-select").click();
    await this.page.getByRole("option", { name: role, exact: true }).click();
  }

  async submitChangeRole(): Promise<void> {
    await this.page.getByTestId("change-role-submit").click();
  }

  // ─── Remove Member ─────────────────────────────────────────────────────────

  async openRemoveMemberDialog(memberEmail: string): Promise<void> {
    const row = await this.getMemberRow(memberEmail);
    await row.getByTestId("remove-member-button").click();
    await expect(this.page.getByRole("dialog")).toBeVisible();
  }

  async confirmRemoveMember(): Promise<void> {
    await this.page.getByTestId("confirm-remove-member-button").click();
  }

  async expectMemberNotInTable(email: string): Promise<void> {
    await expect(this.page.getByTestId("team-member-row").filter({ hasText: email })).toHaveCount(
      0,
      { timeout: 30_000 },
    );
  }

  // ─── Invitation Rows ────────────────────────────────────────────────────────

  async expectInvitationInTable(email: string): Promise<void> {
    await expect(this.page.getByTestId("invitation-row").filter({ hasText: email })).toBeVisible({
      timeout: 30_000,
    });
  }

  async getInvitationRow(email: string) {
    return this.page.getByTestId("invitation-row").filter({ hasText: email });
  }

  async cancelInvitation(email: string): Promise<void> {
    const row = await this.getInvitationRow(email);
    await row.getByTestId("cancel-invitation-button").click();
  }

  async resendInvitation(email: string): Promise<void> {
    const row = await this.getInvitationRow(email);
    await row.getByTestId("resend-invitation-button").click();
  }

  // ─── Permission helpers ─────────────────────────────────────────────────────

  async expectInviteButtonVisible(): Promise<void> {
    await expect(this.page.getByTestId("invite-member-button")).toBeVisible();
  }

  async expectInviteButtonHidden(): Promise<void> {
    await expect(this.page.getByTestId("invite-member-button")).toHaveCount(0);
  }

  async expectChangeRoleButtonsVisible(): Promise<void> {
    // At least one change-role button should be visible for non-owner non-self members
    await expect(this.page.getByTestId("change-role-button").first()).toBeVisible();
  }

  async expectChangeRoleButtonsHidden(): Promise<void> {
    await expect(this.page.getByTestId("change-role-button")).toHaveCount(0);
  }

  async expectRedirectedToSignIn(): Promise<void> {
    await expect(this.page).toHaveURL(/\/sign-in/);
  }
}
