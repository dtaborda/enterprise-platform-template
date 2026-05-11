import type { SupabaseClient } from "@supabase/supabase-js";
import { describe, expect, it, vi } from "vitest";
import type { InvitationEmailPort } from "../ports/invitation-email-port";
import {
  acceptTenantInvitation,
  changeTenantMemberRole,
  inviteTenantMember,
  listTenantMembers,
  removeTenantMember,
  resendTenantInvitation,
  revokeTenantInvitation,
} from "../tenant-team-service";

// ─── Mock Helpers ──────────────────────────────────────────────────────────────

const TENANT_ID = "aaaaaaaa-0000-4000-8000-000000000001";
const REQUESTER_ID = "bbbbbbbb-0000-4000-8000-000000000001";
const TARGET_ID = "cccccccc-0000-4000-8000-000000000001";
const INVITATION_ID = "dddddddd-0000-4000-8000-000000000001";

const FUTURE_DATE = new Date(Date.now() + 72 * 60 * 60 * 1000);
const PAST_DATE = new Date(Date.now() - 1000);

function createMockEmailPort(): InvitationEmailPort & { send: ReturnType<typeof vi.fn> } {
  return {
    send: vi.fn().mockResolvedValue({ success: true }),
  };
}

// ─── Tests ─────────────────────────────────────────────────────────────────────

describe("listTenantMembers", () => {
  it("returns mapped member list on success", async () => {
    const profileRows = [
      {
        id: REQUESTER_ID,
        email: "admin@tenant.com",
        name: "Admin User",
        avatar_url: null,
        role: "admin",
        created_at: new Date().toISOString(),
      },
    ];

    const mockClient = {
      from: vi.fn(() => ({
        select: vi.fn(() => ({
          eq: vi.fn(() => ({
            order: vi.fn().mockResolvedValue({ data: profileRows, error: null }),
          })),
        })),
      })),
    } as unknown as SupabaseClient;

    const result = await listTenantMembers(mockClient, TENANT_ID);

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data).toHaveLength(1);
      const firstMember = result.data[0];
      expect(firstMember?.email).toBe("admin@tenant.com");
      expect(firstMember?.role).toBe("admin");
      expect(firstMember?.joinedAt).toBeInstanceOf(Date);
    }
  });

  it("returns empty array when no members found", async () => {
    const mockClient = {
      from: vi.fn(() => ({
        select: vi.fn(() => ({
          eq: vi.fn(() => ({
            order: vi.fn().mockResolvedValue({ data: [], error: null }),
          })),
        })),
      })),
    } as unknown as SupabaseClient;

    const result = await listTenantMembers(mockClient, TENANT_ID);

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data).toHaveLength(0);
    }
  });

  it("returns MEMBERS_LIST_FAILED on DB error", async () => {
    const mockClient = {
      from: vi.fn(() => ({
        select: vi.fn(() => ({
          eq: vi.fn(() => ({
            order: vi.fn().mockResolvedValue({ data: null, error: { message: "DB error" } }),
          })),
        })),
      })),
    } as unknown as SupabaseClient;

    const result = await listTenantMembers(mockClient, TENANT_ID);

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.code).toBe("MEMBERS_LIST_FAILED");
    }
  });
});

