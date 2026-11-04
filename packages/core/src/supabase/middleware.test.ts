import type { NextRequest } from "next/server";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { MiddlewareSupabaseConfig } from "./middleware";

const { mockCreateServerClient, mockGetClaims } = vi.hoisted(() => ({
  mockCreateServerClient: vi.fn(),
  mockGetClaims: vi.fn(),
}));

vi.mock("@supabase/ssr", () => ({
  createServerClient: mockCreateServerClient,
}));

const CONFIG: MiddlewareSupabaseConfig = {
  supabaseUrl: "https://project.supabase.co",
  supabaseAnonKey: "anon-key",
};

const JWKS_URL = "https://project.supabase.co/auth/v1/.well-known/jwks.json";

const ECC_KEY = {
  kty: "EC",
  key_ops: ["verify"],
  alg: "ES256",
  kid: "120c7394-62d4-4e84-bd32-6f55c57b7a91",
};

function createRequest(): NextRequest {
  return {
    cookies: {
      getAll: () => [],
      set: vi.fn(),
    },
    headers: new Headers(),
  } as unknown as NextRequest;
}

/** Shapes a successful getClaims() result for the given signing algorithm. */
function claimsResult(alg: string, sub = "user-1") {
  return {
    data: {
      claims: { sub },
      header: { alg, kid: ECC_KEY.kid, typ: "JWT" },
      signature: new Uint8Array(),
    },
    error: null,
  };
}

/** A getClaims() result for a request that carries no valid session. */
const NO_SESSION_RESULT = { data: null, error: null };

function mockJwksResponse(): Response {
  return {
    ok: true,
    json: async () => ({ keys: [ECC_KEY] }),
  } as unknown as Response;
}

/**
 * Re-imports the module so its JWKS cache and one-time warning flag start clean.
 * Both are module-scoped by design (they must survive across requests in a live
 * edge isolate), so tests MUST reset modules rather than share one import.
 */
async function loadUpdateSession() {
  vi.resetModules();
  const mod = await import("./middleware");
  return mod.updateSession;
}

let mockFetch: ReturnType<typeof vi.fn>;
let warnSpy: ReturnType<typeof vi.spyOn>;

beforeEach(() => {
  vi.clearAllMocks();

  mockCreateServerClient.mockReturnValue({
    auth: { getClaims: mockGetClaims },
  });

  mockFetch = vi.fn().mockResolvedValue(mockJwksResponse());
  vi.stubGlobal("fetch", mockFetch);

  warnSpy = vi.spyOn(console, "warn").mockImplementation(() => undefined);
});

afterEach(() => {
  vi.unstubAllGlobals();
  warnSpy.mockRestore();
});

describe("updateSession — local verification", () => {
  it("verifies the token locally against the fetched JWKS", async () => {
    mockGetClaims.mockResolvedValue(claimsResult("ES256"));
    const updateSession = await loadUpdateSession();

    const result = await updateSession(createRequest(), CONFIG);

    expect(result.userId).toBe("user-1");
    expect(result.verifiedLocally).toBe(true);
    expect(result.response).toBeDefined();
  });

  it("supplies the cached key set to getClaims so the SDK performs no key lookup", async () => {
    mockGetClaims.mockResolvedValue(claimsResult("ES256"));
    const updateSession = await loadUpdateSession();

    await updateSession(createRequest(), CONFIG);

    expect(mockGetClaims).toHaveBeenCalledWith(undefined, {
      jwks: { keys: [ECC_KEY] },
    });
  });

  it("reads the session through cookie storage rather than an explicit token", async () => {
    mockGetClaims.mockResolvedValue(claimsResult("ES256"));
    const updateSession = await loadUpdateSession();

    await updateSession(createRequest(), CONFIG);

    // Passing `undefined` makes getClaims() go through getSession(), which is what
    // preserves the cookie auto-refresh behaviour this middleware depends on.
    expect(mockGetClaims.mock.calls[0]?.[0]).toBeUndefined();
  });

  it("emits no fallback warning on the local-verification path", async () => {
    mockGetClaims.mockResolvedValue(claimsResult("ES256"));
    const updateSession = await loadUpdateSession();

    await updateSession(createRequest(), CONFIG);

    expect(warnSpy).not.toHaveBeenCalled();
  });
});

describe("updateSession — JWKS caching", () => {
  it("fetches the JWKS exactly once across repeated requests within the TTL", async () => {
    mockGetClaims.mockResolvedValue(claimsResult("ES256"));
    const updateSession = await loadUpdateSession();

    await updateSession(createRequest(), CONFIG);
    await updateSession(createRequest(), CONFIG);
    await updateSession(createRequest(), CONFIG);

    const jwksCalls = mockFetch.mock.calls.filter(([url]) => url === JWKS_URL);
    expect(jwksCalls).toHaveLength(1);
  });

  it("re-fetches the JWKS after the TTL expires", async () => {
    vi.useFakeTimers();
    try {
      mockGetClaims.mockResolvedValue(claimsResult("ES256"));
      const updateSession = await loadUpdateSession();

      await updateSession(createRequest(), CONFIG);
      // Advance past the 10-minute TTL.
      vi.advanceTimersByTime(10 * 60 * 1000 + 1);
      await updateSession(createRequest(), CONFIG);

      const jwksCalls = mockFetch.mock.calls.filter(([url]) => url === JWKS_URL);
      expect(jwksCalls).toHaveLength(2);
    } finally {
      vi.useRealTimers();
    }
  });

  it("shares a single in-flight fetch between concurrent cold-isolate requests", async () => {
    mockGetClaims.mockResolvedValue(claimsResult("ES256"));
    const updateSession = await loadUpdateSession();

    await Promise.all([
      updateSession(createRequest(), CONFIG),
      updateSession(createRequest(), CONFIG),
    ]);

    const jwksCalls = mockFetch.mock.calls.filter(([url]) => url === JWKS_URL);
    expect(jwksCalls).toHaveLength(1);
  });
});

