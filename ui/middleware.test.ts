import type { UserRole } from "@enterprise/contracts";
import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

const { mockGetUser, mockUpdateSession, chain, mockCreateMiddlewareClient } = vi.hoisted(() => {
  const singleMock = vi.fn();
  const eqMock = vi.fn(() => ({ single: singleMock }));
  const selectMock = vi.fn(() => ({ eq: eqMock }));
  const fromMock = vi.fn(() => ({ select: selectMock }));
  const chain = { fromMock, selectMock, eqMock, singleMock };

  return {
    mockGetUser: vi.fn(),
    mockUpdateSession: vi.fn(),
    chain,
    mockCreateMiddlewareClient: vi.fn(() => ({
      auth: {
        getUser: vi.fn(),
      },
      from: vi.fn(),
    })),
  };
});

vi.mock("@enterprise/core/supabase/middleware", () => ({
  createMiddlewareClient: mockCreateMiddlewareClient,
  updateSession: mockUpdateSession,
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
    from: chain.fromMock,
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
    chain.singleMock.mockResolvedValue({ data: { role: "member" }, error: null });
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

    const roleCases: Array<{ role: UserRole; expected: string }> = [
      { role: "owner", expected: "/dashboard" },
      { role: "admin", expected: "/dashboard" },
      { role: "member", expected: "/dashboard" },
      { role: "guest", expected: "/" },
    ];

    for (const roleCase of roleCases) {
      chain.singleMock.mockResolvedValueOnce({ data: { role: roleCase.role }, error: null });
      const result = await middleware(createRequest("/"));
      expectRedirectPath(result, roleCase.expected);
    }
  });

  it("authenticated request with missing profile defaults to guest and redirects to / for public-entry routes", async () => {
    mockGetUser.mockResolvedValue({ data: { user: { id: "user-1" } } });
    chain.singleMock.mockResolvedValue({ data: null, error: { message: "not found" } });

    const { middleware } = await loadMiddleware();
    const result = await middleware(createRequest("/sign-in"));

    expectRedirectPath(result, "/");
  });

  it("authenticated server action POST to a public route does not redirect", async () => {
    mockGetUser.mockResolvedValue({ data: { user: { id: "user-1" } } });
    chain.singleMock.mockResolvedValue({ data: { role: "member" }, error: null });

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
