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
import { TriangleAlertIcon } from "lucide-react";

interface SlugChangeDialogProps {
  currentSlug: string;
  newSlug: string;
  open: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}

export function SlugChangeDialog({
  currentSlug,
  newSlug,
  open,
  onConfirm,
  onCancel,
}: SlugChangeDialogProps) {
  return (
    <Dialog
      open={open}
      onOpenChange={(isOpen) => {
        if (!isOpen) onCancel();
      }}
    >
      <DialogContent showCloseButton={false}>
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <TriangleAlertIcon className="size-5 text-amber-500" />
            Change workspace slug?
          </DialogTitle>
          <DialogDescription>
            Changing the slug will update all workspace URLs. External links and bookmarks will
            break.
          </DialogDescription>
        </DialogHeader>

        <div className="rounded-md border border-amber-200 bg-amber-50 px-4 py-3 text-sm dark:border-amber-800 dark:bg-amber-950">
          <p className="text-muted-foreground">
            Current slug:{" "}
            <span className="font-mono font-medium text-foreground">{currentSlug}</span>
          </p>
          <p className="mt-1 text-muted-foreground">
            New slug: <span className="font-mono font-medium text-foreground">{newSlug}</span>
          </p>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onCancel} data-testid="slug-dialog-cancel">
            Cancel
          </Button>
          <Button variant="destructive" onClick={onConfirm} data-testid="slug-dialog-confirm">
            Confirm change
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
