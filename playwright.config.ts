import { defineConfig, devices } from "@playwright/test";

const isCI = !!process.env["CI"];
const e2eAppUrl = process.env["E2E_APP_URL"] ?? "http://localhost:3000";

export default defineConfig({
  // Load .env.local before any tests run (needed for seed scripts in E2E helpers)
  globalSetup: "./ui/e2e/global-setup.ts",
  testDir: "./ui/e2e",
  timeout: 60_000,
  fullyParallel: false,
  forbidOnly: isCI,
  retries: isCI ? 2 : 0,
  workers: isCI ? 1 : undefined,
  reporter: isCI ? [["html"], ["github"]] : "html",
  expect: {
    // Default 5 s is too tight in CI (Server Components + cold DB round-trips).
    timeout: 15_000,
  },
  use: {
    baseURL: "http://localhost:3000",
    trace: isCI ? "retain-on-failure" : "on",
    screenshot: "on",
  },
  projects: [
    {
      name: "chromium",
      use: {
        ...devices["Desktop Chrome"],
        // Deny all device permissions by default.
        // Features that need camera/mic/location should create a separate project
        // with explicit grants (e.g., for QR scanner tests).
        permissions: [],
      },
    },
  ],
  webServer: {
    // Local runs use `next dev` so E2E validates latest code without manual rebuilds.
    // CI keeps `next start` for production-like verification.
    command: isCI ? "pnpm --filter @enterprise/web start" : "pnpm --filter @enterprise/web dev",
    url: "http://localhost:3000",
    reuseExistingServer: !isCI,
    timeout: 120_000,
    env: {
      ...process.env,
      NEXT_PUBLIC_APP_URL: e2eAppUrl,
      NEXT_PUBLIC_SITE_URL: e2eAppUrl,
      APP_URL: e2eAppUrl,
      ALLOW_LOCALHOST_APP_URL_IN_PRODUCTION: "true",
    },
  },
});
