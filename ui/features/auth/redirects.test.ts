import { describe, expect, it } from "vitest";
import { ROUTES } from "../../lib/routes";
import { normalizeSafeRedirectPath } from "./redirects";

describe("normalizeSafeRedirectPath", () => {
  it("null and undefined input return fallback", () => {
    expect(normalizeSafeRedirectPath(null)).toBe(ROUTES.dashboard);
    expect(normalizeSafeRedirectPath(undefined)).toBe(ROUTES.dashboard);
  });

  it("empty or whitespace-only input returns fallback", () => {
    expect(normalizeSafeRedirectPath("")).toBe(ROUTES.dashboard);
    expect(normalizeSafeRedirectPath("   ")).toBe(ROUTES.dashboard);
  });

  it("backslash injection (/\\path) returns fallback", () => {
    expect(normalizeSafeRedirectPath("/\\path")).toBe(ROUTES.dashboard);
  });

  it("newline/carriage-return injection returns fallback", () => {
    expect(normalizeSafeRedirectPath(`${ROUTES.dashboard}\n/evil`)).toBe(ROUTES.dashboard);
    expect(normalizeSafeRedirectPath(`${ROUTES.dashboard}\r/evil`)).toBe(ROUTES.dashboard);
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
