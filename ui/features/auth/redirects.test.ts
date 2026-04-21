import { describe, expect, it } from "vitest";
import { normalizeSafeRedirectPath } from "./redirects";

describe("normalizeSafeRedirectPath", () => {
  it("null and undefined input return fallback", () => {
    expect(normalizeSafeRedirectPath(null)).toBe("/dashboard");
    expect(normalizeSafeRedirectPath(undefined)).toBe("/dashboard");
  });

  it("empty or whitespace-only input returns fallback", () => {
    expect(normalizeSafeRedirectPath("")).toBe("/dashboard");
    expect(normalizeSafeRedirectPath("   ")).toBe("/dashboard");
  });

  it("backslash injection (/\\path) returns fallback", () => {
    expect(normalizeSafeRedirectPath("/\\path")).toBe("/dashboard");
  });

  it("newline/carriage-return injection returns fallback", () => {
    expect(normalizeSafeRedirectPath("/dashboard\n/evil")).toBe("/dashboard");
    expect(normalizeSafeRedirectPath("/dashboard\r/evil")).toBe("/dashboard");
  });

  it("invalid value with custom fallback returns the custom fallback", () => {
    expect(normalizeSafeRedirectPath("https://evil.example/path", "/custom-home")).toBe(
      "/custom-home",
    );
  });

  it("null value with custom fallback returns the custom fallback", () => {
    expect(normalizeSafeRedirectPath(null, "/custom-home")).toBe("/custom-home");
  });

  it("valid internal path with query+fragment remains unchanged", () => {
    expect(normalizeSafeRedirectPath("/dashboard/settings?tab=team#billing")).toBe(
      "/dashboard/settings?tab=team#billing",
    );
  });
});
