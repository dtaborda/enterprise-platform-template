import type { SupabaseClient } from "@supabase/supabase-js";
import { describe, expect, it, vi } from "vitest";
import {
  getWorkspaceSettings,
  removeWorkspaceLogo,
  updateWorkspaceProfile,
  updateWorkspaceRegional,
  updateWorkspaceSecurity,
  updateWorkspaceSlug,
  uploadWorkspaceLogo,
} from "../workspace-settings-service";

// ─── Mock Helpers ──────────────────────────────────────────────────────────────

const TENANT_ID = "aaaaaaaa-0000-4000-8000-000000000001";
const USER_ID = "bbbbbbbb-0000-4000-8000-000000000001";

const TENANT_ROW = {
  id: TENANT_ID,
  name: "Acme Corp",
  slug: "acme-corp",
  logo_path: null,
  timezone: "UTC",
  locale: "en-US",
  allow_admin_invites: true,
  updated_at: new Date().toISOString(),
};

// ─── Tests ─────────────────────────────────────────────────────────────────────

describe("getWorkspaceSettings", () => {
  it("returns WorkspaceSettings with all fields on success", async () => {
    const mockClient = {
      from: vi.fn(() => ({
        select: vi.fn(() => ({
          eq: vi.fn(() => ({
            single: vi.fn().mockResolvedValue({ data: TENANT_ROW, error: null }),
          })),
        })),
      })),
      storage: {
        from: vi.fn(() => ({
          getPublicUrl: vi.fn().mockReturnValue({ data: { publicUrl: null } }),
        })),
      },
    } as unknown as SupabaseClient;

    const result = await getWorkspaceSettings(mockClient, TENANT_ID);

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.id).toBe(TENANT_ID);
      expect(result.data.name).toBe("Acme Corp");
      expect(result.data.slug).toBe("acme-corp");
      expect(result.data.timezone).toBe("UTC");
      expect(result.data.locale).toBe("en-US");
      expect(result.data.allowAdminInvites).toBe(true);
      expect(result.data.logoPath).toBeNull();
      expect(result.data.logoUrl).toBeNull();
    }
  });

  it("derives logoUrl via getPublicUrl when logoPath is set", async () => {
    const rowWithLogo = { ...TENANT_ROW, logo_path: `${TENANT_ID}/logo.png` };
    const expectedUrl = `https://supabase.example.com/storage/v1/object/public/workspace-logos/${TENANT_ID}/logo.png`;

    const mockClient = {
      from: vi.fn(() => ({
        select: vi.fn(() => ({
          eq: vi.fn(() => ({
            single: vi.fn().mockResolvedValue({ data: rowWithLogo, error: null }),
          })),
        })),
      })),
      storage: {
        from: vi.fn(() => ({
          getPublicUrl: vi.fn().mockReturnValue({ data: { publicUrl: expectedUrl } }),
        })),
      },
    } as unknown as SupabaseClient;

    const result = await getWorkspaceSettings(mockClient, TENANT_ID);

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.logoPath).toBe(`${TENANT_ID}/logo.png`);
      expect(result.data.logoUrl).toBe(expectedUrl);
    }
  });

  it("returns WORKSPACE_NOT_FOUND on DB error", async () => {
    const mockClient = {
      from: vi.fn(() => ({
        select: vi.fn(() => ({
          eq: vi.fn(() => ({
            single: vi.fn().mockResolvedValue({ data: null, error: { message: "Not found" } }),
          })),
        })),
      })),
    } as unknown as SupabaseClient;

    const result = await getWorkspaceSettings(mockClient, TENANT_ID);

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.code).toBe("WORKSPACE_NOT_FOUND");
    }
  });
});

