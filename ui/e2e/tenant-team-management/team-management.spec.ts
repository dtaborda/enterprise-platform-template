import { randomUUID } from "node:crypto";
import { expect, test } from "@playwright/test";
import { login } from "../helpers/auth";
import { ROUTES } from "../helpers/routes";
import { deleteRows, seedRows, supabaseRequest, updateRows } from "../helpers/supabase-rest";
import { TeamManagementPage } from "./team-management-page";

// ─── Seed helpers ─────────────────────────────────────────────────────────────

const SEED_EMAIL_PREFIX = "e2e-team-member";
const SEED_INVITE_PREFIX = "e2e-invite";

async function getAdminContext(): Promise<{ id: string; tenantId: string }> {
  const profiles = await supabaseRequest<Array<{ id: string; tenant_id: string }>>("profiles", {
    params: { email: "eq.admin@enterprise.dev", select: "id,tenant_id", limit: "1" },
  });
  const [admin] = profiles;
  if (!admin?.id || !admin?.tenant_id) {
    throw new Error("Unable to resolve admin profile context");
  }
  return { id: admin.id, tenantId: admin.tenant_id };
}

async function seedTestInvitation(
  tenantId: string,
  adminId: string,
  email: string,
): Promise<{ id: string }> {
  const rows = await seedRows("tenant_invitations", [
    {
      tenant_id: tenantId,
      email,
      role: "member",
      token_hash: `test-token-${Date.now()}-${Math.random().toString(36).slice(2)}`,
      status: "pending",
      invited_by: adminId,
      expires_at: new Date(Date.now() + 72 * 60 * 60 * 1000).toISOString(),
    },
  ]);
  const [row] = rows;
  if (!row?.["id"] || typeof row["id"] !== "string") {
    throw new Error("Failed to seed invitation row");
  }
  return { id: row["id"] };
}

async function teardownTestInvitations(): Promise<void> {
  await deleteRows("tenant_invitations", { email: `like.${SEED_INVITE_PREFIX}%` });
}

async function teardownTestMembers(): Promise<void> {
  // Clean up any test member profiles created during E2E runs
  await deleteRows("profiles", { email: `like.${SEED_EMAIL_PREFIX}%` });
}

// ─── Tests ────────────────────────────────────────────────────────────────────

