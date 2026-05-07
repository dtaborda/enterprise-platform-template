import type { ActionResult } from "@enterprise/contracts";
import { hasFieldErrors } from "@enterprise/contracts";
import { cn } from "@enterprise/ui/lib/utils";

interface FormBannerProps<T> {
  state: ActionResult<T> | null;
  /** Message shown on success. If undefined, no success banner is shown. */
  successMessage?: string;
  className?: string;
}

export function FormBanner<T>({ state, successMessage, className }: FormBannerProps<T>) {
  if (!state) return null;

  // Success
  if (state.success && successMessage) {
    return (
      <p className={cn("rounded-md bg-green-500/10 px-3 py-2 text-sm text-green-500", className)}>
        {successMessage}
      </p>
    );
  }

  // Error — but only show banner for form-level errors, not field-level
  if (!state.success && !hasFieldErrors(state)) {
    return (
      <p
        role="alert"
        className={cn("rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive", className)}
      >
        {state.error?.message ?? "An error occurred. Please try again."}
      </p>
    );
  }

  return null;
}
