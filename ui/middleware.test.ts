import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

const { mockGetUser, mockSingle, mockUpdateSession } = vi.hoisted(() => ({
  mockGetUser: vi.fn(),
  mockSingle: vi.fn(),
  mockUpdateSession: vi.fn(),
}));

vi.mock("@enterprise/core/supabase/middleware", () => ({
  createMiddlewareClient: vi.fn(() => ({
    auth: {
      getUser: mockGetUser,
    },
    from: vi.fn(() => ({
      select: vi.fn(() => ({
        eq: vi.fn(() => ({
          single: mockSingle,
        })),
      })),
    })),
  })),
  updateSession: mockUpdateSession,
}));

import { middleware } from "./middleware";

function createRequest(pathname: string): NextRequest {
  return {
    nextUrl: new URL(`https://example.com${pathname}`),
    url: `https://example.com${pathname}`,
  } as unknown as NextRequest;
}

describe("middleware auth flow", () => {
  beforeEach(() => {
    mockGetUser.mockResolvedValue({ data: { user: { id: "user-1" } } });
    mockSingle.mockResolvedValue({ data: { role: "member" } });
    mockUpdateSession.mockResolvedValue(NextResponse.next());
  });

  it("keeps recovery completion route accessible after callback session", async () => {
    const result = await middleware(createRequest("/reset-password"));

    expect(result.headers.get("location")).toBeNull();
  });

  it("keeps auth callback route accessible for authenticated users", async () => {
    const result = await middleware(createRequest("/auth/callback"));

    expect(result.headers.get("location")).toBeNull();
  });

  it("still redirects authenticated users away from sign-in", async () => {
    const result = await middleware(createRequest("/sign-in"));
    const redirectLocation = result.headers.get("location");

    expect(redirectLocation).not.toBeNull();
    expect(new URL(redirectLocation ?? "https://example.com").pathname).toBe("/dashboard");
  });
});
