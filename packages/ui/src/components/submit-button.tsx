"use client";

import { Button } from "@enterprise/ui/components/button";
import type { ComponentProps } from "react";
import { useFormStatus } from "react-dom";

interface SubmitButtonProps extends Omit<ComponentProps<typeof Button>, "type" | "disabled"> {
  /** Text shown while form is submitting */
  pendingText?: string;
}

export function SubmitButton({ children, pendingText = "Saving…", ...props }: SubmitButtonProps) {
  const { pending } = useFormStatus();

  return (
    <Button type="submit" disabled={pending} {...props}>
      {pending ? pendingText : children}
    </Button>
  );
}
