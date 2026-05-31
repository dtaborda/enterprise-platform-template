import type { SupabaseClient } from "@supabase/supabase-js";
import { SupabaseAuthAdapter } from "./adapters/supabase-auth-adapter";
import { SupabaseSessionAdapter } from "./adapters/supabase-session-adapter";
import { SupabaseStorageAdapter } from "./adapters/supabase-storage-adapter";
import type { AuthPort } from "./ports/auth-port";
import type { SessionPort } from "./ports/session-port";
import type { StoragePort } from "./ports/storage-port";

/**
 * The resolved set of backend adapters.
 *
 * auth and storage are factory functions (not instances) because SupabaseClient
 * is request-scoped — it must be created per-request from getServerClient().
 * The factory itself is safely called once at module level in Server Actions.
 *
 * session is a constructed instance because SupabaseSessionAdapter captures
 * the URL/key at construction and creates its own client per refreshSession() call.
 */
export interface BackendAdapters {
  /** Factory: call with a request-scoped SupabaseClient to get an AuthPort. */
  auth: (client: SupabaseClient) => AuthPort;
  /** Factory: call with a request-scoped SupabaseClient to get a StoragePort. */
  storage: (client: SupabaseClient) => StoragePort;
  /** Middleware-level session refresh — used by ui/middleware.ts. */
  session: SessionPort;
}

/**
 * createBackendAdapters — selects and instantiates the active backend adapters.
 *
 * Selection is driven by env vars:
 *   BACKEND_AUTH_PROVIDER    — "supabase" (default) | "custom"
 *   BACKEND_STORAGE_PROVIDER — "supabase" (default) | "custom"
 *
 * The session adapter always uses the Supabase implementation because session
 * management is tightly coupled to the auth provider. Custom providers must
 * implement their own session handling.
 *
 * Throws a descriptive error if an unsupported provider name is set, so
 * misconfiguration fails loudly at startup rather than silently at runtime.
 *
 * @example
 * // Default Supabase path (no env vars needed beyond Supabase credentials)
 * const adapters = createBackendAdapters();
 *
 * @example
 * // In a Server Action (auth):
 * const { auth: authFactory } = createBackendAdapters();
 * const client = await getServerClient();
 * const auth = authFactory(client);
 * return signInWithPasswordService(auth, input);
 *
 * @example
 * // In middleware (session):
 * const { session: sessionPort } = createBackendAdapters();
 * const response = await sessionPort.refreshSession(request);
 */
export function createBackendAdapters(): BackendAdapters {
  const authProvider = process.env["BACKEND_AUTH_PROVIDER"] ?? "supabase";
  const storageProvider = process.env["BACKEND_STORAGE_PROVIDER"] ?? "supabase";

  // --- Auth adapter factory ---
  let authFactory: (client: SupabaseClient) => AuthPort;

  if (authProvider === "supabase") {
    authFactory = (client) => new SupabaseAuthAdapter(client);
  } else {
    throw new Error(
      `[createBackendAdapters] Unknown BACKEND_AUTH_PROVIDER: "${authProvider}". ` +
        `Supported values: "supabase". To use a custom adapter: implement AuthPort ` +
        `and return a new instance in createBackendAdapters().`,
    );
  }

  // --- Storage adapter factory ---
  let storageFactory: (client: SupabaseClient) => StoragePort;

  if (storageProvider === "supabase") {
    storageFactory = (client) => new SupabaseStorageAdapter(client);
  } else {
    throw new Error(
      `[createBackendAdapters] Unknown BACKEND_STORAGE_PROVIDER: "${storageProvider}". ` +
        `Supported values: "supabase". To use a custom adapter: implement StoragePort ` +
        `and return a new instance in createBackendAdapters().`,
    );
  }

  // --- Session adapter (always Supabase in MVP; no selection env var) ---
  const supabaseUrl = process.env["NEXT_PUBLIC_SUPABASE_URL"];
  const supabaseAnonKey = process.env["NEXT_PUBLIC_SUPABASE_ANON_KEY"];

  if (!supabaseUrl) {
    throw new Error(
      "[createBackendAdapters] Missing NEXT_PUBLIC_SUPABASE_URL. " +
        "This is required for the session adapter.",
    );
  }

  if (!supabaseAnonKey) {
    throw new Error(
      "[createBackendAdapters] Missing NEXT_PUBLIC_SUPABASE_ANON_KEY. " +
        "This is required for the session adapter.",
    );
  }

  const session: SessionPort = new SupabaseSessionAdapter(supabaseUrl, supabaseAnonKey);

  return {
    auth: authFactory,
    storage: storageFactory,
    session,
  };
}
