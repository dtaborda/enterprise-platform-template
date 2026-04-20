// Server client for Supabase - for use in Server Components and Server Actions
// Uses cookies for session management

import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";

/** Get server client for current request */
export async function getServerClient() {
  const cookieStore = await cookies();

  const supabaseUrl = process.env["NEXT_PUBLIC_SUPABASE_URL"];
  const supabaseAnonKey = process.env["NEXT_PUBLIC_SUPABASE_ANON_KEY"];

  if (!supabaseUrl || !supabaseAnonKey) {
    throw new Error("Missing NEXT_PUBLIC_SUPABASE_URL or NEXT_PUBLIC_SUPABASE_ANON_KEY");
  }

  return createServerClient(supabaseUrl, supabaseAnonKey, {
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll(cookiesToSet) {
        try {
          cookiesToSet.forEach(({ name, value, options }) => {
            cookieStore.set(name, value, options);
          });
        } catch {
          // Called from Server Component - ignore
        }
      },
    },
  });
}

/** Get auth token from cookies */
export async function getAuthToken(): Promise<string | null> {
  const cookieStore = await cookies();
  return cookieStore.get("sb-access-token")?.value ?? null;
}

// Re-export for convenience
export type SupabaseServerClient = Awaited<ReturnType<typeof getServerClient>>;
