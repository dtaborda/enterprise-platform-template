"use client";

import type { ActionResult, ActivationResult } from "@enterprise/contracts";
import { completeBaselineStepSchema } from "@enterprise/contracts";
import { FormBanner } from "@enterprise/ui/components/form-banner";
import { FormField } from "@enterprise/ui/components/form-field";
import { Input } from "@enterprise/ui/components/input";
import { SubmitButton } from "@enterprise/ui/components/submit-button";
import { useFormValidation } from "@enterprise/ui/hooks/use-form-validation";
import { useRouter } from "next/navigation";
import { useActionState, useEffect } from "react";
import { completeBaselineStepAction } from "@/features/onboarding/actions";

interface BaselineSetupFormProps {
  defaultWorkspaceName?: string;
  defaultLocale?: string;
  onSuccess?: () => void;
}

// Module-level wrapper — stable reference, no re-creation on render
async function submitBaseline(
  _prevState: ActionResult<ActivationResult> | null,
  formData: FormData,
): Promise<ActionResult<ActivationResult>> {
  return completeBaselineStepAction({
    name: formData.get("name"),
    locale: formData.get("locale"),
  });
}

export function BaselineSetupForm({
  defaultWorkspaceName = "",
  defaultLocale = "en-US",
  onSuccess,
}: BaselineSetupFormProps) {
  const router = useRouter();

  // Client-side Zod validation wrapping the server action
  const validatedAction = useFormValidation({
    schema: completeBaselineStepSchema,
    serverAction: submitBaseline,
  });

  const [state, formAction] = useActionState(validatedAction, null);

  // Trigger router refresh when the server action reports success
  useEffect(() => {
    if (state?.success) {
      router.refresh();
      onSuccess?.();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state]);

  return (
    <form action={formAction} noValidate className="flex flex-col gap-4">
      <FormBanner state={state} />

      <FormField name="name" label="Workspace name" state={state} required>
        <Input
          placeholder="Acme Inc."
          defaultValue={defaultWorkspaceName}
          data-testid="baseline-name-input"
        />
      </FormField>

      <FormField
        name="locale"
        label="Locale"
        state={state}
        required
        description="BCP-47 language tag, e.g. en-US, pt-BR"
      >
        <Input
          placeholder="en-US"
          defaultValue={defaultLocale}
          data-testid="baseline-locale-input"
        />
      </FormField>

      <SubmitButton pendingText="Saving…" data-testid="baseline-submit-button">
        Save workspace settings
      </SubmitButton>
    </form>
  );
}
