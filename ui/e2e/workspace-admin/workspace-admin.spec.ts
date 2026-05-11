import * as fs from "node:fs";
import * as os from "node:os";
import * as path from "node:path";
import { expect, test } from "@playwright/test";
import { AuthPage } from "../auth/auth-page";
import { login } from "../helpers/auth";
import { ROUTES } from "../helpers/routes";
import { WorkspaceAdminPage } from "./workspace-admin-page";

// ─── Credentials ──────────────────────────────────────────────────────────────
//
// Roles and their seeded credentials (from supabase/seed.sql):
//   owner  → admin@enterprise.dev       / password123
//   admin  → admin-role@enterprise.dev  / password123
//   member → member@enterprise.dev      / password123
//   guest  → guest@enterprise.dev       / password123

const OWNER_EMAIL = "admin@enterprise.dev";
const ADMIN_EMAIL = "admin-role@enterprise.dev";
const MEMBER_EMAIL = "member@enterprise.dev";
const GUEST_EMAIL = "guest@enterprise.dev";
const PASSWORD = "password123";

// ─── Fixtures ─────────────────────────────────────────────────────────────────

/**
 * Creates a minimal valid PNG file in a temp directory.
 * Returns the absolute path to the file.
 * Caller is responsible for cleanup.
 */
function createTempPng(): string {
  // Minimal 1×1 pixel transparent PNG (89 bytes)
  const PNG_1X1 = Buffer.from(
    "89504e470d0a1a0a0000000d49484452000000010000000108060000001f15c489" +
      "0000000a49444154789c6260000000020001e221bc330000000049454e44ae426082",
    "hex",
  );
  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "e2e-logo-"));
  const filePath = path.join(tmpDir, "test-logo.png");
  fs.writeFileSync(filePath, PNG_1X1);
  return filePath;
}

// ─── Tests ────────────────────────────────────────────────────────────────────

