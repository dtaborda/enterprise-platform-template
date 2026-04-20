import type { Page } from "@playwright/test";

/**
 * Sign in via the sign-in page with explicit credentials.
 */
export async function login(page: Page, email: string, password: string) {
  const { NEXT_PUBLIC_BASE_URL: baseUrlEnv } = process.env;
  const baseUrl = baseUrlEnv ?? "http://localhost:3000";

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
  const { E2E_USER_EMAIL: email, E2E_USER_PASSWORD: password } = process.env;

  if (!email || !password) {
    throw new Error("E2E_USER_EMAIL and E2E_USER_PASSWORD must be set in .env.local");
  }

  await login(page, email, password);
}
