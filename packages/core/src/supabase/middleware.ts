import { createServerClient } from "@supabase/ssr";
import { type NextRequest, NextResponse } from "next/server";

export interface MiddlewareSupabaseConfig {
  supabaseUrl: string;
  supabaseAnonKey: string;
}

/**
 * Refreshes the Supabase auth session for every middleware request.
 *
 * This MUST call getUser() to validate and refresh tokens server-side.
 */
export async function updateSession(request: NextRequest, config: MiddlewareSupabaseConfig) {
  const { supabaseUrl, supabaseAnonKey } = config;

  let response = NextResponse.next({
    request,
  });

  const supabase = createServerClient(supabaseUrl, supabaseAnonKey, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet) {
        cookiesToSet.forEach(({ name, value }) => {
          request.cookies.set(name, value);
        });

        response = NextResponse.next({
          request,
        });

        cookiesToSet.forEach(({ name, value, options }) => {
          response.cookies.set(name, value, options);
        });
      },
    },
  });

  await supabase.auth.getUser();

  return response;
}

/**
 * Creates a middleware-scoped Supabase client bound to request cookies.
 * Use when middleware needs to perform additional queries after updateSession().
 */
export function createMiddlewareClient(request: NextRequest, config: MiddlewareSupabaseConfig) {
  const { supabaseUrl, supabaseAnonKey } = config;

  return createServerClient(supabaseUrl, supabaseAnonKey, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll() {
        // Cookie persistence is handled by updateSession().
      },
    },
  });
}
