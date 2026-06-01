interface SupabaseRestOptions {
  method?: "GET" | "POST" | "PATCH" | "DELETE";
  body?: Record<string, unknown> | Record<string, unknown>[];
  headers?: Record<string, string>;
  /** PostgREST query params like select, order, limit */
  params?: Record<string, string>;
}

function getRequiredEnv(name: "NEXT_PUBLIC_SUPABASE_URL" | "SUPABASE_SERVICE_ROLE_KEY"): string {
  const value = process.env[name];

  if (!value) {
    throw new Error(`Missing required environment variable for E2E Supabase REST helper: ${name}`);
  }

  return value;
}

function buildSupabaseRestUrl(table: string, params?: Record<string, string>): URL {
  const supabaseUrl = getRequiredEnv("NEXT_PUBLIC_SUPABASE_URL");
  const normalizedBaseUrl = supabaseUrl.endsWith("/") ? supabaseUrl.slice(0, -1) : supabaseUrl;
  const requestUrl = new URL(`${normalizedBaseUrl}/rest/v1/${table}`);

  if (params) {
    for (const [key, value] of Object.entries(params)) {
      requestUrl.searchParams.set(key, value);
    }
  }

  return requestUrl;
}

/**
 * Makes authenticated requests to the Supabase PostgREST API using the service-role key.
 * Used for E2E test data seed/teardown — NOT for production code.
 *
 * Reads NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY from environment.
 */
export async function supabaseRequest<T = unknown>(
  table: string,
  options?: SupabaseRestOptions,
): Promise<T> {
  const method = options?.method ?? "GET";
  const serviceRoleKey = getRequiredEnv("SUPABASE_SERVICE_ROLE_KEY");
  const requestUrl = buildSupabaseRestUrl(table, options?.params);

  const requestHeaders: Record<string, string> = {
    apikey: serviceRoleKey,
    Authorization: `Bearer ${serviceRoleKey}`,
    ...options?.headers,
  };

  if (method === "POST" && !requestHeaders["Prefer"]) {
    requestHeaders["Prefer"] = "return=representation";
  }

  if (options?.body) {
    requestHeaders["Content-Type"] = "application/json";
  }

  const response = await fetch(requestUrl, {
    method,
    headers: requestHeaders,
    body: options?.body ? JSON.stringify(options.body) : undefined,
  });

  if (!response.ok) {
    const errorBody = await response.text();
    throw new Error(
      `Supabase REST request failed (${method} ${requestUrl.pathname}): ${response.status} ${response.statusText} ${errorBody}`,
    );
  }

  if (response.status === 204) {
    return undefined as T;
  }

  const rawBody = await response.text();

  if (!rawBody) {
    return undefined as T;
  }

  return JSON.parse(rawBody) as T;
}

export async function seedRow(
  table: string,
  data: Record<string, unknown>,
): Promise<Record<string, unknown>> {
  const rows = await supabaseRequest<Record<string, unknown>[]>(table, {
    method: "POST",
    body: data,
  });

  const [createdRow] = rows;

  if (!createdRow) {
    throw new Error(`Supabase REST seedRow did not return created row for table: ${table}`);
  }

  return createdRow;
}

export async function seedRows(
  table: string,
  data: Record<string, unknown>[],
): Promise<Record<string, unknown>[]> {
  return supabaseRequest<Record<string, unknown>[]>(table, {
    method: "POST",
    body: data,
  });
}

export async function deleteRows(table: string, filters: Record<string, string>): Promise<void> {
  await supabaseRequest(table, {
    method: "DELETE",
    params: filters,
  });
}

/**
 * PATCHes rows in a table matching the given PostgREST filter params.
 * Used for idempotent E2E state restoration in afterEach hooks.
 * Uses the service-role key — bypasses RLS. Safe only in E2E teardown.
 */
export async function updateRows(
  table: string,
  filters: Record<string, string>,
  patch: Record<string, unknown>,
): Promise<void> {
  await supabaseRequest(table, {
    method: "PATCH",
    params: filters,
    headers: { Prefer: "return=minimal" },
    body: patch,
  });
}

/**
 * Resets a Supabase Auth user's password via the Admin API.
 * Used in afterEach hooks to restore seeded credentials so later test runs
 * are not poisoned by a password changed during a test.
 *
 * Uses the service-role key — bypasses normal auth. Safe only in E2E teardown.
 */
export async function resetUserPassword(userId: string, password: string): Promise<void> {
  const supabaseUrl = getRequiredEnv("NEXT_PUBLIC_SUPABASE_URL");
  const serviceRoleKey = getRequiredEnv("SUPABASE_SERVICE_ROLE_KEY");
  const normalizedBaseUrl = supabaseUrl.endsWith("/") ? supabaseUrl.slice(0, -1) : supabaseUrl;

  const response = await fetch(`${normalizedBaseUrl}/auth/v1/admin/users/${userId}`, {
    method: "PUT",
    headers: {
      apikey: serviceRoleKey,
      Authorization: `Bearer ${serviceRoleKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ password }),
  });

  if (!response.ok) {
    const errorBody = await response.text();
    throw new Error(
      `resetUserPassword failed for ${userId}: ${response.status} ${response.statusText} — ${errorBody}`,
    );
  }
}
