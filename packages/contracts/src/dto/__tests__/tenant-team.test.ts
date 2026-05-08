import { describe, expect, it } from "vitest";
import {
  cancelInvitationSchema,
  changeMemberRoleSchema,
  inviteMemberSchema,
  listMembersQuerySchema,
  removeMemberSchema,
  resendInvitationSchema,
  tenantInvitationOutputSchema,
  tenantMemberOutputSchema,
} from "../tenant-team";

describe("inviteMemberSchema", () => {
  it("accepts valid email and member role", () => {
    expect(inviteMemberSchema.parse({ email: "alice@example.com", role: "member" })).toEqual({
      email: "alice@example.com",
      role: "member",
    });
  });

  it("accepts admin role", () => {
    expect(inviteMemberSchema.parse({ email: "alice@example.com", role: "admin" })).toMatchObject({
      role: "admin",
    });
  });

  it("accepts guest role", () => {
    expect(inviteMemberSchema.parse({ email: "alice@example.com", role: "guest" })).toMatchObject({
      role: "guest",
    });
  });

  it("rejects owner role", () => {
    expect(() => inviteMemberSchema.parse({ email: "alice@example.com", role: "owner" })).toThrow();
  });

  it("rejects empty email", () => {
    expect(() => inviteMemberSchema.parse({ email: "", role: "member" })).toThrow();
  });

  it("rejects invalid email format", () => {
    expect(() => inviteMemberSchema.parse({ email: "not-an-email", role: "member" })).toThrow();
  });

  it("rejects missing email", () => {
    expect(() => inviteMemberSchema.parse({ role: "member" })).toThrow();
  });

  it("rejects missing role", () => {
    expect(() => inviteMemberSchema.parse({ email: "alice@example.com" })).toThrow();
  });

  it("rejects invalid role", () => {
    expect(() =>
      inviteMemberSchema.parse({ email: "alice@example.com", role: "superadmin" }),
    ).toThrow();
  });
});

describe("changeMemberRoleSchema", () => {
  const validUserId = "a1b2c3d4-e5f6-7890-abcd-ef1234567890";

  it("accepts valid userId and member role", () => {
    expect(changeMemberRoleSchema.parse({ userId: validUserId, role: "member" })).toEqual({
      userId: validUserId,
      role: "member",
    });
  });

  it("accepts admin role", () => {
    expect(changeMemberRoleSchema.parse({ userId: validUserId, role: "admin" })).toMatchObject({
      role: "admin",
    });
  });

  it("rejects owner role", () => {
    expect(() => changeMemberRoleSchema.parse({ userId: validUserId, role: "owner" })).toThrow();
  });

  it("rejects invalid UUID for userId", () => {
    expect(() => changeMemberRoleSchema.parse({ userId: "not-a-uuid", role: "member" })).toThrow();
  });

  it("rejects missing userId", () => {
    expect(() => changeMemberRoleSchema.parse({ role: "member" })).toThrow();
  });

  it("rejects missing role", () => {
    expect(() => changeMemberRoleSchema.parse({ userId: validUserId })).toThrow();
  });
});

describe("removeMemberSchema", () => {
  const validUserId = "a1b2c3d4-e5f6-7890-abcd-ef1234567890";

  it("accepts valid UUID", () => {
    expect(removeMemberSchema.parse({ userId: validUserId })).toEqual({ userId: validUserId });
  });

  it("rejects invalid UUID", () => {
    expect(() => removeMemberSchema.parse({ userId: "not-a-uuid" })).toThrow();
  });

  it("rejects missing userId", () => {
    expect(() => removeMemberSchema.parse({})).toThrow();
  });
});

describe("cancelInvitationSchema", () => {
  const validId = "a1b2c3d4-e5f6-7890-abcd-ef1234567890";

  it("accepts valid invitationId UUID", () => {
    expect(cancelInvitationSchema.parse({ invitationId: validId })).toEqual({
      invitationId: validId,
    });
  });

  it("rejects invalid UUID", () => {
    expect(() => cancelInvitationSchema.parse({ invitationId: "not-a-uuid" })).toThrow();
  });

  it("rejects missing invitationId", () => {
    expect(() => cancelInvitationSchema.parse({})).toThrow();
  });
});

