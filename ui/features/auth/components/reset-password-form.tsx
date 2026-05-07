"use client";

import { updatePasswordDto } from "@enterprise/contracts";
import { FormBanner } from "@enterprise/ui/components/form-banner";
import { FormField } from "@enterprise/ui/components/form-field";
import { Input } from "@enterprise/ui/components/input";
import { SubmitButton } from "@enterprise/ui/components/submit-button";
import { useFormValidation } from "@enterprise/ui/hooks/use-form-validation";
import { useActionState } from "react";
import { updatePasswordAction } from "@/features/auth/actions";

export function ResetPasswordForm() {
  const validatedAction = useFormValidation({
    schema: updatePasswordDto,
    serverAction: updatePasswordAction,
  });
  const [state, formAction] = useActionState(validatedAction, null);

  return (
    <form action={formAction} noValidate className="flex flex-col gap-4">
      <FormBanner state={state} />

      <FormField name="password" label="New password" state={state} required>
        <Input type="password" />
      </FormField>

      <FormField name="confirmPassword" label="Confirm password" state={state} required>
        <Input type="password" />
      </FormField>

      <SubmitButton pendingText="Updating…" className="w-full">
        Update password
      </SubmitButton>
    </form>
  );
}
