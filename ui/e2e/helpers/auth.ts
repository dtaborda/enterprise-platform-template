import type { Page } from "@playwright/test";

/** Default test credentials from seed.sql */
const DEFAULT_EMAIL = "admin@enterprise.dev";
const DEFAULT_PASSWORD = "password123";

/**
 * Login to the app via the UI sign-in form.
 * Uses E2E_EMAIL/E2E_PASSWORD env vars, or falls back to seed.sql defaults.
 *
 * Waits for React hydration before interacting to avoid the browser performing
 * a native GET submit (which leaks credentials into the URL query string and
 * never actually authenticates).
 */
export async function login(
  page: Page,
  email = process.env["E2E_EMAIL"] ?? DEFAULT_EMAIL,
  password = process.env["E2E_PASSWORD"] ?? DEFAULT_PASSWORD,
) {
  await page.goto("/sign-in");

  // Wait for the form to be interactive (React hydration complete)
  await page
    .getByRole("button", { name: "Sign In" })
    .waitFor({ state: "visible", timeout: 15_000 });

  await page.getByLabel("Email").fill(email);
  await page.getByLabel("Password").fill(password);
  await page.getByRole("button", { name: "Sign In" }).click();

  // Wait for redirect — generous timeout for Server Action roundtrip
  await page.waitForURL(/\/dashboard/, { timeout: 30_000 });
}
