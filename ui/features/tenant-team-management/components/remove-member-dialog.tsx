"use client";

import { Button } from "@enterprise/ui/components/button";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@enterprise/ui/components/dialog";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { removeMemberAction } from "@/features/tenant-team-management/actions";

interface RemoveMemberDialogProps {
  memberId: string;
  memberName: string;
}

export function RemoveMemberDialog({ memberId, memberName }: RemoveMemberDialogProps) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function handleConfirm() {
    setError(null);

    startTransition(async () => {
      const result = await removeMemberAction({ userId: memberId });

      if (!result.success) {
        setError(result.error?.message ?? "Failed to remove member. Please try again.");
        return;
      }

      setOpen(false);
      router.refresh();
    });
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="destructive" size="sm" data-testid="remove-member-button">
          Remove
        </Button>
      </DialogTrigger>

      <DialogContent>
        <DialogHeader>
          <DialogTitle>Remove Member</DialogTitle>
          <DialogDescription>
            Are you sure you want to remove <strong>{memberName}</strong> from the team? This action
            cannot be undone.
          </DialogDescription>
        </DialogHeader>

        {error && (
          <p className="rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive">{error}</p>
        )}

        <DialogFooter>
          <DialogClose asChild>
            <Button variant="outline" disabled={isPending}>
              Cancel
            </Button>
          </DialogClose>
          <Button
            variant="destructive"
            disabled={isPending}
            onClick={handleConfirm}
            data-testid="confirm-remove-member-button"
          >
            {isPending ? "Removing…" : "Remove Member"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
