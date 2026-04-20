import { defineConfig, devices } from "@playwright/test";

const isCI = !!process.env.CI;

export default defineConfig({
  globalSetup: "./ui/e2e/global-setup.ts",
  testDir: "./ui/e2e",
  timeout: 60_000,
  fullyParallel: false,
  forbidOnly: isCI,
  retries: isCI ? 2 : 0,
  workers: isCI ? 1 : undefined,
  reporter: isCI ? [["html"], ["github"]] : "html",
  use: {
    baseURL: "http://localhost:3100",
    trace: "on",
    screenshot: "on",
  },
  projects: [
    {
      name: "chromium",
      use: { ...devices["Desktop Chrome"] },
    },
  ],
  webServer: {
    command: "pnpm --filter @enterprise/web dev --port 3100",
    env: {
      ...process.env,
      NEXT_PUBLIC_SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL || "http://127.0.0.1:54321",
      NEXT_PUBLIC_SUPABASE_ANON_KEY: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "test-anon-key",
    },
    url: "http://localhost:3100",
    reuseExistingServer: false,
    timeout: 120_000,
  },
});
