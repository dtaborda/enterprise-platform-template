import { describe, expect, it } from "vitest";
import {
  auditQueryDto,
  changePasswordDto,
  createAuditDto,
  createTenantDto,
  createUserDto,
  loginDto,
  resetPasswordDto,
  signUpDto,
  updatePasswordDto,
  updateTenantDto,
  updateUserDto,
} from "./platform";

describe("loginDto", () => {
  it("accepts valid email and non-empty password", () => {
    expect(loginDto.parse({ email: "owner@enterprise.dev", password: "password123" })).toEqual({
      email: "owner@enterprise.dev",
      password: "password123",
    });
  });

  it("rejects invalid email", () => {
    expect(() => loginDto.parse({ email: "invalid", password: "password123" })).toThrow();
  });

  it("rejects missing password", () => {
    expect(() => loginDto.parse({ email: "owner@enterprise.dev" })).toThrow();
  });
});

describe("signUpDto", () => {
  it("accepts valid sign-up payload", () => {
    expect(
      signUpDto.parse({
        name: "Owner User",
        email: "owner@enterprise.dev",
        password: "password123",
      }),
    ).toMatchObject({
      name: "Owner User",
      email: "owner@enterprise.dev",
      password: "password123",
    });
  });

  it("rejects passwords shorter than 8 chars", () => {
    expect(() => signUpDto.parse({ email: "owner@enterprise.dev", password: "short" })).toThrow();
  });

  it("rejects invalid email", () => {
    expect(() => signUpDto.parse({ email: "invalid", password: "password123" })).toThrow();
  });
});

describe("changePasswordDto", () => {
  it("accepts currentPassword and newPassword >= 8", () => {
    expect(
      changePasswordDto.parse({ currentPassword: "password123", newPassword: "newpassword123" }),
    ).toEqual({ currentPassword: "password123", newPassword: "newpassword123" });
  });

  it("rejects newPassword shorter than 8", () => {
    expect(() =>
      changePasswordDto.parse({ currentPassword: "password123", newPassword: "short" }),
    ).toThrow();
  });
});

describe("resetPasswordDto", () => {
  it("accepts valid email", () => {
    expect(resetPasswordDto.parse({ email: "owner@enterprise.dev" })).toEqual({
      email: "owner@enterprise.dev",
    });
  });

  it("rejects invalid email", () => {
    expect(() => resetPasswordDto.parse({ email: "invalid" })).toThrow();
  });
});

describe("updatePasswordDto", () => {
  it("accepts matching password and confirmPassword", () => {
    expect(
      updatePasswordDto.parse({ password: "password123", confirmPassword: "password123" }),
    ).toEqual({ password: "password123", confirmPassword: "password123" });
  });

  it("rejects mismatched passwords with confirmPassword path", () => {
    const result = updatePasswordDto.safeParse({
      password: "password123",
      confirmPassword: "password124",
    });

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues[0]?.path).toEqual(["confirmPassword"]);
    }
  });

  it("rejects missing confirmPassword", () => {
    expect(() => updatePasswordDto.parse({ password: "password123" })).toThrow();
  });
});

describe("createTenantDto", () => {
  it("accepts valid name and slug", () => {
    expect(createTenantDto.parse({ name: "Enterprise", slug: "enterprise" })).toEqual({
      name: "Enterprise",
      slug: "enterprise",
    });
  });

  it("rejects empty name", () => {
    expect(() => createTenantDto.parse({ name: "", slug: "enterprise" })).toThrow();
  });

  it("rejects slug longer than 100 chars", () => {
    expect(() => createTenantDto.parse({ name: "Enterprise", slug: "a".repeat(101) })).toThrow();
  });
});

describe("updateTenantDto", () => {
  it("accepts empty object", () => {
    expect(updateTenantDto.parse({})).toEqual({});
  });

  it("accepts name and settings", () => {
    expect(
      updateTenantDto.parse({
        name: "Enterprise",
        settings: { locale: "en", timezone: "UTC" },
      }),
    ).toEqual({
      name: "Enterprise",
      settings: { locale: "en", timezone: "UTC" },
    });
  });

  it("rejects name longer than 255 chars", () => {
    expect(() => updateTenantDto.parse({ name: "a".repeat(256) })).toThrow();
  });
});

describe("createUserDto", () => {
  it("accepts valid email and role enum", () => {
    expect(createUserDto.parse({ email: "member@enterprise.dev", role: "member" })).toEqual({
      email: "member@enterprise.dev",
      role: "member",
    });
  });

  it("rejects invalid role", () => {
    expect(() =>
      createUserDto.parse({ email: "member@enterprise.dev", role: "invalid-role" }),
    ).toThrow();
  });

  it("rejects invalid email", () => {
    expect(() => createUserDto.parse({ email: "invalid", role: "member" })).toThrow();
  });
});

describe("updateUserDto", () => {
  it("accepts empty object", () => {
    expect(updateUserDto.parse({})).toEqual({});
  });

  it("accepts valid avatarUrl and role", () => {
    expect(
      updateUserDto.parse({ avatarUrl: "https://example.com/avatar.png", role: "admin" }),
    ).toEqual({ avatarUrl: "https://example.com/avatar.png", role: "admin" });
  });

  it("rejects invalid role", () => {
    expect(() => updateUserDto.parse({ role: "invalid-role" })).toThrow();
  });

  it("rejects invalid avatarUrl", () => {
    expect(() => updateUserDto.parse({ avatarUrl: "not-a-url" })).toThrow();
  });
});

describe("createAuditDto", () => {
  it("accepts every allowed action", () => {
    const actions = ["create", "read", "update", "delete", "login", "logout", "custom"];

    for (const action of actions) {
      const parsed = createAuditDto.parse({ action, resource: "profiles" });
      expect(parsed.action).toBe(action);
    }
  });

  it("accepts optional metadata and UUID resourceId", () => {
    expect(
      createAuditDto.parse({
        action: "update",
        resource: "profiles",
        resourceId: "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
        metadata: { section: "account" },
      }),
    ).toMatchObject({
      action: "update",
      resource: "profiles",
      resourceId: "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
      metadata: { section: "account" },
    });
  });

  it("rejects invalid action", () => {
    expect(() => createAuditDto.parse({ action: "archive", resource: "profiles" })).toThrow();
  });

  it("rejects invalid resourceId UUID", () => {
    expect(() =>
      createAuditDto.parse({
        action: "update",
        resource: "profiles",
        resourceId: "not-uuid",
      }),
    ).toThrow();
  });
});

describe("auditQueryDto", () => {
  it("defaults limit to 50", () => {
    const parsed = auditQueryDto.parse({});
    expect(parsed.limit).toBe(50);
  });

  it("accepts valid UUID userId and date filters", () => {
    expect(
      auditQueryDto.parse({
        userId: "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
        startDate: new Date("2024-01-01T00:00:00.000Z"),
        endDate: new Date("2024-01-31T23:59:59.000Z"),
      }),
    ).toMatchObject({
      userId: "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
      limit: 50,
    });
  });

  it("rejects limit lower than 1", () => {
    expect(() => auditQueryDto.parse({ limit: 0 })).toThrow();
  });

  it("rejects limit greater than 100", () => {
    expect(() => auditQueryDto.parse({ limit: 101 })).toThrow();
  });
});
