import type { NextRequest, NextResponse } from "next/server";

/**
 * SessionPort — Next.js middleware-level session management interface.
 *
 * This port is intentionally Next.js-scoped. It returns `NextResponse` because
 * middleware is a Next.js primitive — abstracting this away would require a custom
 * response wrapper that adds complexity without benefit. Adopters who switch
 * frameworks must rewrite middleware regardless.
 *
 * `refreshSession` is the single responsibility: given an incoming request,
 * refresh the session cookie and return a response with updated Set-Cookie headers.
 * The middleware delegates all session refresh logic to this port — it does NOT
 * import `@supabase/ssr` directly.
 *
 * The Supabase reference implementation is `SupabaseSessionAdapter`, which wraps
 * the existing `updateSession()` logic from `packages/core/src/supabase/middleware.ts`.
 */
export interface SessionPort {
  /**
   * Refreshes the authentication session for an incoming middleware request.
   *
   * The implementation is responsible for:
   * 1. Reading the session token from the request cookies.
   * 2. Validating and refreshing the token with the auth provider (server-side).
   * 3. Returning a NextResponse with updated Set-Cookie headers so the refreshed
   *    token is written to the browser.
   *
   * @param request - The incoming Next.js middleware request.
   * @returns A NextResponse with refreshed session cookies, or a pass-through response
   *          if no session exists or no refresh was needed.
   */
  refreshSession(request: NextRequest): Promise<NextResponse>;
}