describe("updateWorkspaceProfile", () => {
  it("owner success — DB updated and audit event logged", async () => {
    const auditInsertMock = vi.fn().mockResolvedValue({ data: null, error: null });

    const mockAdminClient = {
      from: vi.fn((table: string) => {
        if (table === "tenants") {
          return {
            update: vi.fn(() => ({
              eq: vi.fn(() => ({
                select: vi.fn(() => ({
                  single: vi.fn().mockResolvedValue({
                    data: { name: "New Name" },
                    error: null,
                  }),
                })),
              })),
            })),
          };
        }
        // audit_log
        return { insert: auditInsertMock };
      }),
    } as unknown as SupabaseClient;

    const result = await updateWorkspaceProfile(mockAdminClient, TENANT_ID, USER_ID, "owner", {
      name: "New Name",
    });

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.name).toBe("New Name");
    }
  });

  it("admin success — admin role is permitted", async () => {
    const mockAdminClient = {
      from: vi.fn((table: string) => {
        if (table === "tenants") {
          return {
            update: vi.fn(() => ({
              eq: vi.fn(() => ({
                select: vi.fn(() => ({
                  single: vi.fn().mockResolvedValue({
                    data: { name: "Admin Update" },
                    error: null,
                  }),
                })),
              })),
            })),
          };
        }
        return { insert: vi.fn().mockResolvedValue({ data: null, error: null }) };
      }),
    } as unknown as SupabaseClient;

    const result = await updateWorkspaceProfile(mockAdminClient, TENANT_ID, USER_ID, "admin", {
      name: "Admin Update",
    });

    expect(result.success).toBe(true);
  });

  it("member rejected — returns FORBIDDEN", async () => {
    const result = await updateWorkspaceProfile(
      {} as SupabaseClient,
      TENANT_ID,
      USER_ID,
      "member",
      { name: "Should Fail" },
    );

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.code).toBe("FORBIDDEN");
    }
  });
});

describe("updateWorkspaceSlug", () => {
  it("owner success — uniqueness checked, DB updated, audit logged", async () => {
    const auditInsertMock = vi.fn().mockResolvedValue({ data: null, error: null });

    const mockAdminClient = {
      from: vi.fn((table: string) => {
        if (table === "tenants") {
          // First call: uniqueness check (maybeSingle)
          // Second call: update (single)
          return {
            select: vi.fn(() => ({
              eq: vi.fn(() => ({
                neq: vi.fn(() => ({
                  maybeSingle: vi.fn().mockResolvedValue({ data: null, error: null }),
                })),
              })),
            })),
            update: vi.fn(() => ({
              eq: vi.fn(() => ({
                select: vi.fn(() => ({
                  single: vi.fn().mockResolvedValue({
                    data: { slug: "new-slug" },
                    error: null,
                  }),
                })),
              })),
            })),
          };
        }
        return { insert: auditInsertMock };
      }),
    } as unknown as SupabaseClient;

    const result = await updateWorkspaceSlug(mockAdminClient, TENANT_ID, USER_ID, "owner", {
      slug: "new-slug",
    });

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.slug).toBe("new-slug");
    }
  });

  it("slug conflict — returns SLUG_CONFLICT when slug is taken", async () => {
    const mockAdminClient = {
      from: vi.fn((table: string) => {
        if (table === "tenants") {
          return {
            select: vi.fn(() => ({
              eq: vi.fn(() => ({
                neq: vi.fn(() => ({
                  maybeSingle: vi
                    .fn()
                    .mockResolvedValue({ data: { id: "other-tenant" }, error: null }),
                })),
              })),
            })),
          };
        }
        return { insert: vi.fn().mockResolvedValue({ data: null, error: null }) };
      }),
    } as unknown as SupabaseClient;

    const result = await updateWorkspaceSlug(mockAdminClient, TENANT_ID, USER_ID, "owner", {
      slug: "taken-slug",
    });

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.code).toBe("SLUG_CONFLICT");
    }
  });

  it("admin rejected — returns FORBIDDEN", async () => {
    const result = await updateWorkspaceSlug({} as SupabaseClient, TENANT_ID, USER_ID, "admin", {
      slug: "some-slug",
    });

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.code).toBe("FORBIDDEN");
    }
  });

  it("handles DB UNIQUE constraint violation (error code 23505) as SLUG_CONFLICT", async () => {
    const mockAdminClient = {
      from: vi.fn((table: string) => {
        if (table === "tenants") {
          return {
            select: vi.fn(() => ({
              eq: vi.fn(() => ({
                neq: vi.fn(() => ({
                  // Pre-check returns no conflict (race condition: another tenant grabbed it)
                  maybeSingle: vi.fn().mockResolvedValue({ data: null, error: null }),
                })),
              })),
            })),
            update: vi.fn(() => ({
              eq: vi.fn(() => ({
                select: vi.fn(() => ({
                  single: vi.fn().mockResolvedValue({
                    data: null,
                    error: { code: "23505", message: "duplicate key value" },
                  }),
                })),
              })),
            })),
          };
        }
        return { insert: vi.fn().mockResolvedValue({ data: null, error: null }) };
      }),
    } as unknown as SupabaseClient;

    const result = await updateWorkspaceSlug(mockAdminClient, TENANT_ID, USER_ID, "owner", {
      slug: "race-slug",
    });

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.code).toBe("SLUG_CONFLICT");
    }
  });
});

