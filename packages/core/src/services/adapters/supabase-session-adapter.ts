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
 * Construction requires the Supabase project URL and anon key. These are the
 * same env vars already in use: NEXT_PUBLIC_SUPABASE_URL and
 * NEXT_PUBLIC_SUPABASE_ANON_KEY. No new env vars are introduced.
 */
export class SupabaseSessionAdapter implements SessionPort {
  private readonly config: MiddlewareSupabaseConfig;

  constructor(supabaseUrl: string, supabaseAnonKey: string) {
    this.config = { supabaseUrl, supabaseAnonKey };
  }

  async refreshSession(request: NextRequest): Promise<NextResponse> {
    // Delegates directly to updateSession() — same behavior as pre-refactor middleware.
    // The function creates a server client, calls getUser() to validate and refresh
    // the session, then returns a response with updated cookies.
    return updateSession(request, this.config);
  }
}
