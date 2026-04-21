import { expect, test } from "@playwright/test";
import { clearMailbox, getPasswordResetLink } from "../helpers/inbucket";
import { AuthPage } from "./auth-page";

const RESET_ACCOUNTS = ["reset@enterprise.dev", "reset2@enterprise.dev"] as const;

function resolveResetAccount(retry: number): string {
  return RESET_ACCOUNTS[Math.min(retry, RESET_ACCOUNTS.length - 1)] ?? RESET_ACCOUNTS[0];
}

async function clearMailboxSafely(email: string): Promise<void> {
  try {
    await clearMailbox(email);
  } catch {
    // Keep tests resilient if mailbox deletion endpoint is not available.
  }
}

async function completeRecoveryNavigation(
  page: import("@playwright/test").Page,
  resetLink: string,
): Promise<void> {
  let recoveryCode: string | null = null;

  try {
    const parsedResetLink = new URL(resetLink);

    if (parsedResetLink.pathname.startsWith("/auth/v1/verify")) {
      const verifyResponse = await fetch(resetLink, {
        redirect: "manual",
      });
      const location = verifyResponse.headers.get("location");

      if (location) {
        const redirectedUrl = new URL(location);
        recoveryCode = redirectedUrl.searchParams.get("code");
      }
    }
  } catch {
    // Fallback to browser navigation below.
  }

  if (recoveryCode) {
    await page.goto(`/auth/callback?code=${encodeURIComponent(recoveryCode)}&next=/reset-password`);
    return;
  }

  await page.goto(resetLink);
}

test.describe("Password reset recovery", () => {
  test("forgot-password with Inbucket polling retrieves reset email and opens reset link to /reset-password", async ({
    page,
  }, testInfo) => {
    const authPage = new AuthPage(page);
    const resetEmail = resolveResetAccount(testInfo.retry);

    await clearMailboxSafely(resetEmail);
    await authPage.gotoForgotPassword();
    await authPage.requestPasswordReset(resetEmail);
    await expect(page).toHaveURL(/\/forgot-password\?sent=1/);

    const resetLink = await getPasswordResetLink(resetEmail);
    expect(resetLink).toMatch(/\/auth\/(v1\/verify|callback)/);

    await completeRecoveryNavigation(page, resetLink);
    await expect(page).toHaveURL(/\/reset-password(?:\?.*)?$/);
  });

  test("reset-password completion from recovery flow redirects to /sign-in?passwordUpdated=1 and allows login with new password", async ({
    page,
  }, testInfo) => {
    const authPage = new AuthPage(page);
    const resetEmail = resolveResetAccount(testInfo.retry);
    const newPassword = `newpassword-${Date.now()}-A1`;

    await clearMailboxSafely(resetEmail);
    await authPage.gotoForgotPassword();
    await authPage.requestPasswordReset(resetEmail);
    await expect(page).toHaveURL(/\/forgot-password\?sent=1/);

    const resetLink = await getPasswordResetLink(resetEmail);
    await completeRecoveryNavigation(page, resetLink);
    await expect(page).toHaveURL(/\/reset-password(?:\?.*)?$/);

    await authPage.completePasswordReset(newPassword);
    await expect(page).toHaveURL(/\/sign-in\?passwordUpdated=1/);
    await authPage.expectPasswordUpdatedNotice();

    await authPage.signIn(resetEmail, newPassword);
    await authPage.expectOnDashboard();
  });
});
