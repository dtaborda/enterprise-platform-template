import { expect, type Page } from "@playwright/test";
import { ROUTES } from "../helpers/routes";

/**
 * Page Object Model for the /onboarding route.
 *
 * Encapsulates all selectors and interactions for the onboarding checklist page.
 * Follows the project's POM convention: no test logic here — only reusable page actions.
 */
export class OnboardingPage {
  constructor(private readonly page: Page) {}

  // ─── Navigation ─────────────────────────────────────────────────────────────

  /**
   * Navigate to /onboarding and wait until the checklist card is visible.
   * Content-ready guard: prevents flaky selector misses on slow CI cold starts.
   */
  async goto(): Promise<void> {
    await this.page.goto(ROUTES.onboarding);
    await this.page.waitForURL(new RegExp(ROUTES.onboarding));
    await expect(this.page.getByTestId("onboarding-checklist")).toBeVisible({
      timeout: 30_000,
    });
  }

  // ─── Baseline setup form ────────────────────────────────────────────────────

  async fillBaselineForm(workspaceName: string, locale = "en-US"): Promise<void> {
    await this.page.getByTestId("baseline-name-input").fill(workspaceName);
    await this.page.getByTestId("baseline-locale-input").fill(locale);
  }

  async clearBaselineName(): Promise<void> {
    await this.page.getByTestId("baseline-name-input").clear();
  }

  async submitBaselineForm(): Promise<void> {
    await this.page.getByTestId("baseline-submit-button").click();
    // While pending the button reads "Saving…". On success the baseline form is
    // removed from the DOM; on error it returns to its idle label. Wait until the
    // pending button is gone in either case (a plain not.toContainText assertion
    // fails when the element is detached on success).
    await this.page
      .getByTestId("baseline-submit-button")
      .filter({ hasText: "Saving" })
      .waitFor({ state: "detached", timeout: 30_000 });
  }

  /**
   * Asserts that the baseline step is marked complete.
   * When complete, the form (and submit button) are hidden via `{!completed && children}`.
   */
  async expectBaselineStepCompleted(): Promise<void> {
    await expect(this.page.getByTestId("baseline-submit-button")).toHaveCount(0, {
      timeout: 30_000,
    });
  }

  async expectBaselineFormVisible(): Promise<void> {
    await expect(this.page.getByTestId("baseline-submit-button")).toBeVisible({
      timeout: 15_000,
    });
  }

  // ─── Invite step ────────────────────────────────────────────────────────────

  async openInviteDialog(): Promise<void> {
    await this.page.getByTestId("invite-step-trigger-button").click();
    await expect(this.page.getByRole("dialog")).toBeVisible({ timeout: 15_000 });
  }

  async fillInviteEmail(email: string): Promise<void> {
    await this.page.getByTestId("invite-email-input").fill(email);
  }

  async submitInviteForm(): Promise<void> {
    await this.page.getByTestId("invite-submit-button").click();
    // Pending label is "Sending…". On success the dialog/button is removed.
    await this.page
      .getByTestId("invite-submit-button")
      .filter({ hasText: "Sending" })
      .waitFor({ state: "detached", timeout: 30_000 });
  }

  /**
   * Asserts that the invite step is marked complete.
   * When complete, the invite trigger button is hidden.
   */
  async expectInviteStepCompleted(): Promise<void> {
    await expect(this.page.getByTestId("invite-step-trigger-button")).toHaveCount(0, {
      timeout: 30_000,
    });
  }

  // ─── Sample data step ────────────────────────────────────────────────────────

  async loadSampleData(): Promise<void> {
    await this.page.getByTestId("load-sample-data-button").click();
    // Pending label is "Loading…". On success the button is removed.
    await this.page
      .getByTestId("load-sample-data-button")
      .filter({ hasText: "Loading" })
      .waitFor({ state: "detached", timeout: 30_000 });
  }

  /**
   * Asserts that the sample data step is marked complete.
   * When complete, the load button is hidden.
   */
  async expectSampleDataStepCompleted(): Promise<void> {
    await expect(this.page.getByTestId("load-sample-data-button")).toHaveCount(0, {
      timeout: 30_000,
    });
  }

  // ─── Activation ─────────────────────────────────────────────────────────────

  async expectActivationBanner(): Promise<void> {
    await expect(this.page.getByText("Your workspace is ready")).toBeVisible({
      timeout: 30_000,
    });
  }

  async expectNoActivationBanner(): Promise<void> {
    await expect(this.page.getByText("Your workspace is ready")).toHaveCount(0);
  }

  // ─── Progress indicator ─────────────────────────────────────────────────────

  /**
   * Checks the `N/M` progress counter displayed in the checklist header.
   * Matches the exact text emitted by the `role="status"` span.
   */
  async expectProgressText(completed: number, total: number): Promise<void> {
    await expect(
      this.page.getByRole("status").filter({ hasText: `${completed}/${total}` }),
    ).toBeVisible({ timeout: 15_000 });
  }

  // ─── Dismiss dialog ─────────────────────────────────────────────────────────

  async openDismissDialog(): Promise<void> {
    await this.page.getByRole("button", { name: "Dismiss checklist" }).click();
    await expect(this.page.getByRole("dialog")).toBeVisible({ timeout: 15_000 });
  }

  async confirmDismiss(): Promise<void> {
    await this.page.getByTestId("dismiss-confirm-button").click();
  }

  // ─── Launcher chip ──────────────────────────────────────────────────────────

  async expectLauncherChipVisible(): Promise<void> {
    await expect(this.page.getByTestId("onboarding-launcher-chip")).toBeVisible({
      timeout: 15_000,
    });
  }

  async expectLauncherChipHidden(): Promise<void> {
    await expect(this.page.getByTestId("onboarding-launcher-chip")).toHaveCount(0, {
      timeout: 15_000,
    });
  }

  // ─── Redirect assertions ────────────────────────────────────────────────────

  async expectRedirectedToDashboard(): Promise<void> {
    await expect(this.page).toHaveURL(new RegExp(ROUTES.dashboard), { timeout: 15_000 });
  }

  async expectRedirectedToSignIn(): Promise<void> {
    await expect(this.page).toHaveURL(/\/sign-in/, { timeout: 15_000 });
  }
}
