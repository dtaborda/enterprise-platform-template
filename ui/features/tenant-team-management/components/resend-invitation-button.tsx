"use client";

import { Button } from "@enterprise/ui/components/button";
import { useRouter } from "next/navigation";
import { useEffect, useState, useTransition } from "react";
import { resendInvitationAction } from "@/features/tenant-team-management/actions";

interface ResendInvitationButtonProps {
  invitationId: string;
}

export function ResendInvitationButton({ invitationId }: ResendInvitationButtonProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  // Trigger router.refresh() OUTSIDE the transition so isPending reflects only the
  // Server Action, not the subsequent RSC re-render. In React 19 + Next.js 15, calling
  // router.refresh() inside an async startTransition keeps isPending=true until the RSC
  // navigation settles — this causes the button to appear stuck on "Sending…".
  useEffect(() => {
    if (success) {
      router.refresh();
    }
  }, [success, router]);

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
      // router.refresh() is fired via the useEffect above once isPending clears.
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
