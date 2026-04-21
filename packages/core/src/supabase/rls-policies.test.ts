import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const migrationPath = resolve(
  import.meta.dirname,
  "../../../../supabase/migrations/20260420000001_initial_schema.sql",
);
const migrationSql = readFileSync(migrationPath, "utf8");

describe("RLS policies", () => {
  it("reads tenant_id and role from auth.jwt app_metadata claims", () => {
    expect(migrationSql).toContain("auth.jwt()->'app_metadata'->>'tenant_id'");
    expect(migrationSql).toContain("auth.jwt()->'app_metadata'->>'role'");
  });
});
