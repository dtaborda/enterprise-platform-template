import { beforeEach, describe, expect, it, vi } from "vitest";
import { createRedirectError, REDIRECT_SENTINEL } from "../../test-utils/redirect";

const { mockGetServerClient, mockRedirect, mockGetCurrentPlatformUserService } = vi.hoisted(() => {
  return {
    mockGetServerClient: vi.fn(),
    mockRedirect: vi.fn((path: string) => {
      throw createRedirectError(path);
    }),
    mockGetCurrentPlatformUserService: vi.fn(),
  };
});

vi.mock("server-only", () => ({}));

vi.mock("@enterprise/core/services/auth-service", () => ({
  getCurrentPlatformUserService: mockGetCurrentPlatformUserService,
}));

vi.mock("@enterprise/core/supabase/server", () => ({
  getServerClient: mockGetServerClient,
}));

vi.mock("next/navigation", () => ({
  redirect: mockRedirect,
}));

async function loadQueries() {
  vi.resetModules();
  return import("./queries");
}

describe("queries", () => {
  beforeEach(() => {
    mockGetServerClient.mockResolvedValue({});
  });

  describe("getCurrentUser", () => {
    it("unauthenticated user returns null", async () => {
      mockGetCurrentPlatformUserService.mockResolvedValue({ success: true, data: null });

      const { getCurrentUser } = await loadQueries();
      const result = await getCurrentUser();

      expect(result).toBeNull();
    });

    it("authenticated user with profile returns mapped PlatformUser fields", async () => {
      mockGetCurrentPlatformUserService.mockResolvedValue({
        success: true,
        data: {
          id: "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
          createdAt: new Date("2024-01-01T00:00:00.000Z"),
          updatedAt: new Date("2024-01-02T00:00:00.000Z"),
          email: "member@enterprise.dev",
          tenantId: "b1b2c3d4-e5f6-7890-abcd-ef1234567890",
          role: "member",
          name: "Member User",
          avatarUrl: "https://example.com/avatar.png",
        },
      });

      const { getCurrentUser } = await loadQueries();
      const result = await getCurrentUser();

      expect(result).toMatchObject({
        id: "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
        email: "member@enterprise.dev",
        name: "Member User",
        avatarUrl: "https://example.com/avatar.png",
        role: "member",
        tenantId: "b1b2c3d4-e5f6-7890-abcd-ef1234567890",
      });
    });

    it("authenticated user without profile returns fallback values", async () => {
      mockGetCurrentPlatformUserService.mockResolvedValue({
        success: true,
        data: {
          id: "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
          createdAt: new Date("2024-01-01T00:00:00.000Z"),
          updatedAt: new Date("2024-01-02T00:00:00.000Z"),
          email: "guest@enterprise.dev",
          role: "guest",
          name: null,
          avatarUrl: null,
          tenantId: "",
        },
      });

      const { getCurrentUser } = await loadQueries();
      const result = await getCurrentUser();

      expect(result).toMatchObject({
        role: "guest",
        name: null,
        avatarUrl: null,
        tenantId: "",
      });
    });
  });

  describe("requireAuth", () => {
    it("unauthenticated user triggers redirect('/sign-in')", async () => {
      mockGetCurrentPlatformUserService.mockResolvedValue({ success: true, data: null });

      const { requireAuth } = await loadQueries();

      await expect(requireAuth()).rejects.toMatchObject({
        digest: `${REDIRECT_SENTINEL};/sign-in`,
      });
    });

    it("authenticated user returns resolved PlatformUser", async () => {
      mockGetCurrentPlatformUserService.mockResolvedValue({
        success: true,
        data: {
          id: "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
          createdAt: new Date("2024-01-01T00:00:00.000Z"),
          updatedAt: new Date("2024-01-02T00:00:00.000Z"),
          email: "member@enterprise.dev",
          tenantId: "b1b2c3d4-e5f6-7890-abcd-ef1234567890",
          role: "member",
          name: "Member User",
          avatarUrl: null,
        },
      });

      const { requireAuth } = await loadQueries();
      const user = await requireAuth();

      expect(user).toMatchObject({
        email: "member@enterprise.dev",
        role: "member",
      });
    });
  });
});
