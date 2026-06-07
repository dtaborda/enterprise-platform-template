import { expect, test } from "@playwright/test";
import { login } from "../helpers/auth";
import { ROUTES } from "../helpers/routes";
import { deleteRows, supabaseRequest, updateRows } from "../helpers/supabase-rest";
import { OnboardingPage } from "./onboarding-page";

// ─── Constants ────────────────────────────────────────────────────────────────

/** Deterministic owner user ID from seed.sql (admin@enterprise.dev). */
const ADMIN_USER_ID = "a1b2c3d4-e5f6-7890-abcd-ef1234567890";

/** Prefix for E2E invite emails — used for targeted teardown. */
const E2E_INVITE_PREFIX = "e2e-onboarding-invite";

// ─── Setup helpers ────────────────────────────────────────────────────────────

async function getAdminTenantId(): Promise<string> {
  const rows = await supabaseRequest<Array<{ tenant_id: string }>>("profiles", {
    params: { id: `eq.${ADMIN_USER_ID}`, select: "tenant_id", limit: "1" },
  });
  const [profile] = rows;
  if (!profile?.tenant_id) throw new Error("Unable to resolve admin tenant_id from profiles");
  return profile.tenant_id;
}

/**
 * Reset the admin tenant's onboarding progress to a known, consistent state.
 * Uses the service-role key (bypasses RLS). Safe only in E2E setup/teardown.
 *
 * - "not_started": all steps null, no activation
 * - "in_progress":  baseline done, value steps pending, not activated
 */
async function resetOnboarding(
  tenantId: string,
  state: "not_started" | "in_progress" = "not_started",
): Promise<void> {
  const baselineCompletedAt =
    state === "in_progress" ? new Date(Date.now() - 10 * 60 * 1000).toISOString() : null;

  await updateRows(
    "tenant_onboarding_progress",
    { tenant_id: `eq.${tenantId}` },
    {
      state,
      baseline_completed_at: baselineCompletedAt,
      first_invite_completed_at: null,
      sample_data_completed_at: null,
      dismissed: false,
      dismissed_at: null,
      activated_at: null,
    },
  );
}

/** Remove E2E invite rows created during the activation flow serial suite. */
async function teardownInvites(): Promise<void> {
  try {
    await deleteRows("tenant_invitations", { email: `like.${E2E_INVITE_PREFIX}%` });
  } catch (err) {
    console.warn("[teardown] onboarding E2E invite cleanup failed:", err);
  }
}

// ─── Auth guard ───────────────────────────────────────────────────────────────

test.describe("Tenant Onboarding — auth guard", () => {
  test(`unauthenticated visit to ${ROUTES.onboarding} redirects to sign-in`, {
    tag: ["@critical", "@e2e", "@onboarding", "@ONBOARDING-E2E-001"],
  }, async ({ page }) => {
    const onboarding = new OnboardingPage(page);
    await page.goto(ROUTES.onboarding);
    await onboarding.expectRedirectedToSignIn();
  });
});

// ─── Access control and RLS ───────────────────────────────────────────────────

test.describe("Tenant Onboarding — access control and RLS", () => {
  test("non-owner (member) accessing /onboarding is redirected to /dashboard", {
    tag: ["@critical", "@e2e", "@onboarding", "@ONBOARDING-E2E-002"],
  }, async ({ page }) => {
    // member@enterprise.dev is in the admin tenant but has role=member (not owner).
    // The page server component enforces owner-only; non-owners redirect to dashboard.
    const onboarding = new OnboardingPage(page);
    await login(page, "member@enterprise.dev", "password123");
    await page.goto(ROUTES.onboarding);
    await onboarding.expectRedirectedToDashboard();
  });

  test("non-owner does not see launcher chip — cross-tenant / role RLS isolation", {
    tag: ["@high", "@e2e", "@onboarding", "@ONBOARDING-E2E-003"],
  }, async ({ page }) => {
    // The launcher chip is rendered server-side in the layout only for owners.
    // A member-role JWT must not trigger the chip query; chip must be absent from DOM.
    const onboarding = new OnboardingPage(page);
    await login(page, "member@enterprise.dev", "password123");
    // login() lands on dashboard — chip must not be visible in the shell.
    await onboarding.expectLauncherChipHidden();
  });
});

// ─── Owner activation flow (stateful serial) ─────────────────────────────────

