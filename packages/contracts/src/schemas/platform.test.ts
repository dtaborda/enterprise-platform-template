import { describe, expect, it } from "vitest";
import {
  actionErrorSchema,
  actionResultSchema,
  auditEntrySchema,
  authSessionSchema,
  emailField,
  entitySchema,
  invitationMetadataSchema,
  nameField,
  registrationMetadataSchema,
  tenantSchema,
  uuidSchema,
} from "./platform";

const BASE_ENTITY = {
  id: "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
  createdAt: new Date("2024-01-01T00:00:00.000Z"),
  updatedAt: new Date("2024-01-02T00:00:00.000Z"),
};

describe("uuidSchema", () => {
  it("accepts valid UUID", () => {
    expect(uuidSchema.parse("a1b2c3d4-e5f6-7890-abcd-ef1234567890")).toBe(
      "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
    );
  });

  it("rejects invalid UUID", () => {
    expect(() => uuidSchema.parse("invalid-uuid")).toThrow();
  });
});

describe("entitySchema", () => {
  it("accepts full valid entity", () => {
    expect(entitySchema.parse(BASE_ENTITY)).toEqual(BASE_ENTITY);
  });

  it("rejects missing required fields", () => {
    expect(() => entitySchema.parse({ id: BASE_ENTITY.id })).toThrow();
  });
});

describe("authSessionSchema", () => {
  it("accepts valid session", () => {
    expect(
      authSessionSchema.parse({
        userId: "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
        tenantId: "b1b2c3d4-e5f6-7890-abcd-ef1234567890",
        role: "member",
        expiresAt: new Date("2024-02-01T00:00:00.000Z"),
      }),
    ).toMatchObject({ role: "member" });
  });

  it("rejects invalid role", () => {
    expect(() =>
      authSessionSchema.parse({
        userId: "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
        tenantId: "b1b2c3d4-e5f6-7890-abcd-ef1234567890",
        role: "invalid",
        expiresAt: new Date("2024-02-01T00:00:00.000Z"),
      }),
    ).toThrow();
  });
});

describe("registrationMetadataSchema", () => {
  it("accepts valid metadata", () => {
    expect(registrationMetadataSchema.parse({ name: "Owner User" })).toEqual({
      name: "Owner User",
    });
  });

  it("accepts optional name as undefined", () => {
    expect(registrationMetadataSchema.parse({})).toEqual({});
  });
});

describe("invitationMetadataSchema", () => {
  it("accepts valid payload", () => {
    expect(
      invitationMetadataSchema.parse({
        tenantId: "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
        role: "member",
        invitedBy: "b1b2c3d4-e5f6-7890-abcd-ef1234567890",
      }),
    ).toMatchObject({ role: "member" });
  });

  it("accepts fully optional payload", () => {
    expect(invitationMetadataSchema.parse({})).toEqual({});
  });
});

describe("tenantSchema", () => {
  it("accepts valid tenant", () => {
    expect(
      tenantSchema.parse({
        ...BASE_ENTITY,
        name: "Enterprise",
        slug: "enterprise",
        status: "active",
      }),
    ).toMatchObject({ name: "Enterprise", slug: "enterprise", status: "active" });
  });

  it("rejects invalid status", () => {
    expect(() =>
      tenantSchema.parse({
        ...BASE_ENTITY,
        name: "Enterprise",
        slug: "enterprise",
        status: "paused",
      }),
    ).toThrow();
  });
});

describe("auditEntrySchema", () => {
  it("accepts valid entry", () => {
    expect(
      auditEntrySchema.parse({
        ...BASE_ENTITY,
        tenantId: "b1b2c3d4-e5f6-7890-abcd-ef1234567890",
        userId: "c1b2c3d4-e5f6-7890-abcd-ef1234567890",
        action: "update",
        resource: "profiles",
        resourceId: "d1b2c3d4-e5f6-7890-abcd-ef1234567890",
        metadata: { section: "account" },
        ipAddress: "127.0.0.1",
        userAgent: "Playwright",
      }),
    ).toMatchObject({ action: "update", resource: "profiles" });
  });

  it("accepts nullable fields (resourceId, metadata, ipAddress, userAgent) as null", () => {
    expect(
      auditEntrySchema.parse({
        ...BASE_ENTITY,
        tenantId: "b1b2c3d4-e5f6-7890-abcd-ef1234567890",
        userId: "c1b2c3d4-e5f6-7890-abcd-ef1234567890",
        action: "read",
        resource: "profiles",
        resourceId: null,
        metadata: null,
        ipAddress: null,
        userAgent: null,
      }),
    ).toMatchObject({ resourceId: null, metadata: null, ipAddress: null, userAgent: null });
  });

  it("rejects invalid IP", () => {
    expect(() =>
      auditEntrySchema.parse({
        ...BASE_ENTITY,
        tenantId: "b1b2c3d4-e5f6-7890-abcd-ef1234567890",
        userId: "c1b2c3d4-e5f6-7890-abcd-ef1234567890",
        action: "read",
        resource: "profiles",
        resourceId: null,
        metadata: null,
        ipAddress: "invalid-ip",
        userAgent: null,
      }),
    ).toThrow();
  });
});

describe("actionErrorSchema", () => {
  it("accepts valid error shape", () => {
    expect(
      actionErrorSchema.parse({
        code: "AUTH_FAILED",
        message: "Could not authenticate",
        details: { reason: "token-expired" },
      }),
    ).toMatchObject({ code: "AUTH_FAILED" });
  });
});

describe("actionResultSchema", () => {
  it("accepts success result shape", () => {
    const schema = actionResultSchema(emailField);
    expect(schema.parse({ success: true, data: "admin@enterprise.dev" })).toMatchObject({
      success: true,
      data: "admin@enterprise.dev",
    });
  });

  it("accepts failure result shape", () => {
    const schema = actionResultSchema(emailField);
    expect(
      schema.parse({
        success: false,
        error: {
          code: "FAILED",
          message: "Operation failed",
        },
      }),
    ).toMatchObject({ success: false, error: { code: "FAILED" } });
  });
});

describe("emailField", () => {
  it("accepts valid email", () => {
    expect(emailField.parse("admin@enterprise.dev")).toBe("admin@enterprise.dev");
  });

  it("rejects invalid email", () => {
    expect(() => emailField.parse("invalid")).toThrow();
  });
});

describe("nameField", () => {
  it("1-char and 255-char names accepted", () => {
    expect(nameField.parse("a")).toBe("a");
    expect(nameField.parse("a".repeat(255))).toBe("a".repeat(255));
  });

  it("empty and >255 rejected", () => {
    expect(() => nameField.parse("")).toThrow();
    expect(() => nameField.parse("a".repeat(256))).toThrow();
  });
});
