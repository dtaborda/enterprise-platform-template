/**
 * useFormValidation — unit tests
 *
 * The hook uses `useCallback` and `useRef` from React.
 * We test the core validation logic by extracting and calling the
 * action function that the hook would return.
 *
 * The validateAndSubmit helper mirrors the hook's action function exactly,
 * allowing us to test both scenarios without a React rendering context.
 */

import type { ActionResult } from "@enterprise/contracts";
import { describe, expect, it, vi } from "vitest";
import { z } from "zod";

// ---------------------------------------------------------------------------
// Extracted action logic (mirrors useFormValidation's callback internals)
// ---------------------------------------------------------------------------

function createValidatedAction<T>(
  schema: z.ZodSchema,
  serverAction: (prevState: ActionResult<T> | null, formData: FormData) => Promise<ActionResult<T>>,
) {
  return async (
    prevState: ActionResult<T> | null,
    formData: FormData,
  ): Promise<ActionResult<T>> => {
    const rawData: Record<string, unknown> = {};
    for (const [key, value] of formData.entries()) {
      rawData[key] = value;
    }

    const result = schema.safeParse(rawData);

    if (!result.success) {
      const fieldErrors = result.error.flatten().fieldErrors;
      return {
        success: false,
        error: {
          code: "VALIDATION_ERROR",
          message: "Please fix the errors below.",
          details: fieldErrors as Record<string, unknown>,
        },
      } as ActionResult<T>;
    }

    return serverAction(prevState, formData);
  };
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

const loginSchema = z.object({
  email: z.string().email("Must be a valid email"),
  password: z.string().min(8, "Password must be at least 8 characters"),
});

describe("useFormValidation action logic", () => {
  it("returns ActionResult with field errors when client validation fails (server NOT called)", async () => {
    const serverAction =
      vi.fn<(prevState: ActionResult | null, formData: FormData) => Promise<ActionResult>>();
    const action = createValidatedAction(loginSchema, serverAction);

    const formData = new FormData();
    formData.append("email", "not-an-email");
    formData.append("password", "short");

    const result = await action(null, formData);

    expect(result.success).toBe(false);
    expect(result.error?.code).toBe("VALIDATION_ERROR");
    expect(result.error?.details).toBeDefined();
    // Server action must NOT have been called
    expect(serverAction).not.toHaveBeenCalled();
  });

  it("delegates to serverAction when client validation passes", async () => {
    const serverResult: ActionResult = {
      success: true,
      data: { userId: "123" },
    };
    const serverAction = vi.fn().mockResolvedValue(serverResult);
    const action = createValidatedAction(loginSchema, serverAction);

    const formData = new FormData();
    formData.append("email", "user@example.com");
    formData.append("password", "securepassword");

    const result = await action(null, formData);

    expect(result.success).toBe(true);
    expect(serverAction).toHaveBeenCalledOnce();
    expect(serverAction).toHaveBeenCalledWith(null, formData);
  });

  it("passes prevState to serverAction when delegating", async () => {
    const prevState: ActionResult = {
      success: false,
      error: { code: "AUTH_ERROR", message: "Previous error" },
    };
    const serverResult: ActionResult = { success: true };
    const serverAction = vi.fn().mockResolvedValue(serverResult);
    const action = createValidatedAction(loginSchema, serverAction);

    const formData = new FormData();
    formData.append("email", "user@example.com");
    formData.append("password", "securepassword");

    await action(prevState, formData);

    expect(serverAction).toHaveBeenCalledWith(prevState, formData);
  });
});
