"use client";

import { ErrorState } from "@enterprise/ui/components/error-state";
import * as Sentry from "@sentry/nextjs";
import { useEffect } from "react";

export default function OnboardingError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    Sentry.captureException(error, {
      tags: { area: "onboarding" },
    });
  }, [error]);

  return (
    <ErrorState
      message="An error occurred while loading your onboarding checklist. Please try again."
      onReset={reset}
    />
  );
}
