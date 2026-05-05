import type { SupabaseClient } from "@supabase/supabase-js";
import { describe, expect, it, vi } from "vitest";
import { createPlatformServiceContext, ProfileService, TenantService } from "../index";

function createContext(db: SupabaseClient) {
  return createPlatformServiceContext(db, {
    userId: "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
    tenantId: "b1b2c3d4-e5f6-7890-abcd-ef1234567890",
    role: "owner",
    email: "owner@enterprise.dev",
  });
}

describe("platform services", () => {
  it("TenantService.getCurrent parses JSON settings into object", async () => {
    const singleMock = vi.fn().mockResolvedValue({
      data: {
        id: "b1b2c3d4-e5f6-7890-abcd-ef1234567890",
        name: "Enterprise",
        slug: "enterprise",
        status: "active",
        settings: '{"theme":"dark"}',
        created_at: "2026-01-01T00:00:00.000Z",
        updated_at: "2026-01-01T00:00:00.000Z",
      },
      error: null,
    });
    const eqMock = vi.fn().mockReturnValue({ single: singleMock });
    const selectMock = vi.fn().mockReturnValue({ eq: eqMock });
    const fromMock = vi.fn().mockReturnValue({ select: selectMock });
    const db = { from: fromMock } as unknown as SupabaseClient;

    const service = new TenantService(createContext(db));
    const result = await service.getCurrent();

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.settings).toEqual({ theme: "dark" });
    }
  });

  it("ProfileService.updateSelf returns PROFILE_NOT_FOUND when mutation returns null row", async () => {
    const singleMock = vi.fn().mockResolvedValue({ data: null, error: null });
    const selectMock = vi.fn().mockReturnValue({ single: singleMock });
    const eqMock = vi.fn().mockReturnValue({ select: selectMock });
    const updateMock = vi.fn().mockReturnValue({ eq: eqMock });
    const fromMock = vi.fn().mockReturnValue({ update: updateMock });
    const db = { from: fromMock } as unknown as SupabaseClient;

    const service = new ProfileService(createContext(db));
    const result = await service.updateSelf({ name: "Updated" });

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.code).toBe("PROFILE_NOT_FOUND");
    }
  });
});
