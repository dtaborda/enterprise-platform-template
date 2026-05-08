"use client";

import { Button } from "@enterprise/ui/components/button";
import { useState, useTransition } from "react";
import { cancelInvitationAction } from "@/features/tenant-team-management/actions";

interface CancelInvitationButtonProps {
  invitationId: string;
}

export function CancelInvitationButton({ invitationId }: CancelInvitationButtonProps) {
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function handleCancel() {
    setError(null);

    startTransition(async () => {
      const result = await cancelInvitationAction({ invitationId });

      if (!result.success) {
        setError(result.error?.message ?? "Failed to cancel invitation. Please try again.");
      }
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
