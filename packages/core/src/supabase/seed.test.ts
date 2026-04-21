import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const seedPath = resolve(import.meta.dirname, "../../../../supabase/seed.sql");
const seedSql = readFileSync(seedPath, "utf8");

describe("supabase seed auth users", () => {
  it("includes deterministic owner/member/guest/reset credentials", () => {
    expect(seedSql).toContain("admin@enterprise.dev");
    expect(seedSql).toContain("member@enterprise.dev");
    expect(seedSql).toContain("guest@enterprise.dev");
    expect(seedSql).toContain("reset@enterprise.dev");
    expect(seedSql).toContain("password123");
  });

  it("adds matching auth.identities records for all seeded users", () => {
    expect(seedSql).toContain("INSERT INTO auth.identities");
    const identityRows = (seedSql.match(/'[^']+@enterprise\.dev'/gi) ?? []).length;
    expect(identityRows).toBeGreaterThanOrEqual(5);
  });

  it("reassigns member and guest profiles to owner tenant with corrected roles", () => {
    expect(seedSql).toContain("UPDATE public.profiles");
    expect(seedSql).toContain("member@enterprise.dev");
    expect(seedSql).toContain("guest@enterprise.dev");
    expect(seedSql).toContain("THEN 'member'");
    expect(seedSql).toContain("THEN 'guest'");
  });

  it("persists tenant_id and role in auth app metadata for JWT claims", () => {
    expect(seedSql).toContain("UPDATE auth.users");
    expect(seedSql).toContain("raw_app_meta_data");
    expect(seedSql).toContain("tenant_id");
    expect(seedSql).toContain("'role'");
  });
});
