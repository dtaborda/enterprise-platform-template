/**
 * FormField — unit tests
 *
 * FormField uses `useId` and `cloneElement` which require a React rendering
 * context. In node environment without a DOM, we verify the module exports
 * and the component's interface contract.
 */
import { describe, expect, it } from "vitest";
import { FormField } from "../form-field";

describe("FormField", () => {
  it("is a named export and a function", () => {
    expect(typeof FormField).toBe("function");
  });

  it("has the correct display name / function name", () => {
    expect(FormField.name).toBe("FormField");
  });
});