describe("inviteTenantMember", () => {
  it("creates invitation and sends email on success", async () => {
    const emailPort = createMockEmailPort();

    // Check duplicate: no existing invitation
    // Check existing member: not found
    // Insert invitation: success
    // Audit log: success
    const mockClient = {
      from: vi.fn((table: string) => {
        if (table === "tenant_invitations") {
          return {
            select: vi.fn(() => ({
              eq: vi.fn(() => ({
                eq: vi.fn(() => ({
                  eq: vi.fn(() => ({
                    maybeSingle: vi.fn().mockResolvedValue({ data: null, error: null }),
                  })),
                })),
              })),
            })),
            insert: vi.fn(() => ({
              select: vi.fn(() => ({
                single: vi.fn().mockResolvedValue({
                  data: {
                    id: INVITATION_ID,
                    tenant_id: TENANT_ID,
                    email: "new@tenant.com",
                    role: "member",
                    token_hash: "hash",
                    status: "pending",
                    invited_by: REQUESTER_ID,
                    accepted_by: null,
                    expires_at: FUTURE_DATE.toISOString(),
                    created_at: new Date().toISOString(),
                    updated_at: new Date().toISOString(),
                  },
                  error: null,
                }),
              })),
            })),
          };
        }
        if (table === "profiles") {
          return {
            select: vi.fn(() => ({
              eq: vi.fn(() => ({
                eq: vi.fn(() => ({
                  maybeSingle: vi.fn().mockResolvedValue({ data: null, error: null }),
                })),
              })),
            })),
          };
        }
        // audit_log table
        return {
          insert: vi.fn().mockResolvedValue({ data: null, error: null }),
        };
      }),
    } as unknown as SupabaseClient;

    const result = await inviteTenantMember(
      mockClient,
      TENANT_ID,
      REQUESTER_ID,
      "owner",
      { email: "new@tenant.com", role: "member" },
      emailPort,
    );

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.email).toBe("new@tenant.com");
      expect(result.data.status).toBe("pending");
    }
    expect(emailPort.send).toHaveBeenCalledOnce();
  });

  it("rejects duplicate pending invitation with DUPLICATE_INVITATION", async () => {
    const emailPort = createMockEmailPort();

    const existingInvitation = {
      id: INVITATION_ID,
      status: "pending",
      email: "dup@tenant.com",
    };

    const mockClient = {
      from: vi.fn((table: string) => {
        if (table === "tenant_invitations") {
          return {
            select: vi.fn(() => ({
              eq: vi.fn(() => ({
                eq: vi.fn(() => ({
                  eq: vi.fn(() => ({
                    maybeSingle: vi.fn().mockResolvedValue({
                      data: existingInvitation,
                      error: null,
                    }),
                  })),
                })),
              })),
            })),
          };
        }
        return {
          select: vi.fn(() => ({
            eq: vi.fn(() => ({
              eq: vi.fn(() => ({
                maybeSingle: vi.fn().mockResolvedValue({ data: null, error: null }),
              })),
            })),
          })),
        };
      }),
    } as unknown as SupabaseClient;

    const result = await inviteTenantMember(
      mockClient,
      TENANT_ID,
      REQUESTER_ID,
      "owner",
      { email: "dup@tenant.com", role: "member" },
      emailPort,
    );

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.code).toBe("DUPLICATE_INVITATION");
    }
    expect(emailPort.send).not.toHaveBeenCalled();
  });

  it("rejects invitation when user already a member with ALREADY_MEMBER", async () => {
    const emailPort = createMockEmailPort();

    const mockClient = {
      from: vi.fn((table: string) => {
        if (table === "tenant_invitations") {
          return {
            select: vi.fn(() => ({
              eq: vi.fn(() => ({
                eq: vi.fn(() => ({
                  eq: vi.fn(() => ({
                    maybeSingle: vi.fn().mockResolvedValue({ data: null, error: null }),
                  })),
                })),
              })),
            })),
          };
        }
        if (table === "profiles") {
          return {
            select: vi.fn(() => ({
              eq: vi.fn(() => ({
                eq: vi.fn(() => ({
                  maybeSingle: vi.fn().mockResolvedValue({
                    data: { id: TARGET_ID, email: "existing@tenant.com" },
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

    const result = await inviteTenantMember(
      mockClient,
      TENANT_ID,
      REQUESTER_ID,
      "owner",
      { email: "existing@tenant.com", role: "member" },
      emailPort,
    );

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.code).toBe("ALREADY_MEMBER");
    }
  });

  it("still creates invitation when email fails, logs email_delivery_failed", async () => {
    const emailPort = createMockEmailPort();
    emailPort.send.mockResolvedValue({ success: false, error: "SMTP timeout" });

    const auditInsertMock = vi.fn().mockResolvedValue({ data: null, error: null });

    const mockClient = {
      from: vi.fn((table: string) => {
        if (table === "tenant_invitations") {
          return {
            select: vi.fn(() => ({
              eq: vi.fn(() => ({
                eq: vi.fn(() => ({
                  eq: vi.fn(() => ({
                    maybeSingle: vi.fn().mockResolvedValue({ data: null, error: null }),
                  })),
                })),
              })),
            })),
            insert: vi.fn(() => ({
              select: vi.fn(() => ({
                single: vi.fn().mockResolvedValue({
                  data: {
                    id: INVITATION_ID,
                    tenant_id: TENANT_ID,
                    email: "new@tenant.com",
                    role: "member",
                    token_hash: "hash",
                    status: "pending",
                    invited_by: REQUESTER_ID,
                    accepted_by: null,
                    expires_at: FUTURE_DATE.toISOString(),
                    created_at: new Date().toISOString(),
                    updated_at: new Date().toISOString(),
                  },
                  error: null,
                }),
              })),
            })),
          };
        }
        if (table === "profiles") {
          return {
            select: vi.fn(() => ({
              eq: vi.fn(() => ({
                eq: vi.fn(() => ({
                  maybeSingle: vi.fn().mockResolvedValue({ data: null, error: null }),
                })),
              })),
            })),
          };
        }
        // audit_log
        return { insert: auditInsertMock };
      }),
    } as unknown as SupabaseClient;

    const result = await inviteTenantMember(
      mockClient,
      TENANT_ID,
      REQUESTER_ID,
      "owner",
      { email: "new@tenant.com", role: "member" },
      emailPort,
    );

    // Still succeeds — invitation created
    expect(result.success).toBe(true);
    // Audit log called at least twice: member.invited + email_delivery_failed
    expect(auditInsertMock).toHaveBeenCalledTimes(2);
  });

  it("admin blocked when allow_admin_invites = false — returns ADMIN_INVITES_DISABLED", async () => {
    const emailPort = createMockEmailPort();

    const mockClient = {
      from: vi.fn((table: string) => {
        if (table === "tenants") {
          return {
            select: vi.fn(() => ({
              eq: vi.fn(() => ({
                single: vi.fn().mockResolvedValue({
                  data: { allow_admin_invites: false },
                  error: null,
                }),
              })),
            })),
          };
        }
        return {
          select: vi.fn(() => ({
            eq: vi.fn(() => ({
              eq: vi.fn(() => ({
                maybeSingle: vi.fn().mockResolvedValue({ data: null, error: null }),
              })),
            })),
          })),
        };
      }),
    } as unknown as SupabaseClient;

    const result = await inviteTenantMember(
      mockClient,
      TENANT_ID,
      REQUESTER_ID,
      "admin",
      { email: "new@tenant.com", role: "member" },
      emailPort,
    );

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.code).toBe("ADMIN_INVITES_DISABLED");
    }
    expect(emailPort.send).not.toHaveBeenCalled();
  });

  it("admin allowed when allow_admin_invites = true — proceeds normally", async () => {
    const emailPort = createMockEmailPort();

    const mockClient = {
      from: vi.fn((table: string) => {
        if (table === "tenants") {
          return {
            select: vi.fn(() => ({
              eq: vi.fn(() => ({
                single: vi.fn().mockResolvedValue({
                  data: { allow_admin_invites: true },
                  error: null,
                }),
              })),
            })),
          };
        }
        if (table === "tenant_invitations") {
          return {
            select: vi.fn(() => ({
              eq: vi.fn(() => ({
                eq: vi.fn(() => ({
                  eq: vi.fn(() => ({
                    maybeSingle: vi.fn().mockResolvedValue({ data: null, error: null }),
                  })),
                })),
              })),
            })),
            insert: vi.fn(() => ({
              select: vi.fn(() => ({
                single: vi.fn().mockResolvedValue({
                  data: {
                    id: INVITATION_ID,
                    tenant_id: TENANT_ID,
                    email: "new@tenant.com",
                    role: "member",
                    token_hash: "hash",
                    status: "pending",
                    invited_by: REQUESTER_ID,
                    accepted_by: null,
                    expires_at: FUTURE_DATE.toISOString(),
                    created_at: new Date().toISOString(),
                    updated_at: new Date().toISOString(),
                  },
                  error: null,
                }),
              })),
            })),
          };
        }
        if (table === "profiles") {
          return {
            select: vi.fn(() => ({
              eq: vi.fn(() => ({
                eq: vi.fn(() => ({
                  maybeSingle: vi.fn().mockResolvedValue({ data: null, error: null }),
                })),
              })),
            })),
          };
        }
        // audit_log
        return { insert: vi.fn().mockResolvedValue({ data: null, error: null }) };
      }),
    } as unknown as SupabaseClient;

    const result = await inviteTenantMember(
      mockClient,
      TENANT_ID,
      REQUESTER_ID,
      "admin",
      { email: "new@tenant.com", role: "member" },
      emailPort,
    );

    expect(result.success).toBe(true);
    expect(emailPort.send).toHaveBeenCalledOnce();
  });

  it("owner invite unaffected regardless of allow_admin_invites value", async () => {
    const emailPort = createMockEmailPort();

    // allow_admin_invites = false, but owner invites → should NOT hit the guard
    const mockClient = {
      from: vi.fn((table: string) => {
        // tenants table should NOT be queried for owner role
        if (table === "tenant_invitations") {
          return {
            select: vi.fn(() => ({
              eq: vi.fn(() => ({
                eq: vi.fn(() => ({
                  eq: vi.fn(() => ({
                    maybeSingle: vi.fn().mockResolvedValue({ data: null, error: null }),
                  })),
                })),
              })),
            })),
            insert: vi.fn(() => ({
              select: vi.fn(() => ({
                single: vi.fn().mockResolvedValue({
                  data: {
                    id: INVITATION_ID,
                    tenant_id: TENANT_ID,
                    email: "invited@tenant.com",
                    role: "member",
                    token_hash: "hash",
                    status: "pending",
                    invited_by: REQUESTER_ID,
                    accepted_by: null,
                    expires_at: FUTURE_DATE.toISOString(),
                    created_at: new Date().toISOString(),
                    updated_at: new Date().toISOString(),
                  },
                  error: null,
                }),
              })),
            })),
          };
        }
        if (table === "profiles") {
          return {
            select: vi.fn(() => ({
              eq: vi.fn(() => ({
                eq: vi.fn(() => ({
                  maybeSingle: vi.fn().mockResolvedValue({ data: null, error: null }),
                })),
              })),
            })),
          };
        }
        // audit_log
        return { insert: vi.fn().mockResolvedValue({ data: null, error: null }) };
      }),
    } as unknown as SupabaseClient;

    const result = await inviteTenantMember(
      mockClient,
      TENANT_ID,
      REQUESTER_ID,
      "owner",
      { email: "invited@tenant.com", role: "member" },
      emailPort,
    );

    expect(result.success).toBe(true);
    expect(emailPort.send).toHaveBeenCalledOnce();
  });
});

describe("acceptTenantInvitation", () => {
  const PLAIN_TOKEN = "a".repeat(64);

  function makeAdminClient(invitationData: unknown, getUserData?: unknown, updateData?: unknown) {
    const adminClient = {
      from: vi.fn((table: string) => {
        if (table === "tenant_invitations") {
          return {
            select: vi.fn(() => ({
              eq: vi.fn(() => ({
                maybeSingle: vi.fn().mockResolvedValue({
                  data: invitationData,
                  error: null,
                }),
              })),
            })),
            update: vi.fn(() => ({
              eq: vi.fn(() => ({
                eq: vi.fn().mockResolvedValue({ data: null, error: null }),
              })),
            })),
          };
        }
        if (table === "profiles") {
          return {
            select: vi.fn(() => ({
              eq: vi.fn(() => ({
                eq: vi.fn(() => ({
                  maybeSingle: vi.fn().mockResolvedValue({ data: null, error: null }),
                })),
              })),
            })),
            upsert: vi.fn(() => ({
              select: vi.fn(() => ({
                single: vi.fn().mockResolvedValue({
                  data: { id: TARGET_ID },
                  error: null,
                }),
              })),
            })),
          };
        }
        if (table === "user_roles") {
          return {
            insert: vi.fn().mockResolvedValue({ data: null, error: null }),
          };
        }
        // audit_log
        return {
          insert: vi.fn().mockResolvedValue({ data: null, error: null }),
        };
      }),
      auth: {
        admin: {
          getUserById: vi.fn().mockResolvedValue({
            data: { user: getUserData ?? { id: TARGET_ID, email: "user@tenant.com" } },
            error: null,
          }),
          createUser: vi.fn().mockResolvedValue({
            data: { user: { id: TARGET_ID, email: "user@tenant.com" } },
            error: null,
          }),
          updateUserById: vi.fn().mockResolvedValue({
            data: { user: updateData ?? { id: TARGET_ID } },
            error: null,
          }),
        },
      },
    } as unknown as SupabaseClient;

    return adminClient;
  }

  it("accepts valid pending non-expired token", async () => {
    const invitation = {
      id: INVITATION_ID,
      tenant_id: TENANT_ID,
      email: "new@tenant.com",
      role: "member",
      status: "pending",
      expires_at: FUTURE_DATE.toISOString(),
      invited_by: REQUESTER_ID,
      accepted_by: null,
    };

    const adminClient = makeAdminClient(invitation);

    const result = await acceptTenantInvitation(adminClient, PLAIN_TOKEN);

    expect(result.success).toBe(true);
  });

  it("rejects expired token with INVITATION_EXPIRED", async () => {
    const invitation = {
      id: INVITATION_ID,
      tenant_id: TENANT_ID,
      email: "new@tenant.com",
      role: "member",
      status: "pending",
      expires_at: PAST_DATE.toISOString(),
      invited_by: REQUESTER_ID,
    };

    const adminClient = makeAdminClient(invitation);

    const result = await acceptTenantInvitation(adminClient, PLAIN_TOKEN);

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.code).toBe("INVITATION_EXPIRED");
    }
  });

  it("rejects already-used token with INVITATION_ALREADY_USED", async () => {
    const invitation = {
      id: INVITATION_ID,
      tenant_id: TENANT_ID,
      email: "new@tenant.com",
      role: "member",
      status: "accepted",
      expires_at: FUTURE_DATE.toISOString(),
      invited_by: REQUESTER_ID,
    };

    const adminClient = makeAdminClient(invitation);

    const result = await acceptTenantInvitation(adminClient, PLAIN_TOKEN);

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.code).toBe("INVITATION_ALREADY_USED");
    }
  });

  it("rejects non-existent token with INVITATION_NOT_FOUND", async () => {
    const adminClient = makeAdminClient(null);

    // Override to return null (not found)
    (adminClient.from as ReturnType<typeof vi.fn>).mockImplementation((table: string) => {
      if (table === "tenant_invitations") {
        return {
          select: vi.fn(() => ({
            eq: vi.fn(() => ({
              maybeSingle: vi.fn().mockResolvedValue({ data: null, error: null }),
            })),
          })),
        };
      }
      return { insert: vi.fn().mockResolvedValue({ data: null, error: null }) };
    });

    const result = await acceptTenantInvitation(adminClient, PLAIN_TOKEN);

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.code).toBe("INVITATION_NOT_FOUND");
    }
  });
});

describe("changeTenantMemberRole", () => {
  it("updates role in profiles and syncs app_metadata", async () => {
    const targetProfile = {
      id: TARGET_ID,
      tenant_id: TENANT_ID,
      email: "member@tenant.com",
      name: "Member",
      avatar_url: null,
      role: "member",
      created_at: new Date().toISOString(),
    };

    const userClient = {
      from: vi.fn((table: string) => {
        if (table === "profiles") {
          return {
            select: vi.fn(() => ({
              eq: vi.fn(() => ({
                eq: vi.fn(() => ({
                  maybeSingle: vi.fn().mockResolvedValue({ data: targetProfile, error: null }),
                })),
              })),
            })),
            update: vi.fn(() => ({
              eq: vi.fn(() => ({
                eq: vi.fn(() => ({
                  select: vi.fn(() => ({
                    single: vi.fn().mockResolvedValue({
                      data: { ...targetProfile, role: "admin" },
                      error: null,
                    }),
                  })),
                })),
              })),
            })),
          };
        }
        if (table === "user_roles") {
          return {
            insert: vi.fn().mockResolvedValue({ data: null, error: null }),
          };
        }
        // audit_log
        return { insert: vi.fn().mockResolvedValue({ data: null, error: null }) };
      }),
    } as unknown as SupabaseClient;

    const adminClient = {
      auth: {
        admin: {
          updateUserById: vi
            .fn()
            .mockResolvedValue({ data: { user: { id: TARGET_ID } }, error: null }),
        },
      },
      from: vi.fn(() => ({
        insert: vi.fn().mockResolvedValue({ data: null, error: null }),
      })),
    } as unknown as SupabaseClient;

    const result = await changeTenantMemberRole(userClient, adminClient, TENANT_ID, REQUESTER_ID, {
      userId: TARGET_ID,
      role: "admin",
    });

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.role).toBe("admin");
    }
  });

  it("blocks self-role-change with SELF_ROLE_CHANGE", async () => {
    const mockClient = {} as SupabaseClient;
    const adminClient = {} as SupabaseClient;

    const result = await changeTenantMemberRole(
      mockClient,
      adminClient,
      TENANT_ID,
      REQUESTER_ID,
      { userId: REQUESTER_ID, role: "member" }, // same ID as requester
    );

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.code).toBe("SELF_ROLE_CHANGE");
    }
  });

  it("blocks last-owner role change with LAST_OWNER", async () => {
    const ownerProfile = {
      id: TARGET_ID,
      tenant_id: TENANT_ID,
      email: "owner@tenant.com",
      name: "Owner",
      avatar_url: null,
      role: "owner",
      created_at: new Date().toISOString(),
    };

    // Use call count on `.from` to differentiate profile lookup vs owner count
    let profileFromCallCount = 0;

    const userClient = {
      from: vi.fn((table: string) => {
        if (table === "profiles") {
          profileFromCallCount++;
          if (profileFromCallCount === 1) {
            // First call: profile lookup (maybeSingle path)
            return {
              select: vi.fn(() => ({
                eq: vi.fn(() => ({
                  eq: vi.fn(() => ({
                    maybeSingle: vi.fn().mockResolvedValue({ data: ownerProfile, error: null }),
                  })),
                })),
              })),
            };
          }
          // Second call: owner count query — last .eq() returns a resolved promise
          const lastEqOwner = vi.fn().mockResolvedValue({ data: [ownerProfile], error: null });
          const firstEq = vi.fn(() => ({ eq: lastEqOwner }));
          return { select: vi.fn(() => ({ eq: firstEq })) };
        }
        return { insert: vi.fn().mockResolvedValue({ data: null, error: null }) };
      }),
    } as unknown as SupabaseClient;

    const adminClient = {} as SupabaseClient;

    const result = await changeTenantMemberRole(userClient, adminClient, TENANT_ID, REQUESTER_ID, {
      userId: TARGET_ID,
      role: "member",
    });

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.code).toBe("LAST_OWNER");
    }
  });
});

