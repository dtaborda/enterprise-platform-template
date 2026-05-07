/**
 * FormMessage — unit tests
 *
 * Tests the exported FormMessage component's render logic.
 * Since the ui project runs in a node environment without a DOM,
 * we test the module exports and confirm the component is exported correctly.
 * The core logic (returns null when children is falsy) is a conditional return —
 * validated here by confirming the component is a function with the right shape.
 */
import { describe, expect, it } from "vitest";
import { FormMessage } from "../form-message";

describe("FormMessage", () => {
  it("is a named export and a function", () => {
    expect(typeof FormMessage).toBe("function");
  });

  it("returns null when children is falsy (empty string)", () => {
    // Invoke component function directly — no DOM needed for null-return check
    const result = FormMessage({ children: "" });
    expect(result).toBeNull();
  });

  it("returns null when children is undefined", () => {
    const result = FormMessage({ children: undefined });
    expect(result).toBeNull();
  });

  it("returns a React element when children is a non-empty string", () => {
    const result = FormMessage({ children: "Required" });
    expect(result).not.toBeNull();
    expect(result).toBeDefined();
  });
});
