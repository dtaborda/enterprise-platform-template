"use client";

import { loginDto } from "@enterprise/contracts";
import { FormBanner } from "@enterprise/ui/components/form-banner";
import { FormField } from "@enterprise/ui/components/form-field";
import { Input } from "@enterprise/ui/components/input";
import { SubmitButton } from "@enterprise/ui/components/submit-button";
import { useFormValidation } from "@enterprise/ui/hooks/use-form-validation";
import { useActionState } from "react";
import { signInAction } from "@/features/auth/actions";

interface SignInFormProps {
  redirectTo?: string;
}

export function SignInForm({ redirectTo }: SignInFormProps) {
  const validatedAction = useFormValidation({
    schema: loginDto,
    serverAction: signInAction,
  });
  const [state, formAction] = useActionState(validatedAction, null);

  return (
    <form action={formAction} noValidate className="flex flex-col gap-4">
      <input type="hidden" name="redirectTo" value={redirectTo ?? ""} />

      <FormBanner state={state} />

      <FormField name="email" label="Email" state={state} required>
        <Input type="email" placeholder="you@example.com" />
      </FormField>

      <FormField name="password" label="Password" state={state} required>
        <Input type="password" placeholder="Your password" />
      </FormField>

      <SubmitButton pendingText="Signing in…" className="w-full">
        Sign In
      </SubmitButton>
    </form>
  );
}
