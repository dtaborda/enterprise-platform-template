"use client";

import { Button } from "@enterprise/ui/components/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@enterprise/ui/components/dialog";
import { useActionState, useEffect } from "react";
import { cancelSubscriptionAction } from "@/features/billing/actions";

interface CancelSubscriptionDialogProps {
  open: boolean;
  accessUntil: string;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
}

export function CancelSubscriptionDialog({
  open,
  accessUntil,
  onOpenChange,
  onSuccess,
}: CancelSubscriptionDialogProps) {
  const [state, formAction, isPending] = useActionState(cancelSubscriptionAction, null);

  const accessDate = new Date(accessUntil).toLocaleDateString(undefined, {
    year: "numeric",
    month: "long",
    day: "numeric",
  });

  useEffect(() => {
    if (state?.success) {
      onSuccess();
      onOpenChange(false);
    }
  }, [state, onSuccess, onOpenChange]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Cancel subscription?</DialogTitle>
          <DialogDescription>
            Your access continues until{" "}
            <span className="font-medium text-foreground">{accessDate}</span>. Cancel anyway?
          </DialogDescription>
        </DialogHeader>

        {state && !state.success && (
          <p className="text-sm text-destructive">{state.error?.message ?? "An error occurred"}</p>
        )}

        <DialogFooter>
          <Button
            type="button"
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={isPending}
          >
            Keep subscription
          </Button>
          <form action={formAction}>
            <input type="hidden" name="cancelAtPeriodEnd" value="true" />
            <Button type="submit" variant="destructive" disabled={isPending}>
              {isPending ? "Canceling…" : "Yes, cancel"}
            </Button>
          </form>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
