import { resolve } from "node:path";
import { fileURLToPath } from "node:url";

interface WaitForHttpOptions {
  timeoutMs?: number;
  intervalMs?: number;
}

async function waitForHttp(url: string, options?: WaitForHttpOptions): Promise<void> {
  const timeoutMs = options?.timeoutMs ?? 30_000;
  const intervalMs = options?.intervalMs ?? 1_000;
  const startedAt = Date.now();

  while (Date.now() - startedAt <= timeoutMs) {
    try {
      const response = await fetch(url, {
        method: "GET",
      });

      if (response.ok) {
        return;
      }
    } catch {
      // Ignore and retry until timeout.
    }

    await new Promise((resolvePromise) => {
      setTimeout(resolvePromise, intervalMs);
    });
  }

  throw new Error(`Timed out waiting for HTTP readiness: ${url} (${timeoutMs}ms)`);
}

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

  // Default matches the inbucket port in supabase/config.toml (55334).
  // Override with INBUCKET_URL env var if using a different port.
  const inbucketBaseUrl = process.env["INBUCKET_URL"] ?? "http://localhost:55334";
  await waitForHttp(inbucketBaseUrl, {
    timeoutMs: 30_000,
    intervalMs: 1_000,
  });
}
