/**
 * FormBanner — unit tests
 *
 * Tests the exported FormBanner component's conditional render logic.
 * We invoke the component function directly and inspect the returned React
 * element's props — no DOM or rendering context required.
 *
 * Scenarios covered:
 * - Returns null when state is null
 * - Renders error banner with role="alert" for form-level errors only
 * - Does NOT render banner when hasFieldErrors(state) is true
 * - Renders success banner (green classes) when state.success && successMessage
 * - Returns null when state.success but no successMessage provided
 */

import type { ActionResult } from "@enterprise/contracts";
import { describe, expect, it } from "vitest";
import { FormBanner } from "../form-banner";

describe("FormBanner", () => {
  it("returns null when state is null", () => {
    const result = FormBanner({ state: null });
    expect(result).toBeNull();
  });

  it("renders error banner with role='alert' for form-level error (no field-level errors)", () => {
    const state: ActionResult = {
      success: false,
      error: {
        code: "AUTH_ERROR",
        message: "Invalid email or password.",
      },
    };
    const result = FormBanner({ state });
    expect(result).not.toBeNull();
    expect(result).toMatchObject({ props: { role: "alert" } });
  });

  it("error banner contains the error message from state", () => {
    const state: ActionResult = {
      success: false,
      error: {
        code: "AUTH_ERROR",
        message: "Something went wrong.",
      },
    };
    const result = FormBanner({ state });
    expect(result).toMatchObject({ props: { children: "Something went wrong." } });
  });

  it("returns null when there are field-level errors (hasFieldErrors is true)", () => {
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

  it("renders success banner (green classes) when state.success && successMessage provided", () => {
    const state: ActionResult = { success: true, data: undefined };
    const result = FormBanner({ state, successMessage: "Saved successfully." });
    expect(result).not.toBeNull();
    const className: string = (result as { props: { className: string } }).props.className;
    expect(className).toContain("bg-green-500");
    expect(className).toContain("text-green-500");
  });

  it("success banner has no role='alert'", () => {
    const state: ActionResult = { success: true, data: undefined };
    const result = FormBanner({ state, successMessage: "Done." });
    // Success banner is informational, not an alert
    const role = (result as { props: { role?: string } }).props.role;
    expect(role).toBeUndefined();
  });

  it("returns null when state.success but no successMessage provided", () => {
    const state: ActionResult = { success: true, data: undefined };
    const result = FormBanner({ state });
    expect(result).toBeNull();
  });
});