test.describe("Team Management", () => {
  test(`unauthenticated request to ${ROUTES.team} redirects to sign-in`, async ({ page }) => {
    const teamPage = new TeamManagementPage(page);
    await page.goto(ROUTES.team);
    await teamPage.expectRedirectedToSignIn();
  });

  test.describe("Admin flows (require running app + seeded DB)", () => {
    let adminContext: { id: string; tenantId: string };

    test.beforeAll(async () => {
      adminContext = await getAdminContext();
    });

    test.afterAll(async () => {
      await teardownTestInvitations();
      await teardownTestMembers();
    });

    test.afterEach(async () => {
      // Restore member@enterprise.dev role to its seeded value after every test,
      // even on failure — prevents role contamination across tests.
      // Best-effort: teardown failures must not mask actual test outcomes.
      try {
        await updateRows("profiles", { email: "eq.member@enterprise.dev" }, { role: "member" });
      } catch (err) {
        console.warn("[afterEach] team-management role restore failed:", err);
      }
    });

    test("admin can view team members list", async ({ page }) => {
      const teamPage = new TeamManagementPage(page);

      await login(page);
      await teamPage.goto();

      // Should see the members section
      await expect(page.getByRole("heading", { name: "Members" })).toBeVisible();
      // Admin user should be listed
      await teamPage.expectMemberInTable("admin@enterprise.dev");
    });

    test("admin can view pending invitations list", async ({ page }) => {
      const teamPage = new TeamManagementPage(page);
      const inviteEmail = `${SEED_INVITE_PREFIX}-view-${Date.now()}@example.com`;

      // Seed a pending invitation
      await seedTestInvitation(adminContext.tenantId, adminContext.id, inviteEmail);

      await login(page);
      await teamPage.goto();

      // Should see the invitations section
      await expect(page.getByRole("heading", { name: "Invitations" })).toBeVisible();
      await teamPage.expectInvitationInTable(inviteEmail);
    });

    test("admin can invite a new member", async ({ page }) => {
      const teamPage = new TeamManagementPage(page);
      const inviteEmail = `${SEED_INVITE_PREFIX}-new-${Date.now()}@example.com`;

      await login(page);
      await teamPage.goto();

      // Invite button should be visible for admin
      await teamPage.expectInviteButtonVisible();

      await teamPage.openInviteDialog();
      await teamPage.fillInviteForm(inviteEmail, "Member");
      await teamPage.submitInviteForm();

      // Dialog should close
      await expect(page.getByRole("dialog")).toHaveCount(0);

      // Force a fresh server render after the mutation instead of depending on
      // the in-place router.refresh() RSC re-render timing (cold-start can exceed 30 s).
      await teamPage.goto();

      // Invitation should now appear in the list
      await teamPage.expectInvitationInTable(inviteEmail);
    });

    test("admin can change a member's role", async ({ page }) => {
      const teamPage = new TeamManagementPage(page);

      await login(page);
      await teamPage.goto();

      // member@enterprise.dev has "member" role; change to "guest"
      await teamPage.openChangeRoleDialog("member@enterprise.dev");
      await teamPage.selectNewRole("Guest");
      await teamPage.submitChangeRole();

      // Dialog should close
      await expect(page.getByRole("dialog")).toHaveCount(0);

      // Force a fresh server render after the mutation instead of depending on
      // the in-place router.refresh() RSC re-render timing (flaky on warm-up runs).
      await teamPage.goto();

      // Role badge should now reflect the updated role in the member row.
      await expect(
        page
          .getByTestId("team-member-row")
          .filter({ hasText: "member@enterprise.dev" })
          .getByText("Guest"),
      ).toBeVisible({ timeout: 30_000 });
      // Role restoration handled by test.afterEach (PATCH profiles via service-role)
    });

    test("admin can remove a member", async ({ page }) => {
      const teamPage = new TeamManagementPage(page);
      const removeEmail = `${SEED_EMAIL_PREFIX}-remove-${Date.now()}@example.com`;

      // Seed a user profile to remove (use service role via REST helper)
      const userRows = await seedRows("profiles", [
        {
          id: randomUUID(),
          tenant_id: adminContext.tenantId,
          email: removeEmail,
          role: "member",
          name: "E2E Remove Test",
        },
      ]);
      const [userRow] = userRows;
      if (!userRow) {
        test.skip();
        return;
      }

      await login(page);
      await teamPage.goto();

      await teamPage.expectMemberInTable(removeEmail);
      await teamPage.openRemoveMemberDialog(removeEmail);
      await teamPage.confirmRemoveMember();

      // Dialog should close
      await expect(page.getByRole("dialog")).toHaveCount(0);

      // Force a fresh server render after the mutation instead of depending only
      // on the in-place router.refresh() timing from the client dialog.
      await teamPage.goto();

      // Member should no longer appear in table
      await teamPage.expectMemberNotInTable(removeEmail);
    });

    test("admin can cancel a pending invitation", async ({ page }) => {
      const teamPage = new TeamManagementPage(page);
      const inviteEmail = `${SEED_INVITE_PREFIX}-cancel-${Date.now()}@example.com`;

      await seedTestInvitation(adminContext.tenantId, adminContext.id, inviteEmail);

      await login(page);
      await teamPage.goto();

      await teamPage.expectInvitationInTable(inviteEmail);
      await teamPage.cancelInvitation(inviteEmail);

      // Force a fresh server render after the mutation instead of depending only
      // on the in-place router.refresh() timing from the client button.
      await teamPage.goto();

      // Use a lazy locator chain so Playwright re-queries the DOM on each
      // retry, surviving the router.refresh() RSC re-render.
      await expect(
        page.getByTestId("invitation-row").filter({ hasText: inviteEmail }).getByText("Revoked"),
      ).toBeVisible({ timeout: 30_000 });
    });

    test("admin can resend a pending invitation", async ({ page }) => {
      const teamPage = new TeamManagementPage(page);
      const inviteEmail = `${SEED_INVITE_PREFIX}-resend-${Date.now()}@example.com`;

      await seedTestInvitation(adminContext.tenantId, adminContext.id, inviteEmail);

      await login(page);
      await teamPage.goto();

      await teamPage.expectInvitationInTable(inviteEmail);

      const resendBtn = page
        .getByTestId("invitation-row")
        .filter({ hasText: inviteEmail })
        .getByTestId("resend-invitation-button");

      await resendBtn.click();

      // Minimal success signal: confirm the action fired (button enters pending state).
      await expect(resendBtn).toContainText("Sending");

      // Force a fresh server render after the mutation — do NOT wait for the in-place
      // router.refresh() RSC re-render, which stalls isPending until the cold RSC path
      // settles (can exceed 30 s and keeps the button stuck on "Sending…").
      await teamPage.goto();

      // Invitation should still be visible (resend does not revoke the invitation)
      await teamPage.expectInvitationInTable(inviteEmail);
    });
  });

  test.describe("Non-admin flows", () => {
    test("non-admin (member) cannot see invite button, change-role or remove actions", async ({
      page,
    }) => {
      const teamPage = new TeamManagementPage(page);

      // Login as member (not admin/owner)
      await login(page, "member@enterprise.dev", "password123");
      await teamPage.goto();

      // Invite button should NOT be present
      await teamPage.expectInviteButtonHidden();

      // Change role and remove buttons should NOT be present
      await teamPage.expectChangeRoleButtonsHidden();
      await expect(page.getByTestId("remove-member-button")).toHaveCount(0);
    });
  });
});
