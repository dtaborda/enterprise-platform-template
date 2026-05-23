"use client";

import { ErrorState } from "@enterprise/ui/components/error-state";
import * as Sentry from "@sentry/nextjs";
import { useEffect } from "react";

export default function ResourcesError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    Sentry.captureException(error);
  }, [error]);

  return (
    <ErrorState
      message="An error occurred while loading resources. Please try again."
      onReset={reset}
    />
  );
}