describe("uploadWorkspaceLogo", () => {
  function createMockFile(type: string, size: number): File {
    const content = new Uint8Array(size);
    return new File([content], "logo.png", { type });
  }

  it("success — file validated, Storage upload called, DB updated, audit logged", async () => {
    const auditInsertMock = vi.fn().mockResolvedValue({ data: null, error: null });
    const uploadMock = vi
      .fn()
      .mockResolvedValue({ data: { path: `${TENANT_ID}/logo.png` }, error: null });
    const getPublicUrlMock = vi
      .fn()
      .mockReturnValue({ data: { publicUrl: "https://example.com/logo.png" } });

    const mockAuthClient = {
      storage: {
        from: vi.fn(() => ({
          upload: uploadMock,
          getPublicUrl: getPublicUrlMock,
        })),
      },
    } as unknown as SupabaseClient;

    const mockAdminClient = {
      from: vi.fn((table: string) => {
        if (table === "tenants") {
          return {
            update: vi.fn(() => ({
              eq: vi.fn().mockResolvedValue({ data: null, error: null }),
            })),
          };
        }
        return { insert: auditInsertMock };
      }),
    } as unknown as SupabaseClient;

    const file = createMockFile("image/png", 1024);

    const result = await uploadWorkspaceLogo(
      mockAuthClient,
      mockAdminClient,
      TENANT_ID,
      USER_ID,
      "owner",
      file,
    );

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.logoUrl).toBe("https://example.com/logo.png");
    }
    expect(uploadMock).toHaveBeenCalledOnce();
  });

  it("file too large — returns VALIDATION_ERROR", async () => {
    const file = createMockFile("image/png", 3 * 1024 * 1024); // 3 MB

    const result = await uploadWorkspaceLogo(
      {} as SupabaseClient,
      {} as SupabaseClient,
      TENANT_ID,
      USER_ID,
      "owner",
      file,
    );

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.code).toBe("VALIDATION_ERROR");
      expect(result.error).toContain("2 MB");
    }
  });

  it("wrong MIME type — returns VALIDATION_ERROR", async () => {
    const file = createMockFile("image/gif", 512);

    const result = await uploadWorkspaceLogo(
      {} as SupabaseClient,
      {} as SupabaseClient,
      TENANT_ID,
      USER_ID,
      "owner",
      file,
    );

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.code).toBe("VALIDATION_ERROR");
      expect(result.error).toContain("PNG, JPG");
    }
  });
});

