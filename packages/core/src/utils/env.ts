// Environment variable utilities
// Validates and provides type-safe access to environment variables

import { z } from "zod";

/** Schema for required environment variables */
const envSchema = z.object({
  // Supabase
  NEXT_PUBLIC_SUPABASE_URL: z.string().url(),
  NEXT_PUBLIC_SUPABASE_ANON_KEY: z.string().min(1),
  SUPABASE_SERVICE_ROLE_KEY: z.string().min(1).optional(),

  // App
  NODE_ENV: z.enum(["development", "production", "test"]).default("development"),
  NEXT_PUBLIC_APP_URL: z.string().url().optional(),
  NEXT_PUBLIC_SITE_URL: z.string().url().optional(),
  APP_URL: z.string().url().optional(),

  // Optional: Sentry
  NEXT_PUBLIC_SENTRY_DSN: z.string().url().optional(),

  // Optional: Resend (email)
  RESEND_API_KEY: z.string().optional(),
});

/** Parsed environment variables */
export type Env = z.infer<typeof envSchema>;

/** Cached environment (parsed once) */
let cachedEnv: Env | null = null;

/** Get validated environment variables */
export function getEnv(): Env {
  if (cachedEnv) return cachedEnv;

  // For Next.js, import.meta.env gives us access to env vars
  const rawEnv = {
    NEXT_PUBLIC_SUPABASE_URL: process.env["NEXT_PUBLIC_SUPABASE_URL"],
    NEXT_PUBLIC_SUPABASE_ANON_KEY: process.env["NEXT_PUBLIC_SUPABASE_ANON_KEY"],
    SUPABASE_SERVICE_ROLE_KEY: process.env["SUPABASE_SERVICE_ROLE_KEY"],
    NODE_ENV: process.env["NODE_ENV"],
    NEXT_PUBLIC_APP_URL: process.env["NEXT_PUBLIC_APP_URL"],
    NEXT_PUBLIC_SITE_URL: process.env["NEXT_PUBLIC_SITE_URL"],
    APP_URL: process.env["APP_URL"],
    NEXT_PUBLIC_SENTRY_DSN: process.env["NEXT_PUBLIC_SENTRY_DSN"],
    RESEND_API_KEY: process.env["RESEND_API_KEY"],
  };

  const result = envSchema.safeParse(rawEnv);

  if (!result.success) {
    console.error("Environment validation failed:", result.error.format());
    throw new Error(
      `Invalid environment variables: ${result.error.errors
        .map((e) => e.path.join("."))
        .join(", ")}`,
    );
  }

  cachedEnv = result.data;
  return cachedEnv;
}

/** Check if running in production */
export function isProduction(): boolean {
  return getEnv().NODE_ENV === "production";
}

/** Check if running in development */
export function isDevelopment(): boolean {
  return getEnv().NODE_ENV === "development";
}

/** Check if running in test */
export function isTest(): boolean {
  return getEnv().NODE_ENV === "test";
}

/** Get Supabase URL */
export function getSupabaseUrl(): string {
  return getEnv().NEXT_PUBLIC_SUPABASE_URL;
}

/** Get Supabase anon key */
export function getSupabaseAnonKey(): string {
  return getEnv().NEXT_PUBLIC_SUPABASE_ANON_KEY;
}

/** Get service role key (only in server-side) */
export function getServiceRoleKey(): string | undefined {
  return getEnv().SUPABASE_SERVICE_ROLE_KEY;
}

/**
 * Get canonical app URL with safe fallback chain.
 */
export function getAppUrl(): string {
  const env = getEnv();
  const canonicalUrl =
    env.NEXT_PUBLIC_APP_URL ?? env.NEXT_PUBLIC_SITE_URL ?? env.APP_URL ?? "http://localhost:3000";

  if (env.NODE_ENV !== "production") {
    return canonicalUrl;
  }

  if (!env.NEXT_PUBLIC_APP_URL && !env.NEXT_PUBLIC_SITE_URL && !env.APP_URL) {
    throw new Error(
      "Missing canonical application URL in production. Set NEXT_PUBLIC_APP_URL, NEXT_PUBLIC_SITE_URL, or APP_URL.",
    );
  }

  const hostname = new URL(canonicalUrl).hostname.toLowerCase();
  const normalizedHostname = hostname.startsWith("[") && hostname.endsWith("]")
    ? hostname.slice(1, -1)
    : hostname;
  const isLocalhostLike =
    normalizedHostname === "localhost" ||
    normalizedHostname === "127.0.0.1" ||
    normalizedHostname === "0.0.0.0" ||
    normalizedHostname === "::1" ||
    normalizedHostname.endsWith(".localhost");

  if (isLocalhostLike) {
    throw new Error("Invalid canonical application URL in production. Localhost-style URLs are not allowed.");
  }

  return canonicalUrl;
}