describe("removeTenantMember", () => {
  it("removes member and revokes sessions", async () => {
    const targetProfile = {
      id: TARGET_ID,
      tenant_id: TENANT_ID,
      email: "member@tenant.com",
      name: "Member",
      avatar_url: null,
      role: "member", // non-owner: skips owner count check
      created_at: new Date().toISOString(),
    };

    const userClient = {
      from: vi.fn((table: string) => {
        if (table === "profiles") {
          return {
            select: vi.fn(() => ({
              eq: vi.fn(() => ({
                eq: vi.fn(() => ({
                  maybeSingle: vi.fn().mockResolvedValue({ data: targetProfile, error: null }),
                })),
              })),
            })),
            delete: vi.fn(() => ({
              eq: vi.fn(() => ({
                eq: vi.fn(() => ({
                  select: vi.fn(() => ({
                    maybeSingle: vi
                      .fn()
                      .mockResolvedValue({ data: { id: TARGET_ID }, error: null }),
                  })),
                })),
              })),
            })),
          };
        }
        // audit_log
        return { insert: vi.fn().mockResolvedValue({ data: null, error: null }) };
      }),
    } as unknown as SupabaseClient;

    const adminClient = {
      auth: {
        admin: {
          signOut: vi.fn().mockResolvedValue({ data: null, error: null }),
        },
      },
      from: vi.fn(() => ({
        insert: vi.fn().mockResolvedValue({ data: null, error: null }),
      })),
    } as unknown as SupabaseClient;

    const result = await removeTenantMember(
      userClient,
      adminClient,
      TENANT_ID,
      REQUESTER_ID,
      TARGET_ID,
    );

    expect(result.success).toBe(true);
  });

  it("blocks self-removal with SELF_REMOVAL", async () => {
    const result = await removeTenantMember(
      {} as SupabaseClient,
      {} as SupabaseClient,
      TENANT_ID,
      REQUESTER_ID,
      REQUESTER_ID, // same as requester
    );

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.code).toBe("SELF_REMOVAL");
    }
  });

  it("blocks last-owner removal with LAST_OWNER", async () => {
    const ownerProfile = {
      id: TARGET_ID,
      tenant_id: TENANT_ID,
      email: "owner@tenant.com",
      role: "owner",
    };

    // Track calls to differentiate profile lookup vs owner count
    let removeOwnerCallCount = 0;

    const userClient = {
      from: vi.fn((table: string) => {
        if (table === "profiles") {
          removeOwnerCallCount++;
          if (removeOwnerCallCount === 1) {
            // Profile lookup (maybeSingle path)
            return {
              select: vi.fn(() => ({
                eq: vi.fn(() => ({
                  eq: vi.fn(() => ({
                    maybeSingle: vi.fn().mockResolvedValue({ data: ownerProfile, error: null }),
                  })),
                })),
              })),
            };
          }
          // Second call: owner count query — returns single owner
          const lastEqRemove = vi.fn().mockResolvedValue({ data: [ownerProfile], error: null });
          const firstEqRemove = vi.fn(() => ({ eq: lastEqRemove }));
          return { select: vi.fn(() => ({ eq: firstEqRemove })) };
        }
        return { insert: vi.fn().mockResolvedValue({ data: null, error: null }) };
      }),
    } as unknown as SupabaseClient;

    const result = await removeTenantMember(
      userClient,
      {} as SupabaseClient,
      TENANT_ID,
      REQUESTER_ID,
      TARGET_ID,
    );

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.code).toBe("LAST_OWNER");
    }
  });
});