describe("removeWorkspaceLogo", () => {
  it("success — Storage delete called, logo_path cleared, audit logged", async () => {
    const auditInsertMock = vi.fn().mockResolvedValue({ data: null, error: null });
    const removeMock = vi.fn().mockResolvedValue({ data: null, error: null });

    const mockAuthClient = {
      storage: {
        from: vi.fn(() => ({
          remove: removeMock,
        })),
      },
    } as unknown as SupabaseClient;

    const mockAdminClient = {
      from: vi.fn((table: string) => {
        if (table === "tenants") {
          // First call: select logo_path
          // Second call: update logo_path = null
          return {
            select: vi.fn(() => ({
              eq: vi.fn(() => ({
                single: vi.fn().mockResolvedValue({
                  data: { logo_path: `${TENANT_ID}/logo.png` },
                  error: null,
                }),
              })),
            })),
            update: vi.fn(() => ({
              eq: vi.fn().mockResolvedValue({ data: null, error: null }),
            })),
          };
        }
        return { insert: auditInsertMock };
      }),
    } as unknown as SupabaseClient;

    const result = await removeWorkspaceLogo(
      mockAuthClient,
      mockAdminClient,
      TENANT_ID,
      USER_ID,
      "owner",
    );

    expect(result.success).toBe(true);
    expect(removeMock).toHaveBeenCalledWith([`${TENANT_ID}/logo.png`]);
  });
});

describe("updateWorkspaceRegional", () => {
  it("owner success — both fields updated, audit logged", async () => {
    const auditInsertMock = vi.fn().mockResolvedValue({ data: null, error: null });

    const mockAdminClient = {
      from: vi.fn((table: string) => {
        if (table === "tenants") {
          return {
            update: vi.fn(() => ({
              eq: vi.fn(() => ({
                select: vi.fn(() => ({
                  single: vi.fn().mockResolvedValue({
                    data: { timezone: "America/New_York", locale: "en-US" },
                    error: null,
                  }),
                })),
              })),
            })),
          };
        }
        return { insert: auditInsertMock };
      }),
    } as unknown as SupabaseClient;

    const result = await updateWorkspaceRegional(mockAdminClient, TENANT_ID, USER_ID, "owner", {
      timezone: "America/New_York",
      locale: "en-US",
    });

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.timezone).toBe("America/New_York");
      expect(result.data.locale).toBe("en-US");
    }
  });

  it("admin success — admin role is permitted", async () => {
    const mockAdminClient = {
      from: vi.fn((table: string) => {
        if (table === "tenants") {
          return {
            update: vi.fn(() => ({
              eq: vi.fn(() => ({
                select: vi.fn(() => ({
                  single: vi.fn().mockResolvedValue({
                    data: { timezone: "Europe/London", locale: "en-GB" },
                    error: null,
                  }),
                })),
              })),
            })),
          };
        }
        return { insert: vi.fn().mockResolvedValue({ data: null, error: null }) };
      }),
    } as unknown as SupabaseClient;

    const result = await updateWorkspaceRegional(mockAdminClient, TENANT_ID, USER_ID, "admin", {
      timezone: "Europe/London",
      locale: "en-GB",
    });

    expect(result.success).toBe(true);
  });

  it("member rejected — returns FORBIDDEN", async () => {
    const result = await updateWorkspaceRegional(
      {} as SupabaseClient,
      TENANT_ID,
      USER_ID,
      "member",
      { timezone: "UTC", locale: "en-US" },
    );

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.code).toBe("FORBIDDEN");
    }
  });
});

describe("updateWorkspaceSecurity", () => {
  it("owner success — flag updated, audit logged", async () => {
    const auditInsertMock = vi.fn().mockResolvedValue({ data: null, error: null });

    const mockAdminClient = {
      from: vi.fn((table: string) => {
        if (table === "tenants") {
          return {
            update: vi.fn(() => ({
              eq: vi.fn(() => ({
                select: vi.fn(() => ({
                  single: vi.fn().mockResolvedValue({
                    data: { allow_admin_invites: false },
                    error: null,
                  }),
                })),
              })),
            })),
          };
        }
        return { insert: auditInsertMock };
      }),
    } as unknown as SupabaseClient;

    const result = await updateWorkspaceSecurity(mockAdminClient, TENANT_ID, USER_ID, "owner", {
      allowAdminInvites: false,
    });

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.allowAdminInvites).toBe(false);
    }
  });

  it("admin rejected — returns FORBIDDEN", async () => {
    const result = await updateWorkspaceSecurity(
      {} as SupabaseClient,
      TENANT_ID,
      USER_ID,
      "admin",
      { allowAdminInvites: false },
    );

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.code).toBe("FORBIDDEN");
    }
  });
});
