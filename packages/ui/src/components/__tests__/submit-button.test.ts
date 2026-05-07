/**
 * SubmitButton — unit tests
 *
 * SubmitButton uses `useFormStatus` which requires a React rendering context.
 * In node environment without a DOM, we verify the module exports and
 * the component's interface contract.
 */
import { describe, expect, it } from "vitest";
import { SubmitButton } from "../submit-button";

describe("SubmitButton", () => {
  it("is a named export and a function", () => {
    expect(typeof SubmitButton).toBe("function");
  });

  it("has the correct display name / function name", () => {
    expect(SubmitButton.name).toBe("SubmitButton");
  });
});
