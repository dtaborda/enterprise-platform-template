"use client";

import type { ActionResult, TenantMemberOutput } from "@enterprise/contracts";
import { Button } from "@enterprise/ui/components/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@enterprise/ui/components/dialog";
import { FormBanner } from "@enterprise/ui/components/form-banner";
import { FormMessage } from "@enterprise/ui/components/form-message";
import { Label } from "@enterprise/ui/components/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@enterprise/ui/components/select";
import { SubmitButton } from "@enterprise/ui/components/submit-button";
import { useRouter } from "next/navigation";
import { useActionState, useState } from "react";
import { changeMemberRoleAction } from "@/features/tenant-team-management/actions";

interface ChangeRoleDialogProps {
  memberId: string;
  currentRole: "admin" | "member" | "guest";
  memberName: string;
}

const ASSIGNABLE_ROLES = [
  { value: "admin", label: "Admin" },
  { value: "member", label: "Member" },
  { value: "guest", label: "Guest" },
] as const;

export function ChangeRoleDialog({ memberId, currentRole, memberName }: ChangeRoleDialogProps) {
  const router = useRouter();
  const [open, setOpen] = useState(false);

  async function boundAction(
    _prevState: ActionResult<TenantMemberOutput> | null,
    formData: FormData,
  ): Promise<ActionResult<TenantMemberOutput>> {
    const result = await changeMemberRoleAction({
      userId: memberId,
      role: formData.get("role") ?? undefined,
    });

    if (result.success) {
      setOpen(false);
      router.refresh();
    }

    return result;
  }

  const [state, formAction] = useActionState(boundAction, null);

  const roleError =
    state && !state.success && state.error?.details
      ? (state.error.details as Record<string, string[]>)["role"]?.[0]
      : undefined;

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm" data-testid="change-role-button">
          Change Role
        </Button>
      </DialogTrigger>

      <DialogContent>
        <DialogHeader>
          <DialogTitle>Change Role</DialogTitle>
          <DialogDescription>
            Change the role for <strong>{memberName}</strong>.
          </DialogDescription>
        </DialogHeader>

        <form action={formAction} noValidate className="flex flex-col gap-4">
          <FormBanner state={state} />

          <div className="flex flex-col gap-1.5">
            <Label htmlFor="role">New Role</Label>
            <Select name="role" defaultValue={currentRole}>
              <SelectTrigger id="role" data-testid="change-role-select">
                <SelectValue placeholder="Select role" />
              </SelectTrigger>
              <SelectContent>
                {ASSIGNABLE_ROLES.map(({ value, label }) => (
                  <SelectItem key={value} value={value}>
                    {label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {roleError && <FormMessage>{roleError}</FormMessage>}
          </div>

          <SubmitButton data-testid="change-role-submit" pendingText="Updating…">
            Update Role
          </SubmitButton>
        </form>
      </DialogContent>
    </Dialog>
  );
}
