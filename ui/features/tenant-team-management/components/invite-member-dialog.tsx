"use client";

import type { ActionResult, TenantInvitationOutput } from "@enterprise/contracts";
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
import { FormField } from "@enterprise/ui/components/form-field";
import { FormMessage } from "@enterprise/ui/components/form-message";
import { Input } from "@enterprise/ui/components/input";
import { Label } from "@enterprise/ui/components/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@enterprise/ui/components/select";
import { SubmitButton } from "@enterprise/ui/components/submit-button";
import { UserPlus } from "lucide-react";
import { useRouter } from "next/navigation";
import { useActionState, useState } from "react";
import { inviteMemberAction } from "@/features/tenant-team-management/actions";

const ASSIGNABLE_ROLES = [
  { value: "admin", label: "Admin" },
  { value: "member", label: "Member" },
  { value: "guest", label: "Guest" },
] as const;

export function InviteMemberDialog() {
  const router = useRouter();
  const [open, setOpen] = useState(false);

  async function boundAction(
    _prevState: ActionResult<TenantInvitationOutput> | null,
    formData: FormData,
  ): Promise<ActionResult<TenantInvitationOutput>> {
    const result = await inviteMemberAction({
      email: formData.get("email") ?? undefined,
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
        <Button data-testid="invite-member-button">
          <UserPlus className="size-4" />
          Invite Member
        </Button>
      </DialogTrigger>

      <DialogContent>
        <DialogHeader>
          <DialogTitle>Invite Team Member</DialogTitle>
          <DialogDescription>
            Send an invitation email to add a new member to your team.
          </DialogDescription>
        </DialogHeader>

        <form action={formAction} noValidate className="flex flex-col gap-4">
          <FormBanner state={state} successMessage="Invitation sent successfully." />

          <FormField name="email" label="Email address" state={state} required>
            <Input
              type="email"
              placeholder="colleague@example.com"
              data-testid="invite-email-input"
            />
          </FormField>

          <div className="flex flex-col gap-1.5">
            <Label htmlFor="role">
              Role <span className="text-destructive">*</span>
            </Label>
            <Select name="role" defaultValue="member">
              <SelectTrigger id="role" data-testid="invite-role-select">
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

          <SubmitButton data-testid="invite-submit-button" pendingText="Sending…">
            Send Invitation
          </SubmitButton>
        </form>
      </DialogContent>
    </Dialog>
  );
}
