import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

const {
  mockGetUser,
  mockUpdateSession,
  mockCreateMiddlewareClient,
  mockGetUserRoleService,
  mockResolveRoleRedirectPath,
} = vi.hoisted(() => {
  return {
    mockGetUser: vi.fn(),
    mockUpdateSession: vi.fn(),
    mockCreateMiddlewareClient: vi.fn(() => ({
      auth: {
        getUser: vi.fn(),
      },
    })),
    mockGetUserRoleService: vi.fn(),
    mockResolveRoleRedirectPath: vi.fn((role: string | null | undefined) =>
      role === "guest" ? "/" : "/dashboard",
    ),
  };
});

vi.mock("@enterprise/core/supabase/middleware", () => ({
  createMiddlewareClient: mockCreateMiddlewareClient,
  updateSession: mockUpdateSession,
}));

vi.mock("@enterprise/core/services/auth-service", () => ({
  getUserRoleService: mockGetUserRoleService,
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
    mockGetUserRoleService.mockResolvedValue({ success: true, data: { role: "member" } });
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

  it("authenticated request to / redirects to role home (/dashboard for owner/admin/member, / for guest)", async () => {
    mockGetUser.mockResolvedValue({ data: { user: { id: "user-1" } } });

    const { middleware } = await loadMiddleware();

    mockGetUserRoleService.mockResolvedValueOnce({ success: true, data: { role: "owner" } });
    const ownerResult = await middleware(createRequest("/"));
    expectRedirectPath(ownerResult, "/dashboard");

    mockGetUserRoleService.mockResolvedValueOnce({ success: true, data: { role: "guest" } });
    const guestResult = await middleware(createRequest("/"));
    expectRedirectPath(guestResult, "/");
  });

  it("authenticated request with missing profile defaults to guest and redirects to / for public-entry routes", async () => {
    mockGetUser.mockResolvedValue({ data: { user: { id: "user-1" } } });
    mockGetUserRoleService.mockResolvedValue({
      success: false,
      error: "Could not load user role",
      code: "ROLE_LOOKUP_FAILED",
    });

    const { middleware } = await loadMiddleware();
    const result = await middleware(createRequest("/sign-in"));

    expectRedirectPath(result, "/");
  });

  it("authenticated server action POST to a public route does not redirect", async () => {
    mockGetUser.mockResolvedValue({ data: { user: { id: "user-1" } } });
    mockGetUserRoleService.mockResolvedValue({ success: true, data: { role: "member" } });

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
