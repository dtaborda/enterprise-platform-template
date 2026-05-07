/**
 * FormBanner — unit tests
 *
 * Tests the exported FormBanner component's render logic.
 * We invoke the component function directly since it has simple conditional logic.
 */

import type { ActionResult } from "@enterprise/contracts";
import { describe, expect, it } from "vitest";
import { FormBanner } from "../form-banner";

describe("FormBanner", () => {
  it("is a named export and a function", () => {
    expect(typeof FormBanner).toBe("function");
  });

  it("returns null when state is null", () => {
    const result = FormBanner({ state: null });
    expect(result).toBeNull();
  });

  it("renders error banner for form-level error (no field-level errors)", () => {
    const state: ActionResult = {
      success: false,
      error: {
        code: "AUTH_ERROR",
        message: "Invalid email or password.",
      },
    };
    const result = FormBanner({ state });
    expect(result).not.toBeNull();
    expect(result).toBeDefined();
  });

  it("returns null when there are field-level errors (banner is not shown)", () => {
    const state: ActionResult = {
      success: false,
      error: {
        code: "VALIDATION_ERROR",
        message: "Please fix the errors below.",
        details: { email: ["Required"] },
      },
    };
    const result = FormBanner({ state });
    expect(result).toBeNull();
  });

  it("renders success banner when state is successful and successMessage provided", () => {
    const state: ActionResult = { success: true, data: undefined };
    const result = FormBanner({ state, successMessage: "Saved successfully." });
    expect(result).not.toBeNull();
    expect(result).toBeDefined();
  });

  it("returns null when state is successful but no successMessage provided", () => {
    const state: ActionResult = { success: true, data: undefined };
    const result = FormBanner({ state });
    expect(result).toBeNull();
  });
});