describe("updateSession — remote fallback is observable", () => {
  it("reports verifiedLocally false for a shared-secret (HS*) signing key", async () => {
    mockGetClaims.mockResolvedValue(claimsResult("HS256"));
    const updateSession = await loadUpdateSession();

    const result = await updateSession(createRequest(), CONFIG);

    expect(result.userId).toBe("user-1");
    expect(result.verifiedLocally).toBe(false);
  });

  it("warns that local verification is not happening", async () => {
    mockGetClaims.mockResolvedValue(claimsResult("HS256"));
    const updateSession = await loadUpdateSession();

    await updateSession(createRequest(), CONFIG);

    expect(warnSpy).toHaveBeenCalledTimes(1);
    expect(warnSpy.mock.calls[0]?.[0]).toContain("NOT being verified locally");
  });

  it("warns once per isolate, not once per request", async () => {
    mockGetClaims.mockResolvedValue(claimsResult("HS256"));
    const updateSession = await loadUpdateSession();

    await updateSession(createRequest(), CONFIG);
    await updateSession(createRequest(), CONFIG);
    await updateSession(createRequest(), CONFIG);

    expect(warnSpy).toHaveBeenCalledTimes(1);
  });

  it("logs no token, claim, or cookie data", async () => {
    mockGetClaims.mockResolvedValue(claimsResult("HS256", "secret-subject-id"));
    const updateSession = await loadUpdateSession();

    await updateSession(createRequest(), CONFIG);

    expect(warnSpy.mock.calls[0]?.[0]).not.toContain("secret-subject-id");
  });
});

describe("updateSession — JWKS fetch failure", () => {
  it("still returns a usable result when the JWKS endpoint errors", async () => {
    mockFetch.mockResolvedValue({ ok: false } as unknown as Response);
    mockGetClaims.mockResolvedValue(claimsResult("ES256"));
    const updateSession = await loadUpdateSession();

    const result = await updateSession(createRequest(), CONFIG);

    expect(result.userId).toBe("user-1");
    expect(result.response).toBeDefined();
  });

  it("does not throw when the JWKS fetch rejects", async () => {
    mockFetch.mockRejectedValue(new Error("network down"));
    mockGetClaims.mockResolvedValue(claimsResult("ES256"));
    const updateSession = await loadUpdateSession();

    await expect(updateSession(createRequest(), CONFIG)).resolves.toBeDefined();
  });

  it("lets the SDK resolve the key itself instead of supplying an empty set", async () => {
    mockFetch.mockRejectedValue(new Error("network down"));
    mockGetClaims.mockResolvedValue(claimsResult("ES256"));
    const updateSession = await loadUpdateSession();

    await updateSession(createRequest(), CONFIG);

    expect(mockGetClaims).toHaveBeenCalledWith();
  });

  it("does not throw when the JWKS payload has no keys", async () => {
    mockFetch.mockResolvedValue({
      ok: true,
      json: async () => ({ keys: [] }),
    } as unknown as Response);
    mockGetClaims.mockResolvedValue(claimsResult("ES256"));
    const updateSession = await loadUpdateSession();

    const result = await updateSession(createRequest(), CONFIG);

    expect(result.verifiedLocally).toBe(true);
    expect(mockGetClaims).toHaveBeenCalledWith();
  });

  it("retries the fetch on the next request instead of pinning the failure for the full TTL", async () => {
    mockFetch.mockRejectedValue(new Error("network down"));
    mockGetClaims.mockResolvedValue(claimsResult("ES256"));
    const updateSession = await loadUpdateSession();

    await updateSession(createRequest(), CONFIG);

    vi.useFakeTimers();
    try {
      // Past the short failure backoff, well short of the 10-minute success TTL.
      vi.advanceTimersByTime(30 * 1000 + 1);
      await updateSession(createRequest(), CONFIG);
    } finally {
      vi.useRealTimers();
    }

    const jwksCalls = mockFetch.mock.calls.filter(([url]) => url === JWKS_URL);
    expect(jwksCalls).toHaveLength(2);
  });
});

describe("updateSession — unauthenticated requests", () => {
  it("reports a null subject without throwing", async () => {
    mockGetClaims.mockResolvedValue(NO_SESSION_RESULT);
    const updateSession = await loadUpdateSession();

    const result = await updateSession(createRequest(), CONFIG);

    expect(result.userId).toBeNull();
    expect(result.verifiedLocally).toBe(false);
    expect(result.response).toBeDefined();
  });

  it("does not warn about remote fallback when there is simply no session", async () => {
    mockGetClaims.mockResolvedValue(NO_SESSION_RESULT);
    const updateSession = await loadUpdateSession();

    await updateSession(createRequest(), CONFIG);

    // An absent session is not a misconfiguration — warning here would be noise
    // on every unauthenticated request.
    expect(warnSpy).not.toHaveBeenCalled();
  });
});
