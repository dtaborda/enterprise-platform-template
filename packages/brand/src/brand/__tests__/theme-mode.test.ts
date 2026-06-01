import { describe, expect, it } from "vitest";

import { deriveThemeMode } from "../theme-mode";

describe("deriveThemeMode", () => {
  it("returns 'light' when themeRef is exactly 'light'", () => {
    expect(deriveThemeMode("light")).toBe("light");
  });

  it("returns 'dark' when themeRef is exactly 'dark'", () => {
    expect(deriveThemeMode("dark")).toBe("dark");
  });

  it("returns 'light' when themeRef ends with 'light' (e.g. 'acme-light')", () => {
    expect(deriveThemeMode("acme-light")).toBe("light");
  });

  it("returns 'dark' when themeRef does NOT end with 'light' (e.g. 'acme-dark')", () => {
    expect(deriveThemeMode("acme-dark")).toBe("dark");
  });
});