test.describe("Workspace Admin Settings", () => {
  // ─── Owner flows ────────────────────────────────────────────────────────────

  test.describe("Owner flows", () => {
    test("owner updates workspace name", { tag: ["@critical"] }, async ({ page }) => {
      const settingsPage = new WorkspaceAdminPage(page);
      const newName = `E2E Workspace ${Date.now()}`;

      await login(page, OWNER_EMAIL, PASSWORD);
      await settingsPage.goto();

      await settingsPage.fillName(newName);
      await settingsPage.saveProfile();

      await settingsPage.expectProfileSaved();
      // Name should appear in the heading area after revalidation
      await expect(page.getByTestId("workspace-name-input")).toHaveValue(newName);
    });

    test("owner changes slug with confirmation dialog", { tag: ["@critical"] }, async ({
      page,
    }) => {
      const settingsPage = new WorkspaceAdminPage(page);
      // Use a valid slug that won't conflict with existing ones
      const newSlug = `e2e-slug-${Date.now()}`;

      await login(page, OWNER_EMAIL, PASSWORD);
      await settingsPage.goto();

      await settingsPage.fillSlug(newSlug);
      await settingsPage.saveProfile();

      // Confirmation dialog must appear
      await settingsPage.expectSlugDialogVisible();

      // Confirm the change
      await settingsPage.confirmSlugDialog();

      await settingsPage.expectSlugSaved();

      // Restore original slug so subsequent test runs work correctly
      await settingsPage.fillSlug("enterprise-demo");
      await settingsPage.saveProfile();
      await settingsPage.expectSlugDialogVisible();
      await settingsPage.confirmSlugDialog();
      await settingsPage.expectSlugSaved();
    });

    test("owner cancels slug change", async ({ page }) => {
      const settingsPage = new WorkspaceAdminPage(page);
      const newSlug = `e2e-cancel-${Date.now()}`;

      await login(page, OWNER_EMAIL, PASSWORD);
      await settingsPage.goto();

      // Capture current slug value before attempting change
      const currentSlug = await page.getByTestId("workspace-slug-input").inputValue();

      await settingsPage.fillSlug(newSlug);
      await settingsPage.saveProfile();

      // Dialog appears — cancel it
      await settingsPage.expectSlugDialogVisible();
      await settingsPage.cancelSlugDialog();

      // Dialog dismissed
      await settingsPage.expectSlugDialogAbsent();

      // Slug field should still hold the original value (no change persisted)
      await expect(page.getByTestId("workspace-slug-input")).toHaveValue(currentSlug);
    });

    test("owner uploads PNG logo", async ({ page }) => {
      const settingsPage = new WorkspaceAdminPage(page);
      const tempPng = createTempPng();

      try {
        await login(page, OWNER_EMAIL, PASSWORD);
        await settingsPage.goto();

        await settingsPage.uploadLogo(tempPng);

        // After upload the logo preview image should become visible
        await settingsPage.expectLogoPreviewVisible();
      } finally {
        fs.rmSync(path.dirname(tempPng), { recursive: true, force: true });
      }
    });

    test("owner disables admin invites toggle saves", async ({ page }) => {
      const settingsPage = new WorkspaceAdminPage(page);

      await login(page, OWNER_EMAIL, PASSWORD);
      await settingsPage.goto();

      // Toggle the switch to change the current value
      await settingsPage.toggleSecurity();
      await settingsPage.saveSecurity();

      await settingsPage.expectSecuritySaved();

      // Toggle back to restore original state for subsequent test runs
      await settingsPage.toggleSecurity();
      await settingsPage.saveSecurity();
      await settingsPage.expectSecuritySaved();
    });
  });

  // ─── Admin flows ────────────────────────────────────────────────────────────

  test.describe("Admin flows", () => {
    test("admin updates timezone", async ({ page }) => {
      const settingsPage = new WorkspaceAdminPage(page);

      await login(page, ADMIN_EMAIL, PASSWORD);
      await settingsPage.goto();

      await settingsPage.selectTimezone("America/New_York");
      await settingsPage.saveRegional();

      await settingsPage.expectRegionalSaved();

      // Restore to UTC
      await settingsPage.selectTimezone("UTC");
      await settingsPage.saveRegional();
      await settingsPage.expectRegionalSaved();
    });

    test("admin cannot see slug input — DOM absent", { tag: ["@critical"] }, async ({ page }) => {
      const settingsPage = new WorkspaceAdminPage(page);

      await login(page, ADMIN_EMAIL, PASSWORD);
      await settingsPage.goto();

      // Slug field must NOT be in the DOM at all (not just hidden/disabled)
      await settingsPage.expectSlugFieldAbsent();
    });

    test("admin cannot see security section — DOM absent", { tag: ["@critical"] }, async ({
      page,
    }) => {
      const settingsPage = new WorkspaceAdminPage(page);

      await login(page, ADMIN_EMAIL, PASSWORD);
      await settingsPage.goto();

      // Security section must NOT be in the DOM at all
      await settingsPage.expectSecuritySectionAbsent();
    });
  });

  // ─── Authorization / redirect flows ─────────────────────────────────────────

  test.describe("Authorization", () => {
    test("member navigates to /settings → redirected to /dashboard", {
      tag: ["@critical"],
    }, async ({ page }) => {
      const settingsPage = new WorkspaceAdminPage(page);

      await login(page, MEMBER_EMAIL, PASSWORD);
      await page.goto(ROUTES.settings);

      await settingsPage.expectRedirectedToDashboard();
    });

    test("guest navigates to /settings → redirected to /dashboard", async ({ page }) => {
      const authPage = new AuthPage(page);
      const settingsPage = new WorkspaceAdminPage(page);

      await authPage.gotoSignIn();
      await authPage.signIn(GUEST_EMAIL, PASSWORD);
      await page.goto(ROUTES.settings);

      await settingsPage.expectRedirectedToDashboard();
    });

    test(`unauthenticated request to ${ROUTES.settings} redirects to sign-in`, async ({ page }) => {
      await page.goto(ROUTES.settings);
      await expect(page).toHaveURL(
        new RegExp(`/sign-in\\?redirectTo=${encodeURIComponent(ROUTES.settings)}`),
      );
    });
  });
});
