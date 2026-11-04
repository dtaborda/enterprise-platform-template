import type { NextRequest } from "next/server";
import { type MiddlewareSupabaseConfig, updateSession } from "../../supabase/middleware";
import type { SessionPort, SessionRefreshResult } from "../ports/session-port";

/**
 * SupabaseSessionAdapter — implements SessionPort using @supabase/ssr.
 *
 * This adapter wraps the existing updateSession() function from
 * packages/core/src/supabase/middleware.ts. The function reads the session
 * token from request cookies, verifies it locally against the project's cached
 * JWKS (via getClaims()), and returns a NextResponse with refreshed Set-Cookie
 * headers plus the authenticated subject.
 *
 * The Supabase project URL and anon key may be passed explicitly OR resolved
 * lazily from env (NEXT_PUBLIC_SUPABASE_URL / NEXT_PUBLIC_SUPABASE_ANON_KEY) on
 * the first refreshSession() call. Lazy resolution is intentional: it lets the
 * adapter be constructed at module load (e.g. in Server Actions) without the
 * env vars present — important for `next build`, which evaluates modules while
 * collecting page data with no runtime env. The env is only required at request
 * time in middleware, where it is always available.
 */
export class SupabaseSessionAdapter implements SessionPort {
  private readonly supabaseUrl: string | undefined;
  private readonly supabaseAnonKey: string | undefined;

  constructor(supabaseUrl?: string, supabaseAnonKey?: string) {
    this.supabaseUrl = supabaseUrl;
    this.supabaseAnonKey = supabaseAnonKey;
  }

  async refreshSession(request: NextRequest): Promise<SessionRefreshResult> {
    // Resolve credentials lazily so construction never throws at build time.
    const supabaseUrl = this.supabaseUrl ?? process.env["NEXT_PUBLIC_SUPABASE_URL"];
    const supabaseAnonKey = this.supabaseAnonKey ?? process.env["NEXT_PUBLIC_SUPABASE_ANON_KEY"];

    if (!supabaseUrl || !supabaseAnonKey) {
      throw new Error(
        "[SupabaseSessionAdapter] Missing NEXT_PUBLIC_SUPABASE_URL or " +
          "NEXT_PUBLIC_SUPABASE_ANON_KEY — both are required to refresh the session.",
      );
    }

    const config: MiddlewareSupabaseConfig = { supabaseUrl, supabaseAnonKey };
    // Delegates directly to updateSession(). The function creates a server client,
    // verifies and refreshes the session, then returns the response with updated
    // cookies plus the authenticated subject. The SessionRefreshResult return type
    // is what pins updateSession()'s own result shape to the port contract.
    return updateSession(request, config);
  }
}
