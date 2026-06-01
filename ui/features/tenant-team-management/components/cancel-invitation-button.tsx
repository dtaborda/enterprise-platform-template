"use client";

import { Button } from "@enterprise/ui/components/button";
import { useRouter } from "next/navigation";
import { useEffect, useState, useTransition } from "react";
import { cancelInvitationAction } from "@/features/tenant-team-management/actions";

interface CancelInvitationButtonProps {
  invitationId: string;
}

export function CancelInvitationButton({ invitationId }: CancelInvitationButtonProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  // Trigger router.refresh() OUTSIDE the transition so isPending reflects only the
  // Server Action, not the subsequent RSC re-render. In React 19 + Next.js 15, calling
  // router.refresh() inside an async startTransition keeps isPending=true until the RSC
  // navigation settles — this causes the button to appear stuck on "Cancelling…".
  useEffect(() => {
    if (success) {
      router.refresh();
    }
  }, [success, router]);

  function handleCancel() {
    setError(null);
    setSuccess(false);

    startTransition(async () => {
      const result = await cancelInvitationAction({ invitationId });

      if (!result.success) {
        setError(result.error?.message ?? "Failed to cancel invitation. Please try again.");
        return;
      }

      setSuccess(true);
      // router.refresh() is fired via the useEffect above once isPending clears.
    });
  }

  return (
    <div className="flex flex-col gap-1">
      <Button
        variant="destructive"
        size="sm"
        disabled={isPending}
        onClick={handleCancel}
        data-testid="cancel-invitation-button"
      >
        {isPending ? "Cancelling…" : "Cancel"}
      </Button>
      {error && <p className="text-xs text-destructive">{error}</p>}
    </div>
  );
}