test.describe
  .serial("Tenant Onboarding — owner activation flow", () => {
    let tenantId: string;
    // Unique email per run avoids conflicts with DB-persisted invitations from prior E2E runs.
    const inviteEmail = `${E2E_INVITE_PREFIX}-${Date.now()}@example.com`;

    test.beforeAll(async () => {
      tenantId = await getAdminTenantId();
      await resetOnboarding(tenantId, "not_started");
    });

    test.afterAll(async () => {
      // Restore to not_started so subsequent runs and other suites start clean.
      await resetOnboarding(tenantId, "not_started");
      await teardownInvites();
    });

    test("checklist renders in not_started state — 0/3 progress, no activation banner", {
      tag: ["@high", "@e2e", "@onboarding", "@ONBOARDING-E2E-004"],
    }, async ({ page }) => {
      const onboarding = new OnboardingPage(page);
      await login(page);
      await onboarding.goto();
      await onboarding.expectProgressText(0, 3);
      await onboarding.expectNoActivationBanner();
      await onboarding.expectBaselineFormVisible();
    });

    test("owner completes baseline setup step — progress increments to 1/3", {
      tag: ["@critical", "@e2e", "@onboarding", "@ONBOARDING-E2E-005"],
    }, async ({ page }) => {
      const onboarding = new OnboardingPage(page);
      await login(page);
      await onboarding.goto();
      await onboarding.fillBaselineForm("E2E Demo Workspace", "en-US");
      await onboarding.submitBaselineForm();
      await onboarding.expectBaselineStepCompleted();
      await onboarding.expectProgressText(1, 3);
      // Activation must NOT fire yet — baseline alone does not satisfy criteria.
      await onboarding.expectNoActivationBanner();
    });

    test("owner completes first-invite step via onboarding checklist", {
      tag: ["@critical", "@e2e", "@onboarding", "@ONBOARDING-E2E-006"],
    }, async ({ page }) => {
      const onboarding = new OnboardingPage(page);
      await login(page);
      await onboarding.goto();
      await onboarding.openInviteDialog();
      await onboarding.fillInviteEmail(inviteEmail);
      await onboarding.submitInviteForm();
      await onboarding.expectInviteStepCompleted();
    });

    test("activation banner shown after baseline + first-invite (value step criteria met)", {
      tag: ["@critical", "@e2e", "@onboarding", "@ONBOARDING-E2E-007"],
    }, async ({ page }) => {
      const onboarding = new OnboardingPage(page);
      await login(page);
      await onboarding.goto();
      // baseline + first-invite satisfies: mandatory baseline AND ≥1 value step.
      await onboarding.expectActivationBanner();
    });

    test("launcher chip is hidden in dashboard shell after workspace is activated", {
      tag: ["@high", "@e2e", "@onboarding", "@ONBOARDING-E2E-008"],
    }, async ({ page }) => {
      const onboarding = new OnboardingPage(page);
      await login(page);
      await page.goto(ROUTES.dashboard);
      // Chip must not render for tenants in activated state.
      await onboarding.expectLauncherChipHidden();
    });
  });

// ─── Dismiss and resume (stateful serial) ─────────────────────────────────────

test.describe
  .serial("Tenant Onboarding — dismiss and resume", () => {
    let tenantId: string;

    test.beforeAll(async () => {
      tenantId = await getAdminTenantId();
      // Start at in_progress: baseline complete, value steps pending, not dismissed.
      await resetOnboarding(tenantId, "in_progress");
    });

    test.afterAll(async () => {
      await resetOnboarding(tenantId, "not_started");
    });

    test("partial checklist (in_progress) preserves state across navigations", {
      tag: ["@high", "@e2e", "@onboarding", "@ONBOARDING-E2E-009"],
    }, async ({ page }) => {
      const onboarding = new OnboardingPage(page);
      await login(page);
      await onboarding.goto();
      // Baseline step is complete (1/3); value steps are pending.
      await onboarding.expectProgressText(1, 3);
      await onboarding.expectBaselineStepCompleted();
      await onboarding.expectNoActivationBanner();
      // Navigate away and return — server-side progress must be unchanged.
      await page.goto(ROUTES.dashboard);
      await onboarding.goto();
      await onboarding.expectProgressText(1, 3);
    });

    test("owner dismisses checklist — redirected to dashboard with launcher chip visible", {
      tag: ["@high", "@e2e", "@onboarding", "@ONBOARDING-E2E-010"],
    }, async ({ page }) => {
      const onboarding = new OnboardingPage(page);
      await login(page);
      await onboarding.goto();
      await onboarding.openDismissDialog();
      await onboarding.confirmDismiss();
      // DismissDialog calls router.push(ROUTES.dashboard) on confirm.
      await onboarding.expectRedirectedToDashboard();
      // Chip must appear in the shell for in_progress dismissed tenants.
      await onboarding.expectLauncherChipVisible();
    });

    test("clicking launcher chip reopens checklist with preserved progress (1/3)", {
      tag: ["@high", "@e2e", "@onboarding", "@ONBOARDING-E2E-011"],
    }, async ({ page }) => {
      const onboarding = new OnboardingPage(page);
      await login(page);
      // Previous serial test set dismissed=true — chip must be visible on fresh load.
      await page.goto(ROUTES.dashboard);
      await onboarding.expectLauncherChipVisible();
      // Click chip — navigates to /onboarding (standard anchor link, not router.push).
      await page.getByTestId("onboarding-launcher-chip").click();
      await expect(page).toHaveURL(new RegExp(ROUTES.onboarding), { timeout: 15_000 });
      // State must be preserved: 1/3 progress, baseline done.
      await onboarding.expectProgressText(1, 3);
    });
  });
