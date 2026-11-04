import type { NextRequest, NextResponse } from "next/server";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { SupabaseSessionAdapter } from "../supabase-session-adapter";

const { mockUpdateSession } = vi.hoisted(() => ({
  mockUpdateSession: vi.fn(),
}));

vi.mock("../../../supabase/middleware", () => ({
  updateSession: mockUpdateSession,
}));

const FAKE_RESPONSE = { status: 200 } as unknown as NextResponse;
const FAKE_REQUEST = {} as NextRequest;

const ENV_URL = "NEXT_PUBLIC_SUPABASE_URL";
const ENV_KEY = "NEXT_PUBLIC_SUPABASE_ANON_KEY";

let originalUrl: string | undefined;
let originalKey: string | undefined;

beforeEach(() => {
  vi.clearAllMocks();

  originalUrl = process.env[ENV_URL];
  originalKey = process.env[ENV_KEY];

  mockUpdateSession.mockResolvedValue({
    response: FAKE_RESPONSE,
    userId: "user-1",
    verifiedLocally: true,
  });
});

afterEach(() => {
  if (originalUrl === undefined) {
    delete process.env[ENV_URL];
  } else {
    process.env[ENV_URL] = originalUrl;
  }

  if (originalKey === undefined) {
    delete process.env[ENV_KEY];
  } else {
    process.env[ENV_KEY] = originalKey;
  }
});

describe("SupabaseSessionAdapter.refreshSession", () => {
  it("returns the response, subject, and verification flag from updateSession", async () => {
    const adapter = new SupabaseSessionAdapter("https://project.supabase.co", "anon-key");

    const result = await adapter.refreshSession(FAKE_REQUEST);

    expect(result.response).toBe(FAKE_RESPONSE);
    expect(result.userId).toBe("user-1");
    expect(result.verifiedLocally).toBe(true);
  });

  it("propagates a null subject for unauthenticated requests", async () => {
    mockUpdateSession.mockResolvedValue({
      response: FAKE_RESPONSE,
      userId: null,
      verifiedLocally: false,
    });
    const adapter = new SupabaseSessionAdapter("https://project.supabase.co", "anon-key");

    const result = await adapter.refreshSession(FAKE_REQUEST);

    expect(result.userId).toBeNull();
  });

  it("propagates verifiedLocally false so callers can surface the remote fallback", async () => {
    mockUpdateSession.mockResolvedValue({
      response: FAKE_RESPONSE,
      userId: "user-1",
      verifiedLocally: false,
    });
    const adapter = new SupabaseSessionAdapter("https://project.supabase.co", "anon-key");

    const result = await adapter.refreshSession(FAKE_REQUEST);

    expect(result.verifiedLocally).toBe(false);
  });

  it("passes explicit constructor credentials through to updateSession", async () => {
    const adapter = new SupabaseSessionAdapter("https://explicit.supabase.co", "explicit-key");

    await adapter.refreshSession(FAKE_REQUEST);

    expect(mockUpdateSession).toHaveBeenCalledWith(FAKE_REQUEST, {
      supabaseUrl: "https://explicit.supabase.co",
      supabaseAnonKey: "explicit-key",
    });
  });

  it("resolves credentials from env lazily when none were supplied", async () => {
    process.env[ENV_URL] = "https://from-env.supabase.co";
    process.env[ENV_KEY] = "env-key";

    // Constructed with no credentials — this is how createBackendAdapters() builds it
    // at module load, before env is guaranteed to be present.
    const adapter = new SupabaseSessionAdapter();

    await adapter.refreshSession(FAKE_REQUEST);

    expect(mockUpdateSession).toHaveBeenCalledWith(FAKE_REQUEST, {
      supabaseUrl: "https://from-env.supabase.co",
      supabaseAnonKey: "env-key",
    });
  });

  it("throws a descriptive error when credentials are missing entirely", async () => {
    delete process.env[ENV_URL];
    delete process.env[ENV_KEY];

    const adapter = new SupabaseSessionAdapter();

    await expect(adapter.refreshSession(FAKE_REQUEST)).rejects.toThrow(
      /Missing NEXT_PUBLIC_SUPABASE_URL/,
    );
  });
});
