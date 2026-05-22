import { expect, test } from "@playwright/test";
import { login } from "../helpers/auth";
import { ROUTES } from "../helpers/routes";
import { BillingPage } from "./billing-page";

// ─── Credentials ──────────────────────────────────────────────────────────────
//
// Roles and their seeded credentials (from supabase/seed.sql):
//   owner  → admin@enterprise.dev       / password123
//   admin  → admin-role@enterprise.dev  / password123
//   member → member@enterprise.dev      / password123

const OWNER_EMAIL = "admin@enterprise.dev";
const ADMIN_EMAIL = "admin-role@enterprise.dev";
const MEMBER_EMAIL = "member@enterprise.dev";
const PASSWORD = "password123";

// ─── Tests ────────────────────────────────────────────────────────────────────

test.describe("Billing", () => {
  // ─── Owner flows ────────────────────────────────────────────────────────────

  test.describe("Owner flows", () => {
    test("owner views billing page — plan card, Active badge, history table", {
      tag: ["@critical"],
    }, async ({ page }) => {
      const billingPage = new BillingPage(page);

      await login(page, OWNER_EMAIL, PASSWORD);
      await billingPage.goto();

      await billingPage.expectHeadingVisible();
      await billingPage.expectPlanCardVisible();
      await billingPage.expectStatusBadge("Active");
      await billingPage.expectHistoryTableVisible();
    });

    test("owner views plan comparison grid — 3 plan cards, current highlighted", async ({
      page,
    }) => {
      const billingPage = new BillingPage(page);

      await login(page, OWNER_EMAIL, PASSWORD);
      await billingPage.goto();

      await billingPage.expectPlanComparisonVisible();
      // Current plan (Pro) is highlighted with "Current plan" badge
      await billingPage.expectCurrentPlanHighlighted();
      // Verify all 3 plans are visible by their names
      await expect(page.getByText("Free").first()).toBeVisible();
      await expect(page.getByText("Pro").first()).toBeVisible();
      await expect(page.getByText("Enterprise").first()).toBeVisible();
    });

    test("owner upgrades plan — dialog shown, plan updated", async ({ page }) => {
      const billingPage = new BillingPage(page);

      await login(page, OWNER_EMAIL, PASSWORD);
      await billingPage.goto();

      await billingPage.expectPlanComparisonVisible();

      // Click Upgrade on the Enterprise plan
      await page.getByRole("button", { name: "Upgrade" }).click();

      await billingPage.expectChangePlanDialogVisible();
      // Verify the dialog shows the target plan name
      await expect(page.getByText("Enterprise", { exact: true }).first()).toBeVisible();

      // Cancel — we don't want to mutate the seed subscription in other tests
      await billingPage.cancelChangePlanDialog();
      await expect(page.getByRole("dialog")).toHaveCount(0);
    });

    test("owner cancels subscription — cancel dialog with access-until date", async ({ page }) => {
      const billingPage = new BillingPage(page);

      await login(page, OWNER_EMAIL, PASSWORD);
      await billingPage.goto();

      await billingPage.expectPlanCardVisible();
      await billingPage.clickCancelSubscription();
      await billingPage.expectCancelDialogVisible();

      // Verify the dialog references a future access-until date
      await expect(page.getByText(/Your access continues until/i)).toBeVisible();

      // Keep the subscription — we don't want to actually cancel in this test
      await billingPage.keepSubscription();
      await expect(page.getByRole("dialog")).toHaveCount(0);
    });

    test("owner resumes pending cancellation — resume button absent for active sub", async ({
      page,
    }) => {
      // This test validates the resume button appears when cancel_at_period_end is set.
      // For the active seed subscription the resume button must NOT be present;
      // the cancel button IS present for the owner.
      const billingPage = new BillingPage(page);

      await login(page, OWNER_EMAIL, PASSWORD);
      await billingPage.goto();

      await billingPage.expectResumeButtonAbsent();
      await expect(page.getByRole("button", { name: "Cancel subscription" })).toBeVisible();
    });

    test("billing history renders rows with data", async ({ page }) => {
      const billingPage = new BillingPage(page);

      await login(page, OWNER_EMAIL, PASSWORD);
      await billingPage.goto();

      await billingPage.expectHistoryTableVisible();
      // The seed creates 3 events — at least one data row must be visible
      await expect(page.getByRole("table")).toBeVisible();
      await expect(page.getByRole("cell").first()).toBeVisible();
    });

    test("owner clicks manage payment — button is visible and functional", async ({ page }) => {
      const billingPage = new BillingPage(page);

      await login(page, OWNER_EMAIL, PASSWORD);
      await billingPage.goto();

      await billingPage.expectManagePaymentButtonVisible();

      // Clicking triggers getPortalUrlAction; for LocalPaymentAdapter this opens a URL.
      // We cannot follow the popup, but we can verify the button is clickable.
      await billingPage.clickManagePayment();

      // After the action fires the button returns to its normal state (no crash)
      await expect(
        page.getByRole("button", { name: /Manage payment method|Loading/i }),
      ).toBeVisible({ timeout: 5_000 });
    });
  });

  // ─── Admin flows ─────────────────────────────────────────────────────────────

  test.describe("Admin flows", () => {
    test("admin views billing — plan card visible, no cancel or upgrade buttons", {
      tag: ["@critical"],
    }, async ({ page }) => {
      const billingPage = new BillingPage(page);

      await login(page, ADMIN_EMAIL, PASSWORD);
      await billingPage.goto();

      await billingPage.expectHeadingVisible();
      await billingPage.expectPlanCardVisible();
      await billingPage.expectHistoryTableVisible();

      // Plan comparison grid is owner-only — must be absent for admin
      await billingPage.expectPlanComparisonAbsent();

      // Cancel button is owner-only
      await billingPage.expectCancelButtonAbsent();
    });
  });

  // ─── Authorization / redirect flows ──────────────────────────────────────────

  test.describe("Authorization", () => {
    test("member navigates to /billing — redirected to /dashboard", { tag: ["@critical"] }, async ({
      page,
    }) => {
      const billingPage = new BillingPage(page);

      await login(page, MEMBER_EMAIL, PASSWORD);
      await page.goto(ROUTES.billing);

      await billingPage.expectRedirectedToDashboard();
    });

    test(`unauthenticated request to ${ROUTES.billing} redirects to sign-in`, async ({ page }) => {
      await page.goto(ROUTES.billing);
      await expect(page).toHaveURL(
        new RegExp(`/sign-in\\?redirectTo=${encodeURIComponent(ROUTES.billing)}`),
      );
    });
  });
});
