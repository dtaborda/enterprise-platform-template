import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

const { mockGetUser, mockUpdateSession, mockCreateMiddlewareClient, mockResolveRoleRedirectPath } =
  vi.hoisted(() => {
    return {
      mockGetUser: vi.fn(),
      mockUpdateSession: vi.fn(),
      mockCreateMiddlewareClient: vi.fn(() => ({
        auth: {
          getUser: vi.fn(),
        },
      })),
      // Mirrors the real resolveRoleRedirectPath: every role shares one home path.
      mockResolveRoleRedirectPath: vi.fn(() => "/dashboard"),
    };
  });

vi.mock("@enterprise/core/supabase/middleware", () => ({
  createMiddlewareClient: mockCreateMiddlewareClient,
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

async function loadMiddleware() {
  vi.resetModules();

  process.env["NEXT_PUBLIC_SUPABASE_URL"] = "https://example.supabase.co";
  process.env["NEXT_PUBLIC_SUPABASE_ANON_KEY"] = "anon-key";

  mockCreateMiddlewareClient.mockReturnValue({
    auth: {
      getUser: mockGetUser,
    },
  });

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
    mockUpdateSession.mockResolvedValue(NextResponse.next());
    mockResolveRoleRedirectPath.mockClear();
  });

  it("unauthenticated request to a public route (e.g., /sign-in) returns pass-through response", async () => {
    mockGetUser.mockResolvedValue({ data: { user: null } });

    const { middleware } = await loadMiddleware();
    const result = await middleware(createRequest("/sign-in"));

    expect(result.headers.get("location")).toBeNull();
  });

  it("unauthenticated request to protected route redirects to /sign-in?redirectTo=<pathname>", async () => {
    mockGetUser.mockResolvedValue({ data: { user: null } });

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
    mockGetUser.mockResolvedValue({ data: { user: null } });

    const { middleware } = await loadMiddleware();
    const result = await middleware(createRequest("/"));

    expect(result.headers.get("location")).toBeNull();
  });

  it("authenticated request to / redirects to the shared role home", async () => {
    mockGetUser.mockResolvedValue({ data: { user: { id: "user-1" } } });

    const { middleware } = await loadMiddleware();
    const result = await middleware(createRequest("/"));

    expectRedirectPath(result, "/dashboard");
  });

  it("resolves the role home without a per-user role lookup", async () => {
    mockGetUser.mockResolvedValue({ data: { user: { id: "user-1" } } });

    const { middleware } = await loadMiddleware();
    await middleware(createRequest("/"));

    // All roles share one home path, so the middleware resolves from null instead
    // of querying the database. Guarded by the resolveRoleRedirectPath unit test in
    // packages/core/src/services/__tests__/auth-service.test.ts.
    expect(mockResolveRoleRedirectPath).toHaveBeenCalledWith(null);
  });

  it("authenticated request already on the role home returns pass-through response", async () => {
    mockGetUser.mockResolvedValue({ data: { user: { id: "user-1" } } });

    const { middleware } = await loadMiddleware();
    const result = await middleware(createRequest("/dashboard"));

    expect(result.headers.get("location")).toBeNull();
  });

  it("authenticated request to a public entry route redirects to the role home", async () => {
    mockGetUser.mockResolvedValue({ data: { user: { id: "user-1" } } });

    const { middleware } = await loadMiddleware();
    const result = await middleware(createRequest("/sign-in"));

    expectRedirectPath(result, "/dashboard");
  });

  it("authenticated server action POST to a public route does not redirect", async () => {
    mockGetUser.mockResolvedValue({ data: { user: { id: "user-1" } } });

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
