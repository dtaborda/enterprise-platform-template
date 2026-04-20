import { describe, expect, it } from "vitest";
import { paginatedSchema, paginationParamsSchema, slugField, userRoleSchema } from "./platform";

describe("platform schemas", () => {
  it("accepts a valid slug and rejects invalid format", () => {
    expect(slugField.parse("tenant-001")).toBe("tenant-001");
    expect(() => slugField.parse("Tenant 001")).toThrowError("Invalid slug format");
  });

  it("defaults pagination limit to 20", () => {
    const parsed = paginationParamsSchema.parse({});

    expect(parsed.limit).toBe(20);
    expect(parsed.cursor).toBeUndefined();
  });

  it("builds paginated schemas for role items", () => {
    const schema = paginatedSchema(userRoleSchema);
    const parsed = schema.parse({
      items: ["owner", "member"],
      pageInfo: {
        hasNextPage: false,
        hasPreviousPage: false,
        startCursor: null,
        endCursor: null,
      },
    });

    expect(parsed.items).toEqual(["owner", "member"]);
  });
});
