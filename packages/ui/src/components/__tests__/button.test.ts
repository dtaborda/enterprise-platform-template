/**
 * Button — unit tests for gradient and destructive-ghost variants
 *
 * Tests the 2 new variants added in T-03:
 * gradient, destructive-ghost
 *
 * We invoke the Button component function directly and inspect the returned
 * React element's className — no DOM or rendering context required.
 *
 * Scenarios covered:
 * - gradient: bg-gradient-to-r, from-primary, to-secondary, text-white
 * - destructive-ghost: text-destructive, hover:bg-destructive/10
 */

import { describe, expect, it } from "vitest";
import { Button } from "../button";

// Helper: extract className string from rendered Button element
function getClassName(variant: Parameters<typeof Button>[0]["variant"]): string {
  const result = Button({ variant, children: "Label" });
  if (!result) throw new Error("Button returned null");
  return (result as { props: { className: string } }).props.className ?? "";
}

describe("Button — gradient variant", () => {
  it("includes bg-gradient-to-r class", () => {
    expect(getClassName("gradient")).toContain("bg-gradient-to-r");
  });

  it("includes from-primary class", () => {
    expect(getClassName("gradient")).toContain("from-primary");
  });

  it("includes to-secondary class", () => {
    expect(getClassName("gradient")).toContain("to-secondary");
  });

  it("includes text-white class", () => {
    expect(getClassName("gradient")).toContain("text-white");
  });

  it("includes hover:opacity-90 for hover effect", () => {
    expect(getClassName("gradient")).toContain("hover:opacity-90");
  });
});

describe("Button — destructive-ghost variant", () => {
  it("includes text-destructive class", () => {
    expect(getClassName("destructive-ghost")).toContain("text-destructive");
  });

  it("includes hover:bg-destructive/10 class", () => {
    expect(getClassName("destructive-ghost")).toContain("hover:bg-destructive/10");
  });

  it("does not include a solid bg-destructive (non-hover) background class", () => {
    const cls = getClassName("destructive-ghost");
    // The variant should not have solid `bg-destructive` without a modifier prefix
    // (hover:bg-destructive/10 is allowed, but bare bg-destructive is not)
    const classes = cls.split(" ");
    expect(classes).not.toContain("bg-destructive");
  });
});
