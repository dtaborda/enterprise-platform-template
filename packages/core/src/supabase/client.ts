// Browser client for Supabase - uses cookies for session management
// Use this in client components and Server Actions

import { createBrowserClient } from "@supabase/ssr";

/** Browser client instance - singleton per request */
let browserClient: ReturnType<typeof createBrowserClient> | null = null;

/** Get or create browser client */
export function getBrowserClient() {
  if (!browserClient) {
    const supabaseUrl = process.env["NEXT_PUBLIC_SUPABASE_URL"];
    const supabaseAnonKey = process.env["NEXT_PUBLIC_SUPABASE_ANON_KEY"];

    if (!supabaseUrl || !supabaseAnonKey) {
      throw new Error("Missing NEXT_PUBLIC_SUPABASE_URL or NEXT_PUBLIC_SUPABASE_ANON_KEY");
    }

    browserClient = createBrowserClient(supabaseUrl, supabaseAnonKey, {
      cookies: {
        getAll() {
          return [];
        },
        setAll() {},
      },
    });
  }

  return browserClient;
}

// Re-export for convenience
export type SupabaseBrowserClient = ReturnType<typeof getBrowserClient>;
