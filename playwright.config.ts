import { defineConfig, devices } from "@playwright/test";

const isCI = !!process.env["CI"];

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
  use: {
    baseURL: "http://localhost:3000",
    trace: isCI ? "retain-on-failure" : "on",
    screenshot: "on",
  },
  projects: [
    {
      name: "chromium",
      use: { ...devices["Desktop Chrome"] },
    },
  ],
  webServer: {
    // Always use production build for stable, fast E2E tests.
    // Run `pnpm build` before `pnpm e2e` if you haven't already.
    command: "pnpm --filter @enterprise/web start",
    url: "http://localhost:3000",
    reuseExistingServer: !isCI,
    timeout: 120_000,
  },
});
