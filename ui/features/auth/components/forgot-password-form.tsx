"use client";

import { resetPasswordDto } from "@enterprise/contracts";
import { FormBanner } from "@enterprise/ui/components/form-banner";
import { FormField } from "@enterprise/ui/components/form-field";
import { Input } from "@enterprise/ui/components/input";
import { SubmitButton } from "@enterprise/ui/components/submit-button";
import { useFormValidation } from "@enterprise/ui/hooks/use-form-validation";
import { useActionState } from "react";
import { forgotPasswordAction } from "@/features/auth/actions";

export function ForgotPasswordForm() {
  const validatedAction = useFormValidation({
    schema: resetPasswordDto,
    serverAction: forgotPasswordAction,
  });
  const [state, formAction] = useActionState(validatedAction, null);

  return (
    <form action={formAction} noValidate className="flex flex-col gap-4">
      <FormBanner state={state} />

      <FormField name="email" label="Email" state={state} required>
        <Input type="email" placeholder="you@example.com" />
      </FormField>

      <SubmitButton pendingText="Sending…" className="w-full">
        Send reset link
      </SubmitButton>
    </form>
  );
}
