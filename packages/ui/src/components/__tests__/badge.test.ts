/**
 * Badge — unit tests for semantic variants
 *
 * Tests the 5 new semantic variants added in T-01:
 * success, warning, info, accent, neutral
 *
 * We invoke the Badge component function directly and inspect the returned
 * React element's className — no DOM or rendering context required.
 *
 * Scenarios covered per variant:
 * - Rendered element has the expected background token class
 * - Rendered element has the expected text token class
 * - Rendered element has the expected border token class (or border-transparent for neutral)
 * - No raw color class (no bg-green-*, bg-yellow-*, etc.) present on semantic variants
 */

import { describe, expect, it } from "vitest";
import { Badge } from "../badge";

// Helper: extract className string from rendered Badge element
function getClassName(variant: Parameters<typeof Badge>[0]["variant"]): string {
  const result = Badge({ variant, children: "Label" });
  if (!result) throw new Error("Badge returned null");
  return (result as { props: { className: string } }).props.className ?? "";
}

describe("Badge — success variant", () => {
  it("includes bg-success/15 token", () => {
    expect(getClassName("success")).toContain("bg-success/15");
  });

  it("includes text-success token", () => {
    expect(getClassName("success")).toContain("text-success");
  });

  it("includes border-success/25 token", () => {
    expect(getClassName("success")).toContain("border-success/25");
  });

  it("does not use raw green color class", () => {
    expect(getClassName("success")).not.toMatch(/bg-green-\d+/);
    expect(getClassName("success")).not.toMatch(/text-green-\d+/);
  });
});

describe("Badge — warning variant", () => {
  it("includes bg-warning/15 token", () => {
    expect(getClassName("warning")).toContain("bg-warning/15");
  });

  it("includes text-warning token", () => {
    expect(getClassName("warning")).toContain("text-warning");
  });

  it("includes border-warning/25 token", () => {
    expect(getClassName("warning")).toContain("border-warning/25");
  });

  it("does not use raw yellow/amber color class", () => {
    expect(getClassName("warning")).not.toMatch(/bg-yellow-\d+/);
    expect(getClassName("warning")).not.toMatch(/bg-amber-\d+/);
  });
});

describe("Badge — info variant", () => {
  it("includes bg-info/15 token", () => {
    expect(getClassName("info")).toContain("bg-info/15");
  });

  it("includes text-info token", () => {
    expect(getClassName("info")).toContain("text-info");
  });

  it("includes border-info/25 token", () => {
    expect(getClassName("info")).toContain("border-info/25");
  });

  it("does not use raw blue/cyan color class", () => {
    expect(getClassName("info")).not.toMatch(/bg-blue-\d+/);
    expect(getClassName("info")).not.toMatch(/bg-cyan-\d+/);
  });
});

describe("Badge — accent variant", () => {
  it("includes bg-secondary/15 token", () => {
    expect(getClassName("accent")).toContain("bg-secondary/15");
  });

  it("includes text-secondary token", () => {
    expect(getClassName("accent")).toContain("text-secondary");
  });

  it("includes border-secondary/25 token", () => {
    expect(getClassName("accent")).toContain("border-secondary/25");
  });
});

describe("Badge — neutral variant", () => {
  it("includes bg-accent token", () => {
    expect(getClassName("neutral")).toContain("bg-accent");
  });

  it("includes text-muted-foreground token", () => {
    expect(getClassName("neutral")).toContain("text-muted-foreground");
  });

  it("includes border-transparent (no visible border)", () => {
    expect(getClassName("neutral")).toContain("border-transparent");
  });

  it("does not use any raw color class", () => {
    expect(getClassName("neutral")).not.toMatch(/bg-gray-\d+/);
    expect(getClassName("neutral")).not.toMatch(/bg-slate-\d+/);
  });
});
