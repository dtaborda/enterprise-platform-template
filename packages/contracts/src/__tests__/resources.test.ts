import { describe, expect, it } from "vitest";
import {
  createResourceSchema,
  resourceQuerySchema,
  updateResourceSchema,
} from "../schemas/resources";

describe("createResourceSchema", () => {
  const validComplete = {
    title: "Payroll document",
    type: "document",
    status: "active",
    description: "Monthly payroll summary",
    metadata: { owner: "finance", pii: false },
    imageUrls: ["https://example.com/doc-1.png", "https://example.com/doc-2.png"],
  } as const;

  it("accepts a valid complete payload", () => {
    const result = createResourceSchema.safeParse(validComplete);
    expect(result.success).toBe(true);
  });

  it("accepts a minimal payload (only required fields)", () => {
    const result = createResourceSchema.safeParse({ title: "Basic resource", type: "product" });
    expect(result.success).toBe(true);
  });

  it("applies default status = active when not provided", () => {
    const result = createResourceSchema.parse({ title: "No status", type: "asset" });
    expect(result.status).toBe("active");
  });

  it("rejects payload with missing title", () => {
    const result = createResourceSchema.safeParse({ type: "service" });
    expect(result.success).toBe(false);
  });

  it("rejects payload with empty title", () => {
    const result = createResourceSchema.safeParse({ title: "", type: "service" });
    expect(result.success).toBe(false);
  });

  it("rejects invalid enum value for type", () => {
    const result = createResourceSchema.safeParse({ title: "Invalid", type: "license" });
    expect(result.success).toBe(false);
  });

  it("rejects invalid enum value for status", () => {
    const result = createResourceSchema.safeParse({
      title: "Invalid",
      type: "service",
      status: "deleted",
    });
    expect(result.success).toBe(false);
  });

  it("accepts metadata object", () => {
    const result = createResourceSchema.safeParse({
      title: "With metadata",
      type: "other",
      metadata: { nested: { foo: "bar" }, quantity: 2 },
    });
    expect(result.success).toBe(true);
  });

  it("rejects invalid image URL", () => {
    const result = createResourceSchema.safeParse({
      title: "Bad URL",
      type: "document",
      imageUrls: ["https://valid.com/img.png", "invalid-url"],
    });
    expect(result.success).toBe(false);
  });
});

describe("updateResourceSchema", () => {
  it("accepts empty object", () => {
    const result = updateResourceSchema.safeParse({});
    expect(result.success).toBe(true);
  });

  it("accepts partial update", () => {
    const result = updateResourceSchema.safeParse({ title: "Updated" });
    expect(result.success).toBe(true);
  });

  it("rejects invalid partial type", () => {
    const result = updateResourceSchema.safeParse({ type: "machine" });
    expect(result.success).toBe(false);
  });
});

describe("resourceQuerySchema", () => {
  it("applies default limit and offset", () => {
    const result = resourceQuerySchema.parse({});
    expect(result.limit).toBe(20);
    expect(result.offset).toBe(0);
  });

  it("accepts custom pagination", () => {
    const result = resourceQuerySchema.parse({ limit: 30, offset: 10 });
    expect(result.limit).toBe(30);
    expect(result.offset).toBe(10);
  });

  it("rejects invalid pagination", () => {
    expect(resourceQuerySchema.safeParse({ limit: 0 }).success).toBe(false);
    expect(resourceQuerySchema.safeParse({ offset: -1 }).success).toBe(false);
  });

  it("accepts valid filters", () => {
    const result = resourceQuerySchema.safeParse({ type: "asset", status: "draft" });
    expect(result.success).toBe(true);
  });
});
