import { expect, type Page } from "@playwright/test";
import { ROUTES } from "../helpers/routes";

export class BillingPage {
  constructor(private readonly page: Page) {}

  // ─── Navigation ────────────────────────────────────────────────────────────

  async goto(): Promise<void> {
    await this.page.goto(ROUTES.billing);
    await this.page.waitForURL(new RegExp(ROUTES.billing), { timeout: 10_000 });
  }

  async expectRedirectedToDashboard(): Promise<void> {
    await expect(this.page).toHaveURL(new RegExp(ROUTES.dashboard));
  }

  // ─── Page heading ──────────────────────────────────────────────────────────

  async expectHeadingVisible(): Promise<void> {
    await expect(
      this.page.getByRole("main").getByRole("heading", { name: "Billing", exact: true }),
    ).toBeVisible();
  }

  // ─── Plan card ─────────────────────────────────────────────────────────────

  async expectPlanCardVisible(): Promise<void> {
    // The card shows the plan name (e.g. "Pro") when a subscription exists,
    // or "Current plan" title when no subscription. Look for the card container.
    await expect(this.page.locator("[data-slot='card']").first()).toBeVisible();
  }

  // ─── Status badge ──────────────────────────────────────────────────────────

  async expectStatusBadge(label: string): Promise<void> {
    await expect(this.page.getByText(label, { exact: true }).first()).toBeVisible({
      timeout: 10_000,
    });
  }

  // ─── Plan comparison grid ─────────────────────────────────────────────────

  async expectPlanComparisonVisible(): Promise<void> {
    await expect(this.page.getByRole("heading", { name: "Plans" })).toBeVisible();
  }

  async getPlanCardCount(): Promise<number> {
    // Plan comparison cards each contain a "Current plan" badge or upgrade/downgrade button.
    // We count all cards inside the plans grid by looking for the plan name heading
    // (each plan card has a CardTitle with the plan name).
    const cards = this.page
      .getByText("Current plan")
      .or(this.page.getByRole("button", { name: /Upgrade|Downgrade|Subscribe|Current plan/i }));
    return cards.count();
  }

  async expectCurrentPlanHighlighted(): Promise<void> {
    // The current plan card shows a "Current plan" badge inside the comparison grid.
    await expect(this.page.getByText("Current plan").first()).toBeVisible();
  }

  async expectPlanComparisonAbsent(): Promise<void> {
    await expect(this.page.getByRole("heading", { name: "Plans" })).toHaveCount(0);
  }

  // ─── Plan change ──────────────────────────────────────────────────────────

  async clickUpgradePlan(planName: string): Promise<void> {
    // Find the plan card containing the plan name and click its Upgrade button
    const planSection = this.page.locator(`text=${planName}`).locator("..").locator("..");
    const upgradeBtn = planSection.getByRole("button", { name: /Upgrade|Subscribe/i });
    if ((await upgradeBtn.count()) > 0) {
      await upgradeBtn.click();
    } else {
      await this.page
        .getByRole("button", { name: /Upgrade/i })
        .first()
        .click();
    }
  }

  async expectChangePlanDialogVisible(): Promise<void> {
    await expect(this.page.getByRole("dialog")).toBeVisible();
    await expect(
      this.page.getByRole("heading", { name: /Upgrade|Downgrade|Change/i }),
    ).toBeVisible();
  }

  async confirmChangePlan(): Promise<void> {
    await expect(this.page.getByRole("dialog")).toBeVisible();
    await this.page.getByRole("button", { name: "Confirm" }).click();
  }

  async cancelChangePlanDialog(): Promise<void> {
    await expect(this.page.getByRole("dialog")).toBeVisible();
    await this.page.getByRole("button", { name: "Cancel" }).click();
  }

  // ─── Cancel subscription ──────────────────────────────────────────────────

  async clickCancelSubscription(): Promise<void> {
    await this.page.getByRole("button", { name: "Cancel subscription" }).click();
  }

  async expectCancelDialogVisible(): Promise<void> {
    await expect(this.page.getByRole("dialog")).toBeVisible();
    await expect(this.page.getByRole("heading", { name: "Cancel subscription?" })).toBeVisible();
  }

  async confirmCancelSubscription(): Promise<void> {
    await expect(this.page.getByRole("dialog")).toBeVisible();
    await this.page.getByRole("button", { name: "Yes, cancel" }).click();
  }

  async keepSubscription(): Promise<void> {
    await expect(this.page.getByRole("dialog")).toBeVisible();
    await this.page.getByRole("button", { name: "Keep subscription" }).click();
  }

  async expectCancelPendingBadge(): Promise<void> {
    await expect(this.page.getByText("Cancels at period end")).toBeVisible({ timeout: 10_000 });
  }

  // ─── Resume subscription ──────────────────────────────────────────────────

  async clickResumeSubscription(): Promise<void> {
    await this.page.getByRole("button", { name: "Resume subscription" }).click();
  }

  async expectResumeButtonVisible(): Promise<void> {
    await expect(this.page.getByRole("button", { name: "Resume subscription" })).toBeVisible();
  }

  async expectResumeButtonAbsent(): Promise<void> {
    await expect(this.page.getByRole("button", { name: "Resume subscription" })).toHaveCount(0);
  }

  // ─── Cancel/owner-only buttons ────────────────────────────────────────────

  async expectCancelButtonAbsent(): Promise<void> {
    await expect(this.page.getByRole("button", { name: "Cancel subscription" })).toHaveCount(0);
  }

  // ─── Manage payment ───────────────────────────────────────────────────────

  async clickManagePayment(): Promise<void> {
    await this.page.getByRole("button", { name: "Manage payment method" }).click();
  }

  async expectManagePaymentButtonVisible(): Promise<void> {
    await expect(this.page.getByRole("button", { name: "Manage payment method" })).toBeVisible();
  }

  // ─── Billing history table ────────────────────────────────────────────────

  async expectHistoryTableVisible(): Promise<void> {
    await expect(this.page.getByRole("heading", { name: "Billing history" })).toBeVisible();
  }

  async expectHistoryRowsPresent(): Promise<void> {
    await expect(this.page.getByRole("table")).toBeVisible();
    // Verify at least one data cell exists beyond the header
    await expect(this.page.getByRole("cell").first()).toBeVisible();
  }

  async expectHistoryEmpty(): Promise<void> {
    await expect(this.page.getByText("No billing events yet.")).toBeVisible();
  }

  async getPaginationButtonCount(): Promise<number> {
    const prev = this.page.getByRole("button", { name: "Previous" });
    const next = this.page.getByRole("button", { name: "Next" });
    return (await prev.count()) + (await next.count());
  }
}
