"use client";

import { Button } from "@enterprise/ui/components/button";
import { Database, Loader2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { seedSampleDataAction } from "@/features/onboarding/actions";

interface SampleDataStepProps {
  onSuccess?: () => void;
}

export function SampleDataStep({ onSuccess }: SampleDataStepProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  function handleLoad() {
    setErrorMessage(null);
    startTransition(async () => {
      const result = await seedSampleDataAction();

      if (result.success) {
        router.refresh();
        onSuccess?.();
      } else {
        setErrorMessage(result.error?.message ?? "Sample data could not be loaded. Try again.");
      }
    });
  }

  return (
    <div className="flex flex-col gap-3">
      <Button
        variant="outline"
        size="sm"
        onClick={handleLoad}
        disabled={isPending}
        data-testid="load-sample-data-button"
      >
        {isPending ? (
          <>
            <Loader2 className="size-4 animate-spin" aria-hidden="true" />
            Loading…
          </>
        ) : (
          <>
            <Database className="size-4" aria-hidden="true" />
            Load sample data
          </>
        )}
      </Button>

      {errorMessage && (
        <p role="alert" className="text-sm text-destructive">
          {errorMessage}
        </p>
      )}
    </div>
  );
}
