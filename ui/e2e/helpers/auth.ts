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

  const signInForm = page.locator("form").first();
  const submitButton = page.getByRole("button", { name: "Sign In" });

  // Wait for hydration: clicking too early can trigger native action="" submit.
  await signInForm.waitFor({ state: "visible", timeout: 15_000 });
  await submitButton.waitFor({ state: "visible", timeout: 15_000 });
  await submitButton.evaluate((button) => {
    return new Promise<void>((resolve, reject) => {
      const deadline = Date.now() + 15_000;

      const isHydrated = () => {
        const keys = Object.keys(button as object);
        return keys.some(
          (key) => key.startsWith("__reactProps$") || key.startsWith("__reactFiber$"),
        );
      };

      const check = () => {
        if (isHydrated()) {
          resolve();
          return;
        }

        if (Date.now() > deadline) {
          reject(new Error("Sign-in form did not hydrate within timeout"));
          return;
        }

        requestAnimationFrame(check);
      };

      check();
    });
  });

  for (let attempt = 0; attempt < 3; attempt += 1) {
    await page.getByLabel("Email").fill(email);
    await page.getByLabel("Password").fill(password);
    await submitButton.click();

    try {
      // Keep strict behavior: auth must redirect into dashboard route.
      await page.waitForURL(/\/dashboard/, { timeout: 10_000 });
      return;
    } catch {
      if (!page.url().includes("/sign-in")) {
        throw new Error("Login did not reach dashboard route after submit");
      }
    }
  }

  throw new Error("Login failed after hydration retries");
}
