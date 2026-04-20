import type { Page } from "@playwright/test";

/**
 * Sign in via the sign-in page with explicit credentials.
 */
export async function login(page: Page, email: string, password: string) {
  const baseUrl = process.env["NEXT_PUBLIC_BASE_URL"] ?? "http://localhost:3000";

  await page.goto(`${baseUrl}/sign-in`);
  await page.getByLabel("Email").fill(email);
  await page.getByLabel("Password").fill(password);
  await page.getByRole("button", { name: "Sign In" }).click();
  await page.waitForURL("**/dashboard**");
}

/**
 * Convenience helper that reads credentials from environment variables.
 */
export async function signIn(page: Page) {
  const email = process.env["E2E_USER_EMAIL"];
  const password = process.env["E2E_USER_PASSWORD"];

  if (!email || !password) {
    throw new Error("E2E_USER_EMAIL and E2E_USER_PASSWORD must be set in .env.local");
  }

  await login(page, email, password);
}
