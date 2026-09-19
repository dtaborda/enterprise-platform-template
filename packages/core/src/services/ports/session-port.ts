import type { NextRequest, NextResponse } from "next/server";

/**
 * The outcome of a single middleware-level session refresh.
 *
 * Carrying the authenticated subject alongside the response is what lets the
 * middleware act as an auth gate with exactly ONE token validation per request.
 * Before this shape existed, middleware refreshed the session and then had to
 * validate the token a second time just to learn who the caller was.
 */
export interface SessionRefreshResult {
  /**
   * The response carrying refreshed Set-Cookie headers. Callers MUST return
   * this (or a redirect derived from it) so the rotated token reaches the browser.
   */
  response: NextResponse;
  /**
   * The authenticated subject identifier, or `null` when the request carries no
   * valid session. Callers use this as the auth signal instead of performing
   * their own lookup.
   */
  userId: string | null;
  /**
   * `true` when the implementation established the subject by verifying the
   * token locally (no round trip to the auth provider).
   *
   * `false` means the implementation had to fall back to a remote validation
   * call. The session is still trustworthy — but the latency win is gone, so
   * callers and operators should treat a sustained `false` as a misconfiguration
   * signal rather than a normal steady state.
   */
  verifiedLocally: boolean;
}

/**
 * SessionPort — Next.js middleware-level session management interface.
 *
 * This port is intentionally Next.js-scoped. It returns `NextResponse` because
 * middleware is a Next.js primitive — abstracting this away would require a custom
 * response wrapper that adds complexity without benefit. Adopters who switch
 * frameworks must rewrite middleware regardless.
 *
 * `refreshSession` is the single responsibility: given an incoming request,
 * refresh the session cookie AND report the authenticated subject, so the caller
 * never needs a second validation round trip. The middleware delegates all session
 * logic to this port — it does NOT import `@supabase/ssr` directly.
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
   * 2. Validating the token and refreshing it when it is close to expiry.
   * 3. Returning a NextResponse with updated Set-Cookie headers so the refreshed
   *    token is written to the browser.
   * 4. Reporting the authenticated subject (`userId`) so the caller can make
   *    routing decisions without validating the token again.
   *
   * Implementations MUST NOT throw when the request is simply unauthenticated —
   * that is reported as `userId: null`.
   *
   * @param request - The incoming Next.js middleware request.
   * @returns The refreshed response, the authenticated subject (or `null`), and
   *          whether the subject was established without a remote round trip.
   */
  refreshSession(request: NextRequest): Promise<SessionRefreshResult>;
}
