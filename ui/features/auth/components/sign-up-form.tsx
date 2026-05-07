"use client";

import { signUpDto } from "@enterprise/contracts";
import { FormBanner } from "@enterprise/ui/components/form-banner";
import { FormField } from "@enterprise/ui/components/form-field";
import { Input } from "@enterprise/ui/components/input";
import { SubmitButton } from "@enterprise/ui/components/submit-button";
import { useFormValidation } from "@enterprise/ui/hooks/use-form-validation";
import { useActionState } from "react";
import { signUpAction } from "@/features/auth/actions";

export function SignUpForm() {
  const validatedAction = useFormValidation({
    schema: signUpDto,
    serverAction: signUpAction,
  });
  const [state, formAction] = useActionState(validatedAction, null);

  return (
    <form action={formAction} noValidate className="flex flex-col gap-4">
      <FormBanner state={state} />

      <FormField name="name" label="Full name" state={state}>
        <Input type="text" placeholder="Jane Doe" />
      </FormField>

      <FormField name="email" label="Email" state={state} required>
        <Input type="email" placeholder="you@example.com" />
      </FormField>

      <FormField name="password" label="Password" state={state} required>
        <Input type="password" />
      </FormField>

      <SubmitButton pendingText="Creating account…" className="w-full">
        Create account
      </SubmitButton>
    </form>
  );
}
