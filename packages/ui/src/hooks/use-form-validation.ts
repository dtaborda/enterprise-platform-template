"use client";

import type { ActionResult } from "@enterprise/contracts";
import { useCallback, useRef } from "react";
import type { ZodSchema } from "zod";

interface UseFormValidationOptions<T> {
  /** Zod schema to validate against (same schema used server-side) */
  schema: ZodSchema;
  /** The server action wrapped by useActionState */
  serverAction: (prevState: ActionResult<T> | null, formData: FormData) => Promise<ActionResult<T>>;
}

/**
 * Wraps a server action with client-side Zod validation.
 * Returns a new action function that validates client-side first,
 * returning field errors immediately without a server round-trip.
 *
 * Usage:
 *   const validatedAction = useFormValidation({ schema: loginDto, serverAction: signInAction });
 *   const [state, formAction, isPending] = useActionState(validatedAction, null);
 */
export function useFormValidation<T>({ schema, serverAction }: UseFormValidationOptions<T>) {
  const serverActionRef = useRef(serverAction);
  serverActionRef.current = serverAction;

  return useCallback(
    async (prevState: ActionResult<T> | null, formData: FormData): Promise<ActionResult<T>> => {
      // Convert FormData to plain object for Zod validation
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

      // Client validation passed — proceed to server
      return serverActionRef.current(prevState, formData);
    },
    [schema],
  );
}
