"use client";

import { Button } from "@enterprise/ui/components/button";
import { useState, useTransition } from "react";
import { resendInvitationAction } from "@/features/tenant-team-management/actions";

interface ResendInvitationButtonProps {
  invitationId: string;
}

export function ResendInvitationButton({ invitationId }: ResendInvitationButtonProps) {
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  function handleResend() {
    setError(null);
    setSuccess(false);

    startTransition(async () => {
      const result = await resendInvitationAction({ invitationId });

      if (!result.success) {
        setError(result.error?.message ?? "Failed to resend invitation. Please try again.");
        return;
      }

      setSuccess(true);
    });
  }

  return (
    <div className="flex flex-col gap-1">
      <Button
        variant="outline"
        size="sm"
        disabled={isPending}
        onClick={handleResend}
        data-testid="resend-invitation-button"
      >
        {isPending ? "Sending…" : success ? "Resent!" : "Resend"}
      </Button>
      {error && <p className="text-xs text-destructive">{error}</p>}
    </div>
  );
}
