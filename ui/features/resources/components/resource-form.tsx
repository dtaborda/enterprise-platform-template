"use client";

import type {
  ActionResult,
  ResourceEntity,
  ResourceStatus,
  ResourceType,
} from "@enterprise/contracts";
import { getFieldError, RESOURCE_STATUS, RESOURCE_TYPE } from "@enterprise/contracts";
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
import { Textarea } from "@enterprise/ui/components/textarea";
import { useActionState } from "react";
import { createResourceAction, updateResourceAction } from "@/features/resources/actions";

interface ResourceFormProps {
  defaultValues?: Partial<ResourceEntity>;
}

const RESOURCE_TYPE_LABELS: Record<ResourceType, string> = {
  product: "Product",
  service: "Service",
  asset: "Asset",
  document: "Document",
  other: "Other",
};

const RESOURCE_STATUS_LABELS: Record<ResourceStatus, string> = {
  active: "Active",
  draft: "Draft",
  archived: "Archived",
  suspended: "Suspended",
};

function parseJsonString(value: string | null): Record<string, unknown> | undefined {
  if (!value) return undefined;

  try {
    const parsed: unknown = JSON.parse(value);
    if (parsed && typeof parsed === "object" && !Array.isArray(parsed)) {
      return parsed as Record<string, unknown>;
    }
  } catch {
    return undefined;
  }

  return undefined;
}

export function ResourceForm({ defaultValues }: ResourceFormProps) {
  const isEdit = Boolean(defaultValues?.id);

  async function boundAction(
    _prevState: ActionResult<ResourceEntity> | null,
    formData: FormData,
  ): Promise<ActionResult<ResourceEntity>> {
    const imageUrlsRaw = (formData.get("imageUrlsText") as string | null) ?? "";
    const imageUrlsList = imageUrlsRaw
      .split(",")
      .map((entry) => entry.trim())
      .filter(Boolean);

    const metadataText = (formData.get("metadataText") as string | null) ?? "";
    const parsedMetadata = parseJsonString(metadataText.trim() || null);

    const input: Record<string, unknown> = {
      title: formData.get("title") ?? undefined,
      type: formData.get("type") ?? undefined,
      status: formData.get("status") ?? undefined,
      description: formData.get("description") ?? undefined,
      metadata: parsedMetadata,
      imageUrls: imageUrlsList.length > 0 ? imageUrlsList : undefined,
    };

    if (isEdit && defaultValues?.id) {
      return updateResourceAction(defaultValues.id, input);
    }

    return createResourceAction(input);
  }

  const [state, formAction] = useActionState(boundAction, null);

  const existingImageUrlsText = (() => {
    if (!defaultValues?.imageUrls) return "";
    try {
      const parsed: unknown = JSON.parse(defaultValues.imageUrls);
      if (Array.isArray(parsed)) return parsed.join(", ");
    } catch {
      return defaultValues.imageUrls;
    }
    return defaultValues.imageUrls;
  })();

  const existingMetadataText = (() => {
    if (!defaultValues?.metadata) return "";
    try {
      const parsed: unknown = JSON.parse(defaultValues.metadata);
      return JSON.stringify(parsed, null, 2);
    } catch {
      return defaultValues.metadata;
    }
  })();

  // Select fields cannot use FormField's cloneElement injection because the
  // Select primitive wraps the trigger in its own context — aria attributes
  // must be passed directly to SelectTrigger instead.
  const typeError = getFieldError(state, "type");
  const statusError = getFieldError(state, "status");

  return (
    <form action={formAction} noValidate className="flex flex-col gap-6">
      <FormBanner
        state={state}
        successMessage={isEdit ? undefined : "Resource created successfully."}
      />

      <div className="grid gap-4 sm:grid-cols-2">
        <FormField name="title" label="Title" state={state} required className="sm:col-span-2">
          <Input defaultValue={defaultValues?.title ?? ""} placeholder="Resource title" />
        </FormField>

        {/* Select fields: aria-invalid injected directly on SelectTrigger (cloneElement cannot pierce Select's context) */}
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="type">
            Type <span className="text-destructive">*</span>
          </Label>
          <Select name="type" defaultValue={defaultValues?.type ?? RESOURCE_TYPE.PRODUCT} required>
            <SelectTrigger id="type" aria-invalid={Boolean(typeError) || undefined}>
              <SelectValue placeholder="Select type" />
            </SelectTrigger>
            <SelectContent>
              {Object.entries(RESOURCE_TYPE).map(([, value]) => (
                <SelectItem key={value} value={value}>
                  {RESOURCE_TYPE_LABELS[value]}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          {typeError && <FormMessage>{typeError}</FormMessage>}
        </div>

        <div className="flex flex-col gap-1.5">
          <Label htmlFor="status">
            Status <span className="text-destructive">*</span>
          </Label>
          <Select
            name="status"
            defaultValue={defaultValues?.status ?? RESOURCE_STATUS.ACTIVE}
            required
          >
            <SelectTrigger id="status" aria-invalid={Boolean(statusError) || undefined}>
              <SelectValue placeholder="Select status" />
            </SelectTrigger>
            <SelectContent>
              {Object.entries(RESOURCE_STATUS).map(([, value]) => (
                <SelectItem key={value} value={value}>
                  {RESOURCE_STATUS_LABELS[value]}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          {statusError && <FormMessage>{statusError}</FormMessage>}
        </div>

        <FormField name="description" label="Description" state={state} className="sm:col-span-2">
          <Textarea
            defaultValue={defaultValues?.description ?? ""}
            placeholder="Resource description"
            rows={4}
          />
        </FormField>

        <FormField
          name="metadataText"
          label="Metadata (JSON)"
          state={state}
          description="Use a valid JSON object."
          className="sm:col-span-2"
        >
          <Textarea
            defaultValue={existingMetadataText}
            placeholder='{"owner":"operations","tags":["internal"]}'
            rows={5}
          />
        </FormField>

        <FormField
          name="imageUrlsText"
          label="Image URLs"
          state={state}
          description="Separate multiple URLs with commas."
          className="sm:col-span-2"
        >
          <Textarea
            defaultValue={existingImageUrlsText}
            placeholder="Comma-separated image URLs"
            rows={2}
          />
        </FormField>
      </div>

      <div className="flex justify-end gap-3">
        <SubmitButton pendingText="Saving…">
          {isEdit ? "Update Resource" : "Create Resource"}
        </SubmitButton>
      </div>
    </form>
  );
}
