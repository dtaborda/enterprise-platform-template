import { readFile } from "node:fs/promises";
import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

const { mockUpdateSession, mockResolveRoleRedirectPath } = vi.hoisted(() => {
  return {
    mockUpdateSession: vi.fn(),
    // Mirrors the real resolveRoleRedirectPath: every role shares one home path.
    mockResolveRoleRedirectPath: vi.fn(() => "/dashboard"),
  };
});

// updateSession() is the single auth touchpoint the middleware has. Mocking the
// module it lives in means any additional auth call the middleware might make
// would have to come from somewhere else — which these tests assert it does not.
vi.mock("@enterprise/core/supabase/middleware", () => ({
  updateSession: mockUpdateSession,
}));

vi.mock("@enterprise/core/services/auth-service", () => ({
  resolveRoleRedirectPath: mockResolveRoleRedirectPath,
}));

interface CreateRequestOptions {
  method?: string;
  headers?: Record<string, string>;
}

function createRequest(pathname: string, options?: CreateRequestOptions): NextRequest {
  return {
    nextUrl: new URL(`https://example.com${pathname}`),
    url: `https://example.com${pathname}`,
    method: options?.method ?? "GET",
    headers: new Headers(options?.headers),
  } as unknown as NextRequest;
}

/** Makes refreshSession() report an authenticated subject. */
function givenAuthenticated(userId = "user-1"): void {
  mockUpdateSession.mockResolvedValue({
    response: NextResponse.next(),
    userId,
    verifiedLocally: true,
  });
}

/** Makes refreshSession() report no session. */
function givenUnauthenticated(): void {
  mockUpdateSession.mockResolvedValue({
    response: NextResponse.next(),
    userId: null,
    verifiedLocally: false,
  });
}

async function loadMiddleware() {
  vi.resetModules();

  process.env["NEXT_PUBLIC_SUPABASE_URL"] = "https://example.supabase.co";
  process.env["NEXT_PUBLIC_SUPABASE_ANON_KEY"] = "anon-key";

  return import("./middleware");
}

function expectRedirectPath(response: NextResponse, expectedPath: string): void {
  const location = response.headers.get("location");
  expect(location).not.toBeNull();
  if (!location) return;

  expect(new URL(location).pathname).toBe(expectedPath);
}

describe("middleware auth flow", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockResolveRoleRedirectPath.mockReturnValue("/dashboard");
    givenUnauthenticated();
  });

  it("unauthenticated request to a public route (e.g., /sign-in) returns pass-through response", async () => {
    const { middleware } = await loadMiddleware();
    const result = await middleware(createRequest("/sign-in"));

    expect(result.headers.get("location")).toBeNull();
  });

  it("unauthenticated request to protected route redirects to /sign-in?redirectTo=<pathname>", async () => {
    const { middleware } = await loadMiddleware();
    const result = await middleware(createRequest("/dashboard/settings"));

    const location = result.headers.get("location");
    expect(location).not.toBeNull();
    if (!location) return;

    const url = new URL(location);
    expect(url.pathname).toBe("/sign-in");
    expect(url.searchParams.get("redirectTo")).toBe("/dashboard/settings");
  });

  it("unauthenticated request to / returns pass-through response", async () => {
    const { middleware } = await loadMiddleware();
    const result = await middleware(createRequest("/"));

    expect(result.headers.get("location")).toBeNull();
  });

  it("authenticated request to / redirects to the shared role home", async () => {
    givenAuthenticated();

    const { middleware } = await loadMiddleware();
    const result = await middleware(createRequest("/"));

    expectRedirectPath(result, "/dashboard");
  });

  it("resolves the role home without a per-user role lookup", async () => {
    givenAuthenticated();

    const { middleware } = await loadMiddleware();
    await middleware(createRequest("/"));

    // All roles share one home path, so the middleware resolves from null instead
    // of querying the database. Guarded by the resolveRoleRedirectPath unit test in
    // packages/core/src/services/__tests__/auth-service.test.ts.
    expect(mockResolveRoleRedirectPath).toHaveBeenCalledWith(null);
  });

  it("authenticated request already on the role home returns pass-through response", async () => {
    givenAuthenticated();

    const { middleware } = await loadMiddleware();
    const result = await middleware(createRequest("/dashboard"));

    expect(result.headers.get("location")).toBeNull();
  });

  it("authenticated request to a public entry route redirects to the role home", async () => {
    givenAuthenticated();

    const { middleware } = await loadMiddleware();
    const result = await middleware(createRequest("/sign-in"));

    expectRedirectPath(result, "/dashboard");
  });

  it("authenticated server action POST to a public route does not redirect", async () => {
    givenAuthenticated();

    const { middleware } = await loadMiddleware();
    const result = await middleware(
      createRequest("/sign-in", {
        method: "POST",
        headers: {
          "next-action": "server-action-id",
        },
      }),
    );

    expect(result.headers.get("location")).toBeNull();
  });
});

describe("middleware performs exactly one token validation", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockResolveRoleRedirectPath.mockReturnValue("/dashboard");
  });

  it("validates the session once for an authenticated navigation", async () => {
    givenAuthenticated();

    const { middleware } = await loadMiddleware();
    await middleware(createRequest("/dashboard"));

    // Before local verification landed, middleware validated the token twice:
    // once inside refreshSession() and once again via its own getUser() call.
    expect(mockUpdateSession).toHaveBeenCalledTimes(1);
  });

  it("validates the session once for an unauthenticated navigation", async () => {
    givenUnauthenticated();

    const { middleware } = await loadMiddleware();
    await middleware(createRequest("/dashboard/settings"));

    expect(mockUpdateSession).toHaveBeenCalledTimes(1);
  });

  it("derives identity solely from the refreshSession result", async () => {
    givenAuthenticated("user-from-claims");

    const { middleware } = await loadMiddleware();
    const result = await middleware(createRequest("/"));

    // The only source of identity is refreshSession(). If the middleware had its
    // own auth client, this redirect would not depend on that mocked value.
    expectRedirectPath(result, "/dashboard");
    expect(mockUpdateSession).toHaveBeenCalledTimes(1);
  });

  it("contains no second auth call in its source", async () => {
    const source = await readFile(new URL("./middleware.ts", import.meta.url), "utf8");

    // Structural guard. The behavioural tests above prove the middleware works with
    // one validation; this proves nobody quietly added a second one back. Reverting
    // to getUser() here reintroduces a ~290ms edge-to-origin round trip on every
    // authenticated navigation — see packages/core/AGENTS.md, "Supabase Clients".
    expect(source).not.toContain("getUser(");
    expect(source).not.toContain("createServerClient");
    expect(source).not.toContain("createMiddlewareClient");
  });
});
