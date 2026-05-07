import { describe, expect, it } from "vitest";
import { getFieldError, hasFieldErrors } from "../types/form";
import type { ActionResult } from "../types/platform";

// ---------------------------------------------------------------------------
// getFieldError
// ---------------------------------------------------------------------------

describe("getFieldError", () => {
  it("returns undefined when result is null (initial state)", () => {
    expect(getFieldError(null, "email")).toBeUndefined();
  });

  it("returns undefined when result is a success", () => {
    const result: ActionResult = { success: true, data: undefined };
    expect(getFieldError(result, "email")).toBeUndefined();
  });

  it("returns the first error string when the field has errors", () => {
    const result: ActionResult = {
      success: false,
      error: {
        code: "VALIDATION_ERROR",
        message: "Please fix the errors below.",
        details: { email: ["Required", "Must be a valid email"] },
      },
    };
    expect(getFieldError(result, "email")).toBe("Required");
  });

  it("returns undefined when the field key is missing from details", () => {
    const result: ActionResult = {
      success: false,
      error: {
        code: "VALIDATION_ERROR",
        message: "Please fix the errors below.",
        details: { password: ["Required"] },
      },
    };
    expect(getFieldError(result, "email")).toBeUndefined();
  });

  it("returns undefined when error has no details object", () => {
    const result: ActionResult = {
      success: false,
      error: {
        code: "AUTH_ERROR",
        message: "Invalid email or password.",
      },
    };
    expect(getFieldError(result, "email")).toBeUndefined();
  });
});

// ---------------------------------------------------------------------------
// hasFieldErrors
// ---------------------------------------------------------------------------

describe("hasFieldErrors", () => {
  it("returns false when result is null (initial state)", () => {
    expect(hasFieldErrors(null)).toBe(false);
  });

  it("returns false when result is a success", () => {
    const result: ActionResult = { success: true, data: undefined };
    expect(hasFieldErrors(result)).toBe(false);
  });

  it("returns true when error details has at least one key", () => {
    const result: ActionResult = {
      success: false,
      error: {
        code: "VALIDATION_ERROR",
        message: "Please fix the errors below.",
        details: { email: ["Required"] },
      },
    };
    expect(hasFieldErrors(result)).toBe(true);
  });

  it("returns false when error has no details object", () => {
    const result: ActionResult = {
      success: false,
      error: {
        code: "AUTH_ERROR",
        message: "Invalid email or password.",
      },
    };
    expect(hasFieldErrors(result)).toBe(false);
  });
});
