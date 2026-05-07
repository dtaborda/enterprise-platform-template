import type { ActionResult } from "@enterprise/contracts";
import { getFieldError } from "@enterprise/contracts";
import { FormMessage } from "@enterprise/ui/components/form-message";
import { Label } from "@enterprise/ui/components/label";
import { cn } from "@enterprise/ui/lib/utils";
import {
  Children,
  cloneElement,
  isValidElement,
  type ReactElement,
  type ReactNode,
  useId,
} from "react";

interface FormFieldProps {
  /** Field name matching the input's name attribute and the Zod schema key */
  name: string;
  /** Label text */
  label: string;
  /** ActionResult from useActionState — reads field errors from here */
  state: ActionResult | null;
  /** Mark field as required (shows * indicator on label) */
  required?: boolean;
  /** Optional description text below the input */
  description?: string;
  /** Additional CSS classes on the wrapper */
  className?: string;
  /** The input element (Input, Textarea, Select, etc.) — must be the direct child */
  children: ReactNode;
}

export function FormField({
  name,
  label,
  state,
  required = false,
  description,
  className,
  children,
}: FormFieldProps) {
  const autoId = useId();
  const fieldId = `${name}-${autoId}`;
  const errorId = `${fieldId}-error`;
  const descriptionId = description ? `${fieldId}-desc` : undefined;
  const error = getFieldError(state, name);
  const hasError = Boolean(error);

  // Clone the child input to inject aria attributes
  const enhancedChildren = Children.map(children, (child) => {
    if (!isValidElement(child)) return child;
    return cloneElement(child as ReactElement<Record<string, unknown>>, {
      id: fieldId,
      name,
      "aria-invalid": hasError || undefined,
      "aria-describedby":
        [hasError ? errorId : undefined, descriptionId].filter(Boolean).join(" ") || undefined,
    });
  });

  return (
    <div className={cn("flex flex-col gap-1.5", className)}>
      <Label htmlFor={fieldId}>
        {label}
        {required && <span className="text-destructive"> *</span>}
      </Label>
      {enhancedChildren}
      {description && (
        <p id={descriptionId} className="text-xs text-muted-foreground">
          {description}
        </p>
      )}
      {hasError && <FormMessage id={errorId}>{error}</FormMessage>}
    </div>
  );
}
