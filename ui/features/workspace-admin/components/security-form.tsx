"use client";

import type { ActionResult } from "@enterprise/contracts";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@enterprise/ui/components/card";
import { FormBanner } from "@enterprise/ui/components/form-banner";
import { Label } from "@enterprise/ui/components/label";
import { SubmitButton } from "@enterprise/ui/components/submit-button";
import { Switch } from "@enterprise/ui/components/switch";
import { useActionState, useState } from "react";
import { updateWorkspaceSecurityAction } from "@/features/workspace-admin/actions";
import type { WorkspaceSettings } from "@/features/workspace-admin/types";

interface SecurityFormProps {
  settings: WorkspaceSettings;
}

export function SecurityForm({ settings }: SecurityFormProps) {
  const [allowAdminInvites, setAllowAdminInvites] = useState(settings.allowAdminInvites);

  const [state, formAction] = useActionState(
    async (
      _prev: ActionResult<{ allowAdminInvites: boolean }> | null,
      _formData: FormData,
    ): Promise<ActionResult<{ allowAdminInvites: boolean }>> => {
      return updateWorkspaceSecurityAction({ allowAdminInvites });
    },
    null,
  );

  return (
    <Card>
      <CardHeader>
        <CardTitle>Security Settings</CardTitle>
        <CardDescription>Control who can invite new members to your workspace.</CardDescription>
      </CardHeader>
      <CardContent>
        <form action={formAction} noValidate className="flex flex-col gap-4">
          <FormBanner state={state} successMessage="Security settings saved." />

          <div className="flex items-start justify-between gap-4 rounded-lg border p-4">
            <div className="flex flex-col gap-1">
              <Label htmlFor="allow-admin-invites" className="text-sm font-medium">
                Allow admin invitations
              </Label>
              <p className="text-sm text-muted-foreground">
                When off, only owners can send invitations.
              </p>
            </div>
            <Switch
              id="allow-admin-invites"
              checked={allowAdminInvites}
              onCheckedChange={setAllowAdminInvites}
              aria-label="Allow admin invitations"
              data-testid="allow-admin-invites-switch"
            />
          </div>

          <div className="flex justify-end">
            <SubmitButton data-testid="save-security-button">Save security changes</SubmitButton>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
