import { describe, expect, it } from "vitest";
import { normalizeSafeRedirectPath } from "./redirects";

describe("normalizeSafeRedirectPath", () => {
  it("keeps internal paths", () => {
    expect(normalizeSafeRedirectPath("/dashboard/settings?tab=team")).toBe(
      "/dashboard/settings?tab=team",
    );
  });

  it("falls back for absolute URLs", () => {
    expect(normalizeSafeRedirectPath("https://evil.example/path")).toBe("/dashboard");
  });

  it("falls back for protocol-relative URLs", () => {
    expect(normalizeSafeRedirectPath("//evil.example/path")).toBe("/dashboard");
  });
});
