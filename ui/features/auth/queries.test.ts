import { beforeEach, describe, expect, it, vi } from "vitest";
import { createRedirectError, REDIRECT_SENTINEL } from "../../test-utils/redirect";

const { mockGetServerClient, mockRedirect, mockGetUser, chain } = vi.hoisted(() => {
  const singleMock = vi.fn();
  const eqMock = vi.fn(() => ({ single: singleMock }));
  const selectMock = vi.fn(() => ({ eq: eqMock }));
  const fromMock = vi.fn(() => ({ select: selectMock }));
  const chain = { fromMock, selectMock, eqMock, singleMock };

  return {
    mockGetServerClient: vi.fn(),
    mockRedirect: vi.fn((path: string) => {
      throw createRedirectError(path);
    }),
    mockGetUser: vi.fn(),
    chain,
  };
});

vi.mock("server-only", () => ({}));

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
    mockGetServerClient.mockResolvedValue({
      auth: {
        getUser: mockGetUser,
      },
      from: chain.fromMock,
    });
  });

  describe("getCurrentUser", () => {
    it("unauthenticated user returns null", async () => {
      mockGetUser.mockResolvedValue({ data: { user: null } });

      const { getCurrentUser } = await loadQueries();
      const result = await getCurrentUser();

      expect(result).toBeNull();
    });

    it("authenticated user with profile returns mapped PlatformUser fields", async () => {
      mockGetUser.mockResolvedValue({
        data: {
          user: {
            id: "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
            created_at: "2024-01-01T00:00:00.000Z",
            updated_at: "2024-01-02T00:00:00.000Z",
            email: "member@enterprise.dev",
          },
        },
      });
      chain.singleMock.mockResolvedValue({
        data: {
          tenant_id: "b1b2c3d4-e5f6-7890-abcd-ef1234567890",
          role: "member",
          name: "Member User",
          avatar_url: "https://example.com/avatar.png",
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
      expect(result?.createdAt).toBeInstanceOf(Date);
      expect(result?.updatedAt).toBeInstanceOf(Date);
    });

    it("authenticated user without profile returns fallback values", async () => {
      mockGetUser.mockResolvedValue({
        data: {
          user: {
            id: "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
            created_at: "2024-01-01T00:00:00.000Z",
            updated_at: "2024-01-02T00:00:00.000Z",
            email: "guest@enterprise.dev",
          },
        },
      });
      chain.singleMock.mockResolvedValue({ data: null });

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
      mockGetUser.mockResolvedValue({ data: { user: null } });

      const { requireAuth } = await loadQueries();

      await expect(requireAuth()).rejects.toMatchObject({
        digest: `${REDIRECT_SENTINEL};/sign-in`,
      });
    });

    it("authenticated user returns resolved PlatformUser", async () => {
      mockGetUser.mockResolvedValue({
        data: {
          user: {
            id: "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
            created_at: "2024-01-01T00:00:00.000Z",
            updated_at: "2024-01-02T00:00:00.000Z",
            email: "member@enterprise.dev",
          },
        },
      });
      chain.singleMock.mockResolvedValue({
        data: {
          tenant_id: "b1b2c3d4-e5f6-7890-abcd-ef1234567890",
          role: "member",
          name: "Member User",
          avatar_url: null,
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
