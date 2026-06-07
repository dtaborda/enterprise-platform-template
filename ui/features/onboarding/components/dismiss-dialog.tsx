"use client";

import { Button } from "@enterprise/ui/components/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@enterprise/ui/components/dialog";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { dismissChecklistAction } from "@/features/onboarding/actions";
import { ROUTES } from "@/lib/routes";

export function DismissDialog() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [isPending, startTransition] = useTransition();

  function handleConfirm() {
    startTransition(async () => {
      const result = await dismissChecklistAction();
      if (result.success) {
        setOpen(false);
        // Navigate to dashboard — the chip in the sidebar serves as re-entry
        router.push(ROUTES.dashboard);
      }
    });
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="ghost" size="sm" className="text-muted-foreground">
          Dismiss checklist
        </Button>
      </DialogTrigger>

      <DialogContent>
        <DialogHeader>
          <DialogTitle>Hide this checklist?</DialogTitle>
          <DialogDescription>
            You can reopen it at any time from the sidebar. Your progress will be saved.
          </DialogDescription>
        </DialogHeader>

        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)} disabled={isPending}>
            Cancel
          </Button>
          <Button
            variant="default"
            onClick={handleConfirm}
            disabled={isPending}
            data-testid="dismiss-confirm-button"
          >
            {isPending ? "Hiding…" : "Hide checklist"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