describe("revokeTenantInvitation", () => {
  it("sets status to revoked on pending invitation", async () => {
    const pendingInvitation = {
      id: INVITATION_ID,
      tenant_id: TENANT_ID,
      email: "invited@tenant.com",
      role: "member",
      status: "pending",
      expires_at: FUTURE_DATE.toISOString(),
      invited_by: REQUESTER_ID,
    };

    const mockClient = {
      from: vi.fn((table: string) => {
        if (table === "tenant_invitations") {
          return {
            select: vi.fn(() => ({
              eq: vi.fn(() => ({
                eq: vi.fn(() => ({
                  maybeSingle: vi.fn().mockResolvedValue({ data: pendingInvitation, error: null }),
                })),
              })),
            })),
            update: vi.fn(() => ({
              eq: vi.fn(() => ({
                eq: vi.fn().mockResolvedValue({ data: null, error: null }),
              })),
            })),
          };
        }
        // audit_log
        return { insert: vi.fn().mockResolvedValue({ data: null, error: null }) };
      }),
    } as unknown as SupabaseClient;

    const result = await revokeTenantInvitation(mockClient, TENANT_ID, {
      invitationId: INVITATION_ID,
    });

    expect(result.success).toBe(true);
  });

  it("rejects non-pending invitation with INVITATION_NOT_PENDING", async () => {
    const acceptedInvitation = {
      id: INVITATION_ID,
      tenant_id: TENANT_ID,
      email: "invited@tenant.com",
      status: "accepted",
    };

    const mockClient = {
      from: vi.fn((table: string) => {
        if (table === "tenant_invitations") {
          return {
            select: vi.fn(() => ({
              eq: vi.fn(() => ({
                eq: vi.fn(() => ({
                  maybeSingle: vi.fn().mockResolvedValue({ data: acceptedInvitation, error: null }),
                })),
              })),
            })),
          };
        }
        return { insert: vi.fn().mockResolvedValue({ data: null, error: null }) };
      }),
    } as unknown as SupabaseClient;

    const result = await revokeTenantInvitation(mockClient, TENANT_ID, {
      invitationId: INVITATION_ID,
    });

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.code).toBe("INVITATION_NOT_PENDING");
    }
  });

  it("returns INVITATION_NOT_FOUND when invitation does not exist", async () => {
    const mockClient = {
      from: vi.fn((table: string) => {
        if (table === "tenant_invitations") {
          return {
            select: vi.fn(() => ({
              eq: vi.fn(() => ({
                eq: vi.fn(() => ({
                  maybeSingle: vi.fn().mockResolvedValue({ data: null, error: null }),
                })),
              })),
            })),
          };
        }
        return { insert: vi.fn().mockResolvedValue({ data: null, error: null }) };
      }),
    } as unknown as SupabaseClient;

    const result = await revokeTenantInvitation(mockClient, TENANT_ID, {
      invitationId: INVITATION_ID,
    });

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.code).toBe("INVITATION_NOT_FOUND");
    }
  });
});

