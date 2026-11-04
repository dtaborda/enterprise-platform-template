import { createServerClient } from "@supabase/ssr";
import type { SupabaseClient } from "@supabase/supabase-js";
import { type NextRequest, NextResponse } from "next/server";

export interface MiddlewareSupabaseConfig {
  supabaseUrl: string;
  supabaseAnonKey: string;
}

/**
 * The outcome of {@link updateSession}.
 *
 * Structurally identical to `SessionRefreshResult` in
 * `../services/ports/session-port.ts`. It is redeclared here rather than imported
 * so this infrastructure module stays free of a dependency on the service layer.
 * `SupabaseSessionAdapter` annotates its return as `SessionRefreshResult`, so any
 * drift between the two shapes fails `pnpm typecheck`.
 */
export interface UpdateSessionResult {
  response: NextResponse;
  userId: string | null;
  verifiedLocally: boolean;
}

/**
 * Derived from the installed SDK instead of importing `JWK` from `@supabase/auth-js`,
 * which is a transitive dependency this package does not declare. Deriving keeps the
 * type exact and guarantees a compile error if the SDK option shape ever changes.
 */
type GetClaimsOptions = NonNullable<Parameters<SupabaseClient["auth"]["getClaims"]>[1]>;
type JsonWebKeySet = NonNullable<GetClaimsOptions["jwks"]>;

/**
 * Matches the `cache-control: public, max-age=600` served by the Supabase JWKS
 * endpoint, and the SDK's own internal JWKS TTL.
 */
const JWKS_CACHE_TTL_MS = 10 * 60 * 1000;

/**
 * Short retry window applied when a JWKS fetch fails. Without it, a JWKS outage
 * would make every single request re-attempt the fetch before falling back —
 * strictly worse than the remote-validation path it is trying to avoid.
 */
const JWKS_FAILURE_BACKOFF_MS = 30 * 1000;

interface JwksCacheEntry {
  keySetPromise: Promise<JsonWebKeySet | null>;
  expiresAt: number;
}

/**
 * Module-scoped so the key set survives across invocations inside the same edge
 * isolate. Middleware builds a fresh Supabase client per request, so a per-client
 * cache would be useless here. Keyed by project URL to stay correct if more than
 * one Supabase project is ever addressed from the same isolate.
 */
const jwksCache = new Map<string, JwksCacheEntry>();

let hasWarnedAboutRemoteVerification = false;

/**
 * Fetches the project's JSON Web Key Set. Never throws: a `null` return means
 * "no usable key set", which the caller handles by letting the SDK decide.
 */
async function fetchJsonWebKeySet(supabaseUrl: string): Promise<JsonWebKeySet | null> {
  try {
    const response = await fetch(`${supabaseUrl}/auth/v1/.well-known/jwks.json`);

    if (!response.ok) {
      return null;
    }

    const body = (await response.json()) as Partial<JsonWebKeySet>;

    if (!Array.isArray(body.keys) || body.keys.length === 0) {
      return null;
    }

    return { keys: body.keys };
  } catch {
    return null;
  }
}

/**
 * Returns the cached JSON Web Key Set, fetching it at most once per TTL per isolate.
 *
 * The in-flight promise is cached (not just the resolved value) so concurrent
 * requests hitting a cold isolate share a single fetch instead of stampeding the
 * endpoint.
 */
async function loadJsonWebKeySet(supabaseUrl: string): Promise<JsonWebKeySet | null> {
  const now = Date.now();
  const cached = jwksCache.get(supabaseUrl);

  if (cached && now < cached.expiresAt) {
    return cached.keySetPromise;
  }

  const keySetPromise = fetchJsonWebKeySet(supabaseUrl);

  // Seed with the short backoff first. The full TTL is only granted below, once
  // the fetch is known to have succeeded.
  const entry: JwksCacheEntry = {
    keySetPromise,
    expiresAt: now + JWKS_FAILURE_BACKOFF_MS,
  };
  jwksCache.set(supabaseUrl, entry);

  const keySet = await keySetPromise;

  if (keySet) {
    entry.expiresAt = Date.now() + JWKS_CACHE_TTL_MS;
  }

  return keySet;
}

/**
 * Warns once per isolate that local verification is not happening.
 *
 * `getClaims()` degrades to a remote `getUser()` call silently. Without this
 * warning the optimization can be reverted by a signing-key rotation and nobody
 * would notice until someone measured latency again.
 *
 * Deliberately logs no token, claim, cookie, or user data.
 */
function warnRemoteVerificationFallbackOnce(): void {
  if (hasWarnedAboutRemoteVerification) {
    return;
  }

  hasWarnedAboutRemoteVerification = true;

  console.warn(
    "[updateSession] Session JWTs are NOT being verified locally. Every " +
      "authenticated request is paying a remote auth round trip from the edge, " +
      "which this middleware exists to avoid. Local verification requires the " +
      "project's current JWT signing key to be asymmetric (ECC or RSA); a shared " +
      "secret (HS*) key forces the remote fallback. Check the signing key in the " +
      "Supabase dashboard under Authentication > JWT Keys.",
  );
}

/**
 * Refreshes the Supabase auth session for every middleware request and reports
 * who the caller is.
 *
 * Auth is established with `getClaims()`, which cryptographically verifies the
 * token's signature and expiry locally against the project's asymmetric signing
 * key. This is real validation — it is NOT the unvalidated `getSession()`.
 *
 * Supplying the cached key set is what makes it local: given the token's `kid`,
 * the SDK resolves the key from the supplied set and performs zero network I/O.
 * Without it, verification still works but each cold isolate re-fetches the JWKS.
 *
 * `getClaims()` is called with no explicit token so it reads the session through
 * the cookie-backed storage adapter, which preserves the existing auto-refresh
 * behavior: an expiring token is rotated and the new cookies land on `response`.
 *
 * Tradeoff: local verification cannot observe a session revoked before its token
 * expires. This middleware is a coarse routing gate; `getCurrentUser()` in
 * `ui/features/auth/queries.ts` still calls `getUser()` during page render, in the
 * function region where that call is cheap, and catches revocation there.
 */
export async function updateSession(
  request: NextRequest,
  config: MiddlewareSupabaseConfig,
): Promise<UpdateSessionResult> {
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

  const jwks = await loadJsonWebKeySet(supabaseUrl);

  // On a JWKS failure, call getClaims() without supplied keys and let the SDK
  // resolve the key itself (or fall back to a remote check). Correctness over
  // speed — a JWKS outage must never break the middleware.
  const { data } = jwks
    ? await supabase.auth.getClaims(undefined, { jwks })
    : await supabase.auth.getClaims();

  const userId = data?.claims.sub ?? null;

  // An HS* algorithm is the one condition that makes the SDK skip local
  // verification and issue a remote getUser() call instead.
  const verifiedLocally = data ? !data.header.alg.startsWith("HS") : false;

  if (userId && !verifiedLocally) {
    warnRemoteVerificationFallbackOnce();
  }

  return { response, userId, verifiedLocally };
}
