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
import { Trash2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { deleteResourceAction } from "@/features/resources/actions";

interface DeleteResourceButtonProps {
  id: string;
}

export function DeleteResourceButton({ id }: DeleteResourceButtonProps) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function handleConfirm() {
    setError(null);

    startTransition(async () => {
      const result = await deleteResourceAction(id);

      if (!result.success) {
        setError(result.error?.message ?? "Failed to archive resource. Please try again.");
        return;
      }

      setOpen(false);
      router.push("/dashboard/resources");
    });
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="destructive" size="sm">
          <Trash2 className="size-4" />
          Archive
        </Button>
      </DialogTrigger>

      <DialogContent>
        <DialogHeader>
          <DialogTitle>Archive Resource</DialogTitle>
          <DialogDescription>
            Are you sure you want to archive this resource? This action performs a soft delete by
            setting the resource status to archived.
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
          <Button variant="destructive" disabled={isPending} onClick={handleConfirm}>
            {isPending ? "Archiving…" : "Archive Resource"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
