import { existsSync } from "node:fs";
import { resolve } from "node:path";
import { loadEnvFile } from "node:process";

/**
 * Global setup for Playwright E2E tests.
 * Loads .env.local from the ui/ directory when available.
 */
export default async function globalSetup() {
  const envPath = resolve(import.meta.dirname, "../.env.local");

  if (!existsSync(envPath)) {
    console.warn(`[playwright] Optional env file not found: ${envPath}`);
    return;
  }

  loadEnvFile(envPath);
}
