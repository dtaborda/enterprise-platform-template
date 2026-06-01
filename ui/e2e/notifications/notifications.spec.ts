import { expect, test } from "@playwright/test";
import { login } from "../helpers/auth";
import { ROUTES } from "../helpers/routes";
import { supabaseRequest, updateRows } from "../helpers/supabase-rest";
import { NotificationPreferencesPage, NotificationsPage } from "./notifications-page";

// ─── Credentials ──────────────────────────────────────────────────────────────
//
// Roles and their seeded credentials (from supabase/seed.sql):
//   owner  → admin@enterprise.dev       / password123 (has billing_past_due + billing_plan_upgraded)
//   admin  → admin-role@enterprise.dev  / password123 (has team_invitation_accepted — read)
//   member → member@enterprise.dev      / password123 (has team_invited + team_role_changed — unread)
//   guest  → guest@enterprise.dev       / password123 (no notifications)

const OWNER_EMAIL = "admin@enterprise.dev";
const MEMBER_EMAIL = "member@enterprise.dev";
const GUEST_EMAIL = "guest@enterprise.dev";
const PASSWORD = "password123";

// ─── Tests ────────────────────────────────────────────────────────────────────

test.describe("Notifications", () => {
  // ─── Cross-describe isolation ─────────────────────────────────────────────
  // After every test:
  //   1. Reset the two seeded member notification rows back to unread=false.
  //   2. Delete any extra notifications created by other spec runs (e.g., the
  //      "team_role_changed" notifications emitted by team-management.spec tests
  //      when they change member@enterprise.dev's role). These accumulate across
  //      suite runs and skew the unread-dot count in subsequent tests.
  // Best-effort: teardown failures must not mask actual test outcomes.
  //
  // Seeded notification IDs for member@enterprise.dev:
  //   c0000001-0000-0000-0000-000000000001  (team_invited — unread)
  //   c0000001-0000-0000-0000-000000000005  (team_role_changed — unread)
  // All other seeded IDs (owner + admin user notifications) are left untouched.

  // All 5 seeded notification IDs (owner, admin, member) — nothing else should exist.
  const SEEDED_NOTIFICATION_IDS =
    "c0000001-0000-0000-0000-000000000001," +
    "c0000001-0000-0000-0000-000000000002," +
    "c0000001-0000-0000-0000-000000000003," +
    "c0000001-0000-0000-0000-000000000004," +
    "c0000001-0000-0000-0000-000000000005";

  // member@enterprise.dev user id (from seed.sql)
  const MEMBER_USER_ID = "b1b2c3d4-e5f6-7890-abcd-ef1234567890";

  test.afterEach(async () => {
    try {
      // 1. Reset seeded member notifications to unread
      await updateRows(
        "notifications",
        {
          id: `in.(c0000001-0000-0000-0000-000000000001,c0000001-0000-0000-0000-000000000005)`,
        },
        { is_read: false, read_at: null },
      );

      // 2. Delete any non-seeded notifications for the member (e.g., created
      //    by team-management tests that change the member's role)
      await supabaseRequest("notifications", {
        method: "DELETE",
        params: {
          user_id: `eq.${MEMBER_USER_ID}`,
          id: `not.in.(${SEEDED_NOTIFICATION_IDS})`,
        },
      });
    } catch (err) {
      // Log but do not rethrow — a teardown failure must not fail the test itself.
      // In CI the schema cache is always fresh; locally reload with:
      //   supabase db reset  OR  NOTIFY pgrst, 'reload schema';
      console.warn("[afterEach] notifications restore failed (schema cache?):", err);
    }
  });

  // ─── Bell visibility ─────────────────────────────────────────────────────

  test.describe("Notification bell", () => {
    test("user sees notification bell with unread badge", { tag: ["@critical"] }, async ({
      page,
    }) => {
      const notificationsPage = new NotificationsPage(page);

      await login(page, MEMBER_EMAIL, PASSWORD);

      // Member has 2 unread notifications: team_invited + team_role_changed
      await notificationsPage.expectBellHasUnreadBadge();
    });

    test("guest cannot see notification bell", { tag: ["@critical"] }, async ({ page }) => {
      const notificationsPage = new NotificationsPage(page);

      await login(page, GUEST_EMAIL, PASSWORD);

      // Guest has no bell — the component renders only if role !== "guest"
      await notificationsPage.expectBellAbsent();
    });
  });

  // ─── Notification center ──────────────────────────────────────────────────

  test.describe("Notification center", () => {
    test("user opens notification center via bell", { tag: ["@critical"] }, async ({ page }) => {
      const notificationsPage = new NotificationsPage(page);

      await login(page, MEMBER_EMAIL, PASSWORD);
      await notificationsPage.clickBell();

      await notificationsPage.expectHeadingVisible();
      await notificationsPage.expectNotificationListVisible();
    });

    test("user marks a notification as read", { tag: ["@critical"] }, async ({ page }) => {
      const notificationsPage = new NotificationsPage(page);

      await login(page, MEMBER_EMAIL, PASSWORD);
      await notificationsPage.goto();

      // Verify at least one unread dot is visible before clicking
      await notificationsPage.expectUnreadDotVisible();

      // Click the first unread notification to mark it as read
      await notificationsPage.clickFirstUnreadNotification();

      // Wait for the RSC router.refresh() round-trip to complete so the
      // component tree is stable before we assert the exact dot count.
      await page.waitForLoadState("networkidle");

      // After the optimistic update + server refresh the unread dot for that
      // item should be gone. Member has 2 unread → marking one leaves 1.
      await notificationsPage.expectUnreadDotCount(1);

      // Verify we remain on the notifications page (no unexpected navigation)
      await expect(page).toHaveURL(new RegExp(ROUTES.notifications));
    });

    test("user marks all notifications as read", async ({ page }) => {
      const notificationsPage = new NotificationsPage(page);

      await login(page, MEMBER_EMAIL, PASSWORD);
      await notificationsPage.goto();

      // Verify there are unread items before marking all
      await notificationsPage.expectUnreadDotVisible();

      // Click "Mark N as read" button and wait for router.refresh() to re-render
      await notificationsPage.clickMarkAllAsRead();
      await page.waitForLoadState("networkidle");

      // After marking all, unread dots should be gone from the list
      await notificationsPage.expectNoUnreadDots();
    });

    test("owner sees billing notifications", async ({ page }) => {
      const notificationsPage = new NotificationsPage(page);

      await login(page, OWNER_EMAIL, PASSWORD);
      await notificationsPage.goto();

      // Owner has billing_past_due (unread) and billing_plan_upgraded (read) from seed
      await notificationsPage.expectNotificationWithTitle("Your subscription is past due");
    });
  });

  // ─── Filters ──────────────────────────────────────────────────────────────

  test.describe("Filters", () => {
    test("user filters notifications by category — Team", async ({ page }) => {
      const notificationsPage = new NotificationsPage(page);

      await login(page, MEMBER_EMAIL, PASSWORD);
      await notificationsPage.goto();

      // Apply "Team" category filter
      await notificationsPage.selectCategoryFilter("Team");

      // URL should now include ?category=team
      await expect(page).toHaveURL(/category=team/);

      // Team notifications should be visible: "You were invited" and "Your role was changed"
      await notificationsPage.expectNotificationWithTitle(
        "You were invited to join Demo Workspace",
      );
    });

    test("user filters notifications by unread only", async ({ page }) => {
      const notificationsPage = new NotificationsPage(page);

      await login(page, MEMBER_EMAIL, PASSWORD);
      await notificationsPage.goto();

      // Click the "Unread" tab filter and wait for Server Component re-render
      await notificationsPage.clickUnreadFilter();
      await expect(page).toHaveURL(/tab=unread/);
      await page.waitForLoadState("networkidle");

      // Only unread notifications should be shown — both member unread items should appear
      await notificationsPage.expectNotificationWithTitle(
        "You were invited to join Demo Workspace",
      );
    });
  });

  // ─── Preferences ──────────────────────────────────────────────────────────

  test.describe("Notification preferences", () => {
    test("user configures notification preferences", async ({ page }) => {
      const prefsPage = new NotificationPreferencesPage(page);

      await login(page, MEMBER_EMAIL, PASSWORD);
      await prefsPage.goto();

      await prefsPage.expectHeadingVisible();

      // Toggle the "Plan upgrades" email notification switch and save
      await prefsPage.toggleEmailNotification("Plan upgrades");
      await prefsPage.clickSaveChanges();

      // Success confirmation message should appear
      await prefsPage.expectSaveConfirmationVisible();
    });
  });

  // ─── Guest access ─────────────────────────────────────────────────────────

  test.describe("Guest access", () => {
    test("guest is redirected from /notifications to /dashboard", { tag: ["@critical"] }, async ({
      page,
    }) => {
      const notificationsPage = new NotificationsPage(page);

      await login(page, GUEST_EMAIL, PASSWORD);

      // Attempt direct navigation — server redirects guest to /dashboard
      await page.goto(ROUTES.notifications);

      await notificationsPage.expectRedirectedToDashboard();
    });
  });

  // ─── Empty state ──────────────────────────────────────────────────────────

  test.describe("Empty state", () => {
    test("empty state renders correctly for user with no notifications", async ({ page }) => {
      const notificationsPage = new NotificationsPage(page);

      // admin-role@enterprise.dev has only one READ notification (team_invitation_accepted).
      // Applying the "Unread" filter will show the "You're all caught up" empty state.
      await login(page, "admin-role@enterprise.dev", PASSWORD);
      await notificationsPage.goto();

      // Filter to unread — admin has no unread notifications in seed.
      // Wait for the filter navigation (URL param change) to complete.
      await notificationsPage.clickUnreadFilter();
      await page.waitForURL(/tab=unread/, { timeout: 10_000 });
      await page.waitForLoadState("networkidle");

      await notificationsPage.expectFilteredEmptyStateVisible();
    });
  });
});
