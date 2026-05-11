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
import { FormField } from "@enterprise/ui/components/form-field";
import { Input } from "@enterprise/ui/components/input";
import { SubmitButton } from "@enterprise/ui/components/submit-button";
import { useActionState, useState } from "react";
import {
  updateWorkspaceProfileAction,
  updateWorkspaceSlugAction,
} from "@/features/workspace-admin/actions";
import type { WorkspaceSettings } from "@/features/workspace-admin/types";
import { SlugChangeDialog } from "./slug-change-dialog";

interface ProfileFormProps {
  settings: WorkspaceSettings;
  role: string;
}

export function ProfileForm({ settings, role }: ProfileFormProps) {
  const [slugDialogOpen, setSlugDialogOpen] = useState(false);
  const [pendingSlug, setPendingSlug] = useState<string>("");

  const [profileState, profileFormAction] = useActionState(
    async (
      _prev: ActionResult<{ name: string }> | null,
      formData: FormData,
    ): Promise<ActionResult<{ name: string }>> => {
      return updateWorkspaceProfileAction({
        name: formData.get("name") ?? undefined,
      });
    },
    null,
  );

  const [slugState, setSlugState] = useState<ActionResult<{ slug: string }> | null>(null);
  const [slugPending, setSlugPending] = useState(false);

  async function handleProfileSubmit(formData: FormData) {
    const newSlug = (formData.get("slug") as string | null) ?? "";

    // If owner and slug changed, show confirmation dialog
    if (role === "owner" && newSlug && newSlug !== settings.slug) {
      setPendingSlug(newSlug);
      setSlugDialogOpen(true);
      return;
    }

    // No slug change — just update profile name
    await profileFormAction(formData);
  }

  async function handleSlugConfirm() {
    setSlugDialogOpen(false);
    setSlugPending(true);

    try {
      const result = await updateWorkspaceSlugAction({ slug: pendingSlug });
      setSlugState(result);
    } finally {
      setSlugPending(false);
    }
  }

  function handleSlugCancel() {
    setSlugDialogOpen(false);
    setPendingSlug("");
  }

  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle>Workspace Profile</CardTitle>
          <CardDescription>Update your workspace name and URL slug.</CardDescription>
        </CardHeader>
        <CardContent>
          <form action={handleProfileSubmit} noValidate className="flex flex-col gap-4">
            <FormBanner state={profileState} successMessage="Profile updated successfully." />
            {slugState && !slugPending && (
              <FormBanner state={slugState} successMessage="Slug updated successfully." />
            )}

            <FormField name="name" label="Workspace name" state={profileState} required>
              <Input
                defaultValue={settings.name}
                placeholder="My Workspace"
                data-testid="workspace-name-input"
              />
            </FormField>

            {role === "owner" && (
              <FormField
                name="slug"
                label="Workspace slug"
                state={slugState}
                description="Used in workspace URLs. Must be lowercase letters, numbers, and hyphens only."
              >
                <Input
                  defaultValue={settings.slug}
                  placeholder="my-workspace"
                  data-testid="workspace-slug-input"
                />
              </FormField>
            )}

            <div className="flex justify-end">
              <SubmitButton data-testid="save-profile-button">Save profile changes</SubmitButton>
            </div>
          </form>

          {/* Standalone slug pending state */}
          {slugPending && (
            <div className="mt-4 flex items-center gap-2 text-sm text-muted-foreground">
              <div className="size-4 animate-spin rounded-full border-2 border-primary border-t-transparent" />
              Updating slug…
            </div>
          )}
        </CardContent>
      </Card>

      {role === "owner" && (
        <SlugChangeDialog
          currentSlug={settings.slug}
          newSlug={pendingSlug}
          open={slugDialogOpen}
          onConfirm={handleSlugConfirm}
          onCancel={handleSlugCancel}
        />
      )}
    </>
  );
}
