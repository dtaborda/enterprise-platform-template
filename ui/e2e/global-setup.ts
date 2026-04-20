import { resolve } from "node:path";
import { fileURLToPath } from "node:url";

/**
 * Playwright global setup — runs once before all tests.
 *
 * Loads .env.local from the repository root so that E2E helpers (seed scripts,
 * auth helpers) can access Supabase credentials and other local env vars.
 *
 * In CI, these vars are set directly in the environment (no .env.local needed).
 * The `override: false` flag means existing env vars take precedence.
 */
export default async function globalSetup() {
  // process.loadEnvFile is available in Node 20.12+ / 22+
  // In older Node versions this is a no-op (env vars must be pre-set).
  if (typeof process.loadEnvFile === "function") {
    // ESM-compatible path resolution (no __dirname)
    const dir = fileURLToPath(new URL(".", import.meta.url));
    const envPath = resolve(dir, "../../.env.local");
    try {
      process.loadEnvFile(envPath);
    } catch {
      // .env.local may not exist in CI — that's fine, vars come from environment
    }
  }
}