describe("resendTenantInvitation", () => {
  it("updates token and sends new email on pending invitation", async () => {
    const emailPort = createMockEmailPort();

    const pendingInvitation = {
      id: INVITATION_ID,
      tenant_id: TENANT_ID,
      email: "invited@tenant.com",
      role: "member",
      status: "pending",
      expires_at: FUTURE_DATE.toISOString(),
      invited_by: REQUESTER_ID,
    };

    const mockClient = {
      from: vi.fn((table: string) => {
        if (table === "tenant_invitations") {
          return {
            select: vi.fn(() => ({
              eq: vi.fn(() => ({
                eq: vi.fn(() => ({
                  maybeSingle: vi.fn().mockResolvedValue({ data: pendingInvitation, error: null }),
                })),
              })),
            })),
            update: vi.fn(() => ({
              eq: vi.fn(() => ({
                eq: vi.fn(() => ({
                  select: vi.fn(() => ({
                    single: vi.fn().mockResolvedValue({
                      data: { ...pendingInvitation, token_hash: "new-hash" },
                      error: null,
                    }),
                  })),
                })),
              })),
            })),
          };
        }
        // audit_log
        return { insert: vi.fn().mockResolvedValue({ data: null, error: null }) };
      }),
    } as unknown as SupabaseClient;

    const result = await resendTenantInvitation(
      mockClient,
      TENANT_ID,
      { invitationId: INVITATION_ID },
      emailPort,
    );

    expect(result.success).toBe(true);
    expect(emailPort.send).toHaveBeenCalledOnce();
  });

  it("rejects non-pending invitation with INVITATION_NOT_PENDING", async () => {
    const emailPort = createMockEmailPort();

    const revokedInvitation = {
      id: INVITATION_ID,
      status: "revoked",
    };

    const mockClient = {
      from: vi.fn((table: string) => {
        if (table === "tenant_invitations") {
          return {
            select: vi.fn(() => ({
              eq: vi.fn(() => ({
                eq: vi.fn(() => ({
                  maybeSingle: vi.fn().mockResolvedValue({ data: revokedInvitation, error: null }),
                })),
              })),
            })),
          };
        }
        return { insert: vi.fn().mockResolvedValue({ data: null, error: null }) };
      }),
    } as unknown as SupabaseClient;

    const result = await resendTenantInvitation(
      mockClient,
      TENANT_ID,
      { invitationId: INVITATION_ID },
      emailPort,
    );

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.code).toBe("INVITATION_NOT_PENDING");
    }
    expect(emailPort.send).not.toHaveBeenCalled();
  });

  it("returns INVITATION_NOT_FOUND when invitation does not exist", async () => {
    const emailPort = createMockEmailPort();

    const mockClient = {
      from: vi.fn((table: string) => {
        if (table === "tenant_invitations") {
          return {
            select: vi.fn(() => ({
              eq: vi.fn(() => ({
                eq: vi.fn(() => ({
                  maybeSingle: vi.fn().mockResolvedValue({ data: null, error: null }),
                })),
              })),
            })),
          };
        }
        return { insert: vi.fn().mockResolvedValue({ data: null, error: null }) };
      }),
    } as unknown as SupabaseClient;

    const result = await resendTenantInvitation(
      mockClient,
      TENANT_ID,
      { invitationId: INVITATION_ID },
      emailPort,
    );

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.code).toBe("INVITATION_NOT_FOUND");
    }
  });
});

describe("token hashing", () => {
  it("produces deterministic SHA-256 hash", async () => {
    const { hashToken } = await import("../tenant-team-service");
    const token = "abc123";
    const hash1 = hashToken(token);
    const hash2 = hashToken(token);
    expect(hash1).toBe(hash2);
    expect(hash1).toHaveLength(64); // SHA-256 hex = 64 chars
  });

  it("different tokens produce different hashes", async () => {
    const { hashToken } = await import("../tenant-team-service");
    expect(hashToken("token1")).not.toBe(hashToken("token2"));
  });
});
