import type { NextRequest, NextResponse } from "next/server";
import { type MiddlewareSupabaseConfig, updateSession } from "../../supabase/middleware";
import type { SessionPort } from "../ports/session-port";

/**
 * SupabaseSessionAdapter — implements SessionPort using @supabase/ssr.
 *
 * This adapter wraps the existing updateSession() function from
 * packages/core/src/supabase/middleware.ts. The function reads the session
 * token from request cookies, validates it with the Supabase Auth server
 * (via getUser()), and returns a NextResponse with refreshed Set-Cookie headers.
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

  async refreshSession(request: NextRequest): Promise<NextResponse> {
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
    // Delegates directly to updateSession() — same behavior as pre-refactor middleware.
    // The function creates a server client, calls getUser() to validate and refresh
    // the session, then returns a response with updated cookies.
    return updateSession(request, config);
  }
}
