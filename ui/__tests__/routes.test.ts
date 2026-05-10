import { describe, expect, it } from "vitest";
import { ROUTES } from "../lib/routes";

describe("ROUTES constant", () => {
  it("ROUTES.dashboard equals /dashboard", () => {
    expect(ROUTES.dashboard).toBe("/dashboard");
  });

  it("ROUTES.settings equals /settings", () => {
    expect(ROUTES.settings).toBe("/settings");
  });

  it("ROUTES.team equals /team", () => {
    expect(ROUTES.team).toBe("/team");
  });

  it("ROUTES.resources.root equals /resources", () => {
    expect(ROUTES.resources.root).toBe("/resources");
  });

  it("ROUTES.resources.new equals /resources/new", () => {
    expect(ROUTES.resources.new).toBe("/resources/new");
  });

  it("ROUTES.resources.detail(abc123) returns /resources/abc123", () => {
    expect(ROUTES.resources.detail("abc123")).toBe("/resources/abc123");
  });

  it("ROUTES.resources.edit(xyz) returns /resources/xyz/edit", () => {
    expect(ROUTES.resources.edit("xyz")).toBe("/resources/xyz/edit");
  });

  it("typeof ROUTES.resources.detail equals function", () => {
    expect(typeof ROUTES.resources.detail).toBe("function");
  });

  it("ROUTES.settings does NOT start with /dashboard", () => {
    expect(ROUTES.settings.startsWith("/dashboard")).toBe(false);
  });

  it("ROUTES.team does NOT start with /dashboard", () => {
    expect(ROUTES.team.startsWith("/dashboard")).toBe(false);
  });

  it("ROUTES.resources.root does NOT start with /dashboard", () => {
    expect(ROUTES.resources.root.startsWith("/dashboard")).toBe(false);
  });

  it("ROUTES object contains all required keys (no undefined)", () => {
    expect(ROUTES.dashboard).toBeDefined();
    expect(ROUTES.settings).toBeDefined();
    expect(ROUTES.team).toBeDefined();
    expect(ROUTES.resources).toBeDefined();
    expect(ROUTES.resources.root).toBeDefined();
    expect(ROUTES.resources.new).toBeDefined();
    expect(ROUTES.resources.detail).toBeDefined();
    expect(ROUTES.resources.edit).toBeDefined();
  });
});