describe("resendInvitationSchema", () => {
  const validId = "a1b2c3d4-e5f6-7890-abcd-ef1234567890";

  it("accepts valid invitationId UUID", () => {
    expect(resendInvitationSchema.parse({ invitationId: validId })).toEqual({
      invitationId: validId,
    });
  });

  it("rejects invalid UUID", () => {
    expect(() => resendInvitationSchema.parse({ invitationId: "invalid" })).toThrow();
  });

  it("rejects missing invitationId", () => {
    expect(() => resendInvitationSchema.parse({})).toThrow();
  });
});

describe("listMembersQuerySchema", () => {
  it("accepts empty object with defaults", () => {
    const parsed = listMembersQuerySchema.parse({});
    expect(parsed.limit).toBe(20);
    expect(parsed.offset).toBe(0);
  });

  it("accepts custom limit and offset", () => {
    expect(listMembersQuerySchema.parse({ limit: 50, offset: 10 })).toMatchObject({
      limit: 50,
      offset: 10,
    });
  });

  it("rejects limit below 1", () => {
    expect(() => listMembersQuerySchema.parse({ limit: 0 })).toThrow();
  });

  it("rejects limit above 100", () => {
    expect(() => listMembersQuerySchema.parse({ limit: 101 })).toThrow();
  });

  it("rejects negative offset", () => {
    expect(() => listMembersQuerySchema.parse({ offset: -1 })).toThrow();
  });
});

describe("tenantMemberOutputSchema", () => {
  const validId = "a1b2c3d4-e5f6-7890-abcd-ef1234567890";
  const validMember = {
    id: validId,
    email: "member@example.com",
    name: "Alice Smith",
    avatarUrl: "https://example.com/avatar.png",
    role: "member" as const,
    joinedAt: new Date("2024-01-01T00:00:00.000Z"),
  };

  it("accepts a complete valid member record", () => {
    expect(tenantMemberOutputSchema.parse(validMember)).toMatchObject({
      id: validId,
      email: "member@example.com",
      role: "member",
    });
  });

  it("accepts null name and avatarUrl", () => {
    expect(
      tenantMemberOutputSchema.parse({ ...validMember, name: null, avatarUrl: null }),
    ).toMatchObject({ name: null, avatarUrl: null });
  });

  it("rejects invalid UUID for id", () => {
    expect(() => tenantMemberOutputSchema.parse({ ...validMember, id: "not-uuid" })).toThrow();
  });

  it("rejects invalid email", () => {
    expect(() => tenantMemberOutputSchema.parse({ ...validMember, email: "invalid" })).toThrow();
  });
});

describe("tenantInvitationOutputSchema", () => {
  const validId = "a1b2c3d4-e5f6-7890-abcd-ef1234567890";
  const validInviterId = "b2c3d4e5-f6a7-8901-bcde-f12345678901";
  const validInvitation = {
    id: validId,
    email: "invited@example.com",
    role: "member" as const,
    status: "pending" as const,
    invitedBy: validInviterId,
    expiresAt: new Date("2026-01-10T00:00:00.000Z"),
    createdAt: new Date("2026-01-01T00:00:00.000Z"),
  };

  it("accepts a complete valid invitation record", () => {
    expect(tenantInvitationOutputSchema.parse(validInvitation)).toMatchObject({
      id: validId,
      email: "invited@example.com",
      role: "member",
      status: "pending",
    });
  });

  it("accepts accepted status", () => {
    expect(
      tenantInvitationOutputSchema.parse({ ...validInvitation, status: "accepted" }),
    ).toMatchObject({ status: "accepted" });
  });

  it("accepts revoked status", () => {
    expect(
      tenantInvitationOutputSchema.parse({ ...validInvitation, status: "revoked" }),
    ).toMatchObject({ status: "revoked" });
  });

  it("accepts expired status", () => {
    expect(
      tenantInvitationOutputSchema.parse({ ...validInvitation, status: "expired" }),
    ).toMatchObject({ status: "expired" });
  });

  it("rejects invalid UUID for id", () => {
    expect(() =>
      tenantInvitationOutputSchema.parse({ ...validInvitation, id: "not-uuid" }),
    ).toThrow();
  });

  it("rejects invalid UUID for invitedBy", () => {
    expect(() =>
      tenantInvitationOutputSchema.parse({ ...validInvitation, invitedBy: "not-uuid" }),
    ).toThrow();
  });

  it("rejects invalid status", () => {
    expect(() =>
      tenantInvitationOutputSchema.parse({ ...validInvitation, status: "cancelled" }),
    ).toThrow();
  });

  it("rejects invalid email", () => {
    expect(() =>
      tenantInvitationOutputSchema.parse({ ...validInvitation, email: "not-email" }),
    ).toThrow();
  });
});
