import type { NextRequest } from "next/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

const { mockGetServerClient, mockVerifyOtp, mockGetUser, mockExchangeCodeForSession } = vi.hoisted(
  () => ({
    mockGetServerClient: vi.fn(),
    mockVerifyOtp: vi.fn(),
    mockGetUser: vi.fn(),
    mockExchangeCodeForSession: vi.fn(),
  }),
);

vi.mock("@enterprise/core/supabase/server", () => ({
  getServerClient: mockGetServerClient,
}));

function createRequest(path: string): NextRequest {
  const url = `https://example.com${path}`;
  return {
    nextUrl: new URL(url),
    url,
  } as unknown as NextRequest;
}

async function loadRoute() {
  vi.resetModules();
  return import("./route");
}

describe("auth callback route", () => {
  beforeEach(() => {
    mockVerifyOtp.mockClear();
    mockGetUser.mockClear();
    mockExchangeCodeForSession.mockClear();

    mockGetServerClient.mockResolvedValue({
      auth: {
        verifyOtp: mockVerifyOtp,
        getUser: mockGetUser,
        exchangeCodeForSession: mockExchangeCodeForSession,
      },
    });
    mockVerifyOtp.mockResolvedValue({ error: null });
    mockGetUser.mockResolvedValue({ data: { user: null } });
    mockExchangeCodeForSession.mockResolvedValue({ error: null });
  });

  it("missing token_hash redirects to /sign-in?error=invalidCallback", async () => {
    const { GET } = await loadRoute();

    const response = await GET(createRequest("/auth/callback?type=recovery"));

    expect(new URL(response.headers.get("location") ?? "").pathname).toBe("/sign-in");
    expect(new URL(response.headers.get("location") ?? "").searchParams.get("error")).toBe(
      "invalidCallback",
    );
  });

  it("missing type redirects to /sign-in?error=invalidCallback", async () => {
    const { GET } = await loadRoute();

    const response = await GET(createRequest("/auth/callback?token_hash=token"));

    expect(new URL(response.headers.get("location") ?? "").pathname).toBe("/sign-in");
    expect(new URL(response.headers.get("location") ?? "").searchParams.get("error")).toBe(
      "invalidCallback",
    );
  });

  it("unsupported type redirects to /sign-in?error=invalidCallback", async () => {
    const { GET } = await loadRoute();

    const response = await GET(createRequest("/auth/callback?token_hash=token&type=invalid"));

    expect(new URL(response.headers.get("location") ?? "").pathname).toBe("/sign-in");
    expect(new URL(response.headers.get("location") ?? "").searchParams.get("error")).toBe(
      "invalidCallback",
    );
  });

  it("OTP verification error redirects to /sign-in?error=callbackFailed", async () => {
    const { GET } = await loadRoute();
    mockVerifyOtp.mockResolvedValue({ error: { message: "failed" } });

    const response = await GET(createRequest("/auth/callback?token_hash=token&type=recovery"));

    expect(new URL(response.headers.get("location") ?? "").pathname).toBe("/sign-in");
    expect(new URL(response.headers.get("location") ?? "").searchParams.get("error")).toBe(
      "callbackFailed",
    );
  });

  it("type=recovery without next redirects to /reset-password", async () => {
    const { GET } = await loadRoute();

    const response = await GET(createRequest("/auth/callback?token_hash=token&type=recovery"));

    expect(new URL(response.headers.get("location") ?? "").pathname).toBe("/reset-password");
  });

  it("type=recovery with safe next redirects to provided path", async () => {
    const { GET } = await loadRoute();

    const response = await GET(
      createRequest("/auth/callback?token_hash=token&type=recovery&next=/dashboard/settings"),
    );

    expect(new URL(response.headers.get("location") ?? "").pathname).toBe("/dashboard/settings");
  });

  it("type=signup success redirects to /dashboard when next missing", async () => {
    const { GET } = await loadRoute();

    const response = await GET(createRequest("/auth/callback?token_hash=token&type=signup"));

    expect(new URL(response.headers.get("location") ?? "").pathname).toBe("/dashboard");
  });

  it("type=email_change success redirects to /dashboard when next missing", async () => {
    const { GET } = await loadRoute();

    const response = await GET(createRequest("/auth/callback?token_hash=token&type=email_change"));

    expect(new URL(response.headers.get("location") ?? "").pathname).toBe("/dashboard");
  });

  it("PKCE callback with next and active session redirects to safe next path", async () => {
    const { GET } = await loadRoute();
    mockGetUser.mockResolvedValue({ data: { user: { id: "user-1" } } });

    const response = await GET(createRequest("/auth/callback?next=/reset-password"));

    expect(mockVerifyOtp).not.toHaveBeenCalled();
    expect(new URL(response.headers.get("location") ?? "").pathname).toBe("/reset-password");
  });

  it("code exchange callback redirects to safe next path", async () => {
    const { GET } = await loadRoute();

    const response = await GET(createRequest("/auth/callback?code=abc123&next=/reset-password"));

    expect(mockExchangeCodeForSession).toHaveBeenCalledWith("abc123");
    expect(new URL(response.headers.get("location") ?? "").pathname).toBe("/reset-password");
  });
});
