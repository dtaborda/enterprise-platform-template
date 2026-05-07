import type { ActionResult } from "./platform";

/** Field-level validation errors from Zod flatten().fieldErrors */
export type FieldErrors = Record<string, string[]>;

/**
 * Extract the first error message for a given field from an ActionResult.
 *
 * @param result - The ActionResult from useActionState (can be null on initial render)
 * @param field - The field name to look up
 * @returns The first error message, or undefined if no error
 */
export function getFieldError<T>(
  result: ActionResult<T> | null,
  field: string,
): string | undefined {
  if (!result || result.success) return undefined;
  const details = result.error?.details as FieldErrors | undefined;
  return details?.[field]?.[0];
}

/**
 * Check if the ActionResult has any field-level errors (vs only a form-level error).
 */
export function hasFieldErrors<T>(result: ActionResult<T> | null): boolean {
  if (!result || result.success) return false;
  const details = result.error?.details as FieldErrors | undefined;
  return details !== undefined && Object.keys(details).length > 0;
}
