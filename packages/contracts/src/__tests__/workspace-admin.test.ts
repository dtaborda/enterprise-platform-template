import { describe, expect, it } from "vitest";
import {
  updateWorkspaceProfileSchema,
  updateWorkspaceRegionalSchema,
  updateWorkspaceSecuritySchema,
  updateWorkspaceSlugSchema,
} from "../dto/workspace-admin";

// ============================================================================
// updateWorkspaceProfileSchema
// ============================================================================

describe("updateWorkspaceProfileSchema", () => {
  it("accepts a valid 1-character name", () => {
    const result = updateWorkspaceProfileSchema.safeParse({ name: "A" });
    expect(result.success).toBe(true);
  });

  it("accepts a valid 100-character name", () => {
    const result = updateWorkspaceProfileSchema.safeParse({ name: "A".repeat(100) });
    expect(result.success).toBe(true);
  });

  it("rejects an empty string", () => {
    const result = updateWorkspaceProfileSchema.safeParse({ name: "" });
    expect(result.success).toBe(false);
  });

  it("rejects a 101-character name", () => {
    const result = updateWorkspaceProfileSchema.safeParse({ name: "A".repeat(101) });
    expect(result.success).toBe(false);
  });

  it("trims leading and trailing whitespace", () => {
    const result = updateWorkspaceProfileSchema.parse({ name: "  Acme Corp  " });
    expect(result.name).toBe("Acme Corp");
  });
});

// ============================================================================
// updateWorkspaceSlugSchema
// ============================================================================

describe("updateWorkspaceSlugSchema", () => {
  it("accepts a valid 3-character slug", () => {
    const result = updateWorkspaceSlugSchema.safeParse({ slug: "abc" });
    expect(result.success).toBe(true);
  });

  it("accepts a valid slug with hyphens and numbers", () => {
    const result = updateWorkspaceSlugSchema.safeParse({ slug: "my-workspace-2" });
    expect(result.success).toBe(true);
  });

  it("accepts a valid 50-character slug", () => {
    // 50 chars: starts and ends with alphanumeric
    const result = updateWorkspaceSlugSchema.safeParse({ slug: `a${"b".repeat(48)}c` });
    expect(result.success).toBe(true);
  });

  it("rejects a 2-character slug (too short)", () => {
    const result = updateWorkspaceSlugSchema.safeParse({ slug: "ab" });
    expect(result.success).toBe(false);
  });

  it("rejects a 51-character slug (too long)", () => {
    const result = updateWorkspaceSlugSchema.safeParse({ slug: "a".repeat(51) });
    expect(result.success).toBe(false);
  });

  it("rejects uppercase letters", () => {
    const result = updateWorkspaceSlugSchema.safeParse({ slug: "ABC" });
    expect(result.success).toBe(false);
  });

  it("rejects spaces", () => {
    const result = updateWorkspaceSlugSchema.safeParse({ slug: "my workspace" });
    expect(result.success).toBe(false);
  });

  it("rejects a slug starting with a hyphen", () => {
    const result = updateWorkspaceSlugSchema.safeParse({ slug: "-my-slug" });
    expect(result.success).toBe(false);
  });

  it("rejects a slug ending with a hyphen", () => {
    const result = updateWorkspaceSlugSchema.safeParse({ slug: "my-slug-" });
    expect(result.success).toBe(false);
  });

  it("rejects a slug with uppercase mixed in", () => {
    const result = updateWorkspaceSlugSchema.safeParse({ slug: "My-Workspace" });
    expect(result.success).toBe(false);
  });
});

// ============================================================================
// updateWorkspaceRegionalSchema
// ============================================================================

describe("updateWorkspaceRegionalSchema", () => {
  it("accepts valid timezone and locale", () => {
    const result = updateWorkspaceRegionalSchema.safeParse({
      timezone: "America/New_York",
      locale: "en-US",
    });
    expect(result.success).toBe(true);
  });

  it("accepts another valid timezone", () => {
    const result = updateWorkspaceRegionalSchema.safeParse({
      timezone: "UTC",
      locale: "pt-BR",
    });
    expect(result.success).toBe(true);
  });

  it("rejects empty timezone", () => {
    const result = updateWorkspaceRegionalSchema.safeParse({
      timezone: "",
      locale: "en-US",
    });
    expect(result.success).toBe(false);
  });

  it("rejects locale too short (1 character)", () => {
    const result = updateWorkspaceRegionalSchema.safeParse({
      timezone: "UTC",
      locale: "e",
    });
    expect(result.success).toBe(false);
  });

  it("rejects locale too long (11 characters)", () => {
    const result = updateWorkspaceRegionalSchema.safeParse({
      timezone: "UTC",
      locale: "en-US-extra1",
    });
    expect(result.success).toBe(false);
  });

  it("accepts locale at minimum boundary (2 characters)", () => {
    const result = updateWorkspaceRegionalSchema.safeParse({
      timezone: "UTC",
      locale: "en",
    });
    expect(result.success).toBe(true);
  });

  it("accepts timezone at maximum boundary (100 characters)", () => {
    const result = updateWorkspaceRegionalSchema.safeParse({
      timezone: "A".repeat(100),
      locale: "en-US",
    });
    expect(result.success).toBe(true);
  });
});

// ============================================================================
// updateWorkspaceSecuritySchema
// ============================================================================

describe("updateWorkspaceSecuritySchema", () => {
  it("accepts true", () => {
    const result = updateWorkspaceSecuritySchema.safeParse({ allowAdminInvites: true });
    expect(result.success).toBe(true);
  });

  it("accepts false", () => {
    const result = updateWorkspaceSecuritySchema.safeParse({ allowAdminInvites: false });
    expect(result.success).toBe(true);
  });

  it("rejects string 'true'", () => {
    const result = updateWorkspaceSecuritySchema.safeParse({ allowAdminInvites: "true" });
    expect(result.success).toBe(false);
  });

  it("rejects string 'false'", () => {
    const result = updateWorkspaceSecuritySchema.safeParse({ allowAdminInvites: "false" });
    expect(result.success).toBe(false);
  });

  it("rejects number 1", () => {
    const result = updateWorkspaceSecuritySchema.safeParse({ allowAdminInvites: 1 });
    expect(result.success).toBe(false);
  });

  it("rejects null", () => {
    const result = updateWorkspaceSecuritySchema.safeParse({ allowAdminInvites: null });
    expect(result.success).toBe(false);
  });
});
