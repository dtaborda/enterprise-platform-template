// Admin client for Supabase - service role that bypasses RLS
// Use ONLY for migrations, initial setup, and platform-level operations
// NEVER expose to client or use in regular user operations

import { createClient } from "@supabase/supabase-js";

/** Admin client singleton */
let adminClient: ReturnType<typeof createClient> | null = null;

/** Get admin client (bypasses RLS - USE WITH CAUTION) */
export function getAdminClient() {
  if (!adminClient) {
    const supabaseUrl = process.env["NEXT_PUBLIC_SUPABASE_URL"];
    const supabaseServiceKey = process.env["SUPABASE_SERVICE_ROLE_KEY"];

    if (!supabaseUrl || !supabaseServiceKey) {
      throw new Error("Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY");
    }

    adminClient = createClient(supabaseUrl, supabaseServiceKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    });
  }

  return adminClient;
}

/** Create a scoped admin client for a specific tenant
 * Useful for background jobs that need to operate across tenants
 */
export function getTenantAdminClient(tenantId: string) {
  const client = getAdminClient();
  // Note: This doesn't actually scope the client - you'd implement
  // tenant-specific logic in queries or use RLS with custom claims
  return client;
}

// Re-export type
export type SupabaseAdminClient = ReturnType<typeof getAdminClient>;
