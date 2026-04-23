"use client";

import type {
  ActionResult,
  ResourceEntity,
  ResourceStatus,
  ResourceType,
} from "@enterprise/contracts";
import { RESOURCE_STATUS, RESOURCE_TYPE } from "@enterprise/contracts";
import { Button } from "@enterprise/ui/components/button";
import { Input } from "@enterprise/ui/components/input";
import { Label } from "@enterprise/ui/components/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@enterprise/ui/components/select";
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

function getFieldError(
  result: ActionResult<ResourceEntity> | null,
  field: string,
): string | undefined {
  if (!result || result.success) return undefined;
  const details = result.error?.details as Record<string, string[]> | undefined;
  return details?.[field]?.[0];
}

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

  const [state, formAction, isPending] = useActionState(boundAction, null);

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

  return (
    <form action={formAction} className="flex flex-col gap-6">
      {state && !state.success && !state.error?.details && (
        <p className="rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive">
          {state.error?.message ?? "An error occurred. Please try again."}
        </p>
      )}

      {state?.success && !isEdit && (
        <p className="rounded-md bg-green-100 px-3 py-2 text-sm text-green-800">
          Resource created successfully.
        </p>
      )}

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="flex flex-col gap-1.5 sm:col-span-2">
          <Label htmlFor="title">
            Title <span className="text-destructive">*</span>
          </Label>
          <Input
            id="title"
            name="title"
            required
            defaultValue={defaultValues?.title ?? ""}
            placeholder="Resource title"
          />
          {getFieldError(state, "title") && (
            <p className="text-xs text-destructive">{getFieldError(state, "title")}</p>
          )}
        </div>

        <div className="flex flex-col gap-1.5">
          <Label htmlFor="type">
            Type <span className="text-destructive">*</span>
          </Label>
          <Select name="type" defaultValue={defaultValues?.type ?? RESOURCE_TYPE.PRODUCT} required>
            <SelectTrigger id="type">
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
          {getFieldError(state, "type") && (
            <p className="text-xs text-destructive">{getFieldError(state, "type")}</p>
          )}
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
            <SelectTrigger id="status">
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
          {getFieldError(state, "status") && (
            <p className="text-xs text-destructive">{getFieldError(state, "status")}</p>
          )}
        </div>

        <div className="flex flex-col gap-1.5 sm:col-span-2">
          <Label htmlFor="description">Description</Label>
          <Textarea
            id="description"
            name="description"
            defaultValue={defaultValues?.description ?? ""}
            placeholder="Resource description"
            rows={4}
          />
          {getFieldError(state, "description") && (
            <p className="text-xs text-destructive">{getFieldError(state, "description")}</p>
          )}
        </div>

        <div className="flex flex-col gap-1.5 sm:col-span-2">
          <Label htmlFor="metadataText">Metadata (JSON)</Label>
          <Textarea
            id="metadataText"
            name="metadataText"
            defaultValue={existingMetadataText}
            placeholder='{"owner":"operations","tags":["internal"]}'
            rows={5}
          />
          <p className="text-xs text-muted-foreground">Use a valid JSON object.</p>
          {getFieldError(state, "metadata") && (
            <p className="text-xs text-destructive">{getFieldError(state, "metadata")}</p>
          )}
        </div>

        <div className="flex flex-col gap-1.5 sm:col-span-2">
          <Label htmlFor="imageUrlsText">Image URLs</Label>
          <Textarea
            id="imageUrlsText"
            name="imageUrlsText"
            defaultValue={existingImageUrlsText}
            placeholder="Comma-separated image URLs"
            rows={2}
          />
          <p className="text-xs text-muted-foreground">Separate multiple URLs with commas.</p>
          {getFieldError(state, "imageUrls") && (
            <p className="text-xs text-destructive">{getFieldError(state, "imageUrls")}</p>
          )}
        </div>
      </div>

      <div className="flex justify-end gap-3">
        <Button type="submit" disabled={isPending}>
          {isPending ? "Saving…" : isEdit ? "Update Resource" : "Create Resource"}
        </Button>
      </div>
    </form>
  );
}
