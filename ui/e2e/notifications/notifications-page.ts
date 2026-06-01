import { expect, type Page } from "@playwright/test";
import { ROUTES } from "../helpers/routes";

// ─── Notifications Page Object ─────────────────────────────────────────────────
//
// Covers two routes:
//   /notifications               → NotificationsPage
//   /settings/notifications      → NotificationPreferencesPage (nested class below)

export class NotificationsPage {
  constructor(private readonly page: Page) {}

  // ─── Navigation ────────────────────────────────────────────────────────────

  async goto(): Promise<void> {
    await this.page.goto(ROUTES.notifications);
    await this.page.waitForURL(new RegExp(ROUTES.notifications), { timeout: 10_000 });
  }

  async expectRedirectedToDashboard(): Promise<void> {
    await expect(this.page).toHaveURL(new RegExp(ROUTES.dashboard));
  }

  // ─── Page heading ──────────────────────────────────────────────────────────

  async expectHeadingVisible(): Promise<void> {
    await expect(
      this.page.getByRole("main").getByRole("heading", { name: "Notifications", exact: true }),
    ).toBeVisible();
  }

  // ─── Notification bell ─────────────────────────────────────────────────────

  /** Asserts the bell button is present in the header */
  async expectBellVisible(): Promise<void> {
    await expect(this.page.getByRole("link", { name: /Notifications/i }).first()).toBeVisible({
      timeout: 10_000,
    });
  }

  /** Asserts no bell link is rendered (guest guard) */
  async expectBellAbsent(): Promise<void> {
    // Bell renders as a ghost button wrapping a link. aria-label includes "Notifications".
    // Give a short timeout — absence checks are fast.
    await expect(
      this.page.getByRole("link", { name: /Notifications — \d+ unread|^Notifications$/i }),
    ).toHaveCount(0, { timeout: 5_000 });
  }

  /** Asserts bell shows a badge with at least one unread notification */
  async expectBellHasUnreadBadge(): Promise<void> {
    // The bell aria-label is "Notifications — N unread" when count > 0
    await expect(this.page.getByRole("link", { name: /Notifications — \d+ unread/i })).toBeVisible({
      timeout: 10_000,
    });
  }

  /** Clicks the notification bell link to navigate to /notifications */
  async clickBell(): Promise<void> {
    await this.page
      .getByRole("link", { name: /Notifications/i })
      .first()
      .click();
    await this.page.waitForURL(new RegExp(ROUTES.notifications), { timeout: 10_000 });
  }

  // ─── Notification list ─────────────────────────────────────────────────────

  /** Asserts at least one notification item is visible in the list */
  async expectNotificationListVisible(): Promise<void> {
    // Each notification item is a <button> with the notification title as text
    await expect(this.page.getByRole("main").locator("button[type='button']").first()).toBeVisible({
      timeout: 10_000,
    });
  }

  /** Returns true if the list contains a notification matching the given title text */
  async expectNotificationWithTitle(title: string): Promise<void> {
    await expect(this.page.getByText(title, { exact: false }).first()).toBeVisible({
      timeout: 10_000,
    });
  }

  /** Clicks the first unread notification item (has role="status" on its unread dot) */
  async clickFirstUnreadNotification(): Promise<void> {
    // Unread items have role="status" on the blue dot span.
    // The parent button is the clickable item.
    const unreadDot = this.page.locator('[role="status"]').first();
    // Click the ancestor button of the unread dot
    await unreadDot.locator("xpath=ancestor::button").first().click();
  }

  /** Asserts no unread dot is visible (all notifications are read) */
  async expectNoUnreadDots(): Promise<void> {
    await expect(this.page.locator('[role="status"]')).toHaveCount(0, { timeout: 10_000 });
  }

  /** Asserts at least one unread dot is visible */
  async expectUnreadDotVisible(): Promise<void> {
    await expect(this.page.locator('[role="status"]').first()).toBeVisible({ timeout: 10_000 });
  }

  /**
   * Asserts exactly n unread dots are visible.
   * Use instead of waitForTimeout after marking a notification as read —
   * this waits for the optimistic update to settle rather than a fixed delay.
   */
  async expectUnreadDotCount(n: number): Promise<void> {
    await expect(this.page.locator('[role="status"]')).toHaveCount(n, { timeout: 10_000 });
  }

  // ─── Mark all read ─────────────────────────────────────────────────────────

  async clickMarkAllAsRead(): Promise<void> {
    await this.page.getByRole("button", { name: /Mark \d+ as read|Mark all as read/i }).click();
  }

  async expectMarkAllReadButtonDisabled(): Promise<void> {
    await expect(this.page.getByRole("button", { name: /Mark all as read/i })).toBeDisabled({
      timeout: 10_000,
    });
  }

  // ─── Filters ───────────────────────────────────────────────────────────────

  async clickUnreadFilter(): Promise<void> {
    await this.page.getByRole("button", { name: "Unread", exact: true }).click();
  }

  async clickAllFilter(): Promise<void> {
    await this.page.getByRole("button", { name: "All", exact: true }).click();
  }

  async selectCategoryFilter(category: "All categories" | "Team" | "Billing"): Promise<void> {
    // The select trigger has placeholder text matching the category options
    await this.page.getByRole("combobox").click();
    await this.page.getByRole("option", { name: category, exact: true }).click();
  }

  // ─── Empty state ───────────────────────────────────────────────────────────

  async expectEmptyStateVisible(): Promise<void> {
    await expect(this.page.getByText("No notifications yet")).toBeVisible({ timeout: 10_000 });
  }

  async expectFilteredEmptyStateVisible(): Promise<void> {
    await expect(this.page.getByText("You're all caught up")).toBeVisible({ timeout: 10_000 });
  }
}

// ─── Notification Preferences Page Object ─────────────────────────────────────

export class NotificationPreferencesPage {
  constructor(private readonly page: Page) {}

  async goto(): Promise<void> {
    await this.page.goto(ROUTES.notificationPreferences);
    await this.page.waitForURL(new RegExp(ROUTES.notificationPreferences), { timeout: 10_000 });
  }

  async expectHeadingVisible(): Promise<void> {
    await expect(
      this.page
        .getByRole("main")
        .getByRole("heading", { name: "Notification preferences", exact: true }),
    ).toBeVisible({ timeout: 10_000 });
  }

  /** Toggle the email switch for a given notification label (e.g. "Plan upgrades") */
  async toggleEmailNotification(label: string): Promise<void> {
    const emailSwitch = this.page.getByRole("switch", {
      name: `${label} email notifications`,
    });
    await emailSwitch.click();
  }

  /** Toggle the in-app switch for a given notification label */
  async toggleInAppNotification(label: string): Promise<void> {
    const inAppSwitch = this.page.getByRole("switch", {
      name: `${label} in-app notifications`,
    });
    await inAppSwitch.click();
  }

  async clickSaveChanges(): Promise<void> {
    await this.page.getByRole("button", { name: "Save changes" }).click();
  }

  async expectSaveConfirmationVisible(): Promise<void> {
    await expect(this.page.getByText("Notification preferences updated")).toBeVisible({
      timeout: 10_000,
    });
  }
}
