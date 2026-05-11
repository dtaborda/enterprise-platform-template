"use client";

import { Button } from "@enterprise/ui/components/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@enterprise/ui/components/card";
import { ImageIcon, Loader2Icon, Trash2Icon, UploadIcon } from "lucide-react";
import Image from "next/image";
import { useRef, useState } from "react";
import {
  removeWorkspaceLogoAction,
  uploadWorkspaceLogoAction,
} from "@/features/workspace-admin/actions";
import type { WorkspaceSettings } from "@/features/workspace-admin/types";

interface LogoUploadProps {
  settings: WorkspaceSettings;
}

const ACCEPTED_TYPES = ["image/png", "image/jpeg", "image/webp"] as const;
const MAX_FILE_SIZE = 2 * 1024 * 1024; // 2 MB

export function LogoUpload({ settings }: LogoUploadProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(settings.logoUrl);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [isRemoving, setIsRemoving] = useState(false);

  async function handleFileChange(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) return;

    setUploadError(null);

    // Client-side validation: MIME type
    if (!ACCEPTED_TYPES.includes(file.type as (typeof ACCEPTED_TYPES)[number])) {
      setUploadError("Only PNG, JPG, and WebP images are supported.");
      event.target.value = "";
      return;
    }

    // Client-side validation: size
    if (file.size > MAX_FILE_SIZE) {
      setUploadError("Logo must be under 2 MB.");
      event.target.value = "";
      return;
    }

    // Optimistic preview
    const objectUrl = URL.createObjectURL(file);
    setPreviewUrl(objectUrl);

    const formData = new FormData();
    formData.append("file", file);

    setIsUploading(true);
    try {
      const result = await uploadWorkspaceLogoAction(formData);

      if (!result.success) {
        setUploadError(result.error?.message ?? "Upload failed");
        setPreviewUrl(settings.logoUrl); // revert on failure
      } else {
        setPreviewUrl(result.data?.logoUrl ?? settings.logoUrl);
      }
    } finally {
      setIsUploading(false);
      URL.revokeObjectURL(objectUrl);
      event.target.value = "";
    }
  }

  async function handleRemove() {
    setIsRemoving(true);
    try {
      const result = await removeWorkspaceLogoAction();
      if (result.success) {
        setPreviewUrl(null);
      }
    } finally {
      setIsRemoving(false);
    }
  }

  const initials = settings.name
    .split(" ")
    .slice(0, 2)
    .map((w) => w[0] ?? "")
    .join("")
    .toUpperCase();

  return (
    <Card>
      <CardHeader>
        <CardTitle>Workspace Logo</CardTitle>
        <CardDescription>
          Upload a logo for your workspace. PNG, JPG, or WebP. Max 2 MB.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="flex items-start gap-6">
          {/* Logo preview */}
          <div className="flex size-20 shrink-0 items-center justify-center overflow-hidden rounded-lg border bg-muted">
            {previewUrl ? (
              <Image
                src={previewUrl}
                alt="Workspace logo"
                width={80}
                height={80}
                className="size-full object-cover"
                unoptimized
              />
            ) : (
              <span className="text-lg font-semibold text-muted-foreground" aria-hidden="true">
                {initials || <ImageIcon className="size-8" />}
              </span>
            )}
          </div>

          <div className="flex flex-col gap-3">
            {/* Upload button */}
            <div className="flex gap-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                disabled={isUploading || isRemoving}
                onClick={() => fileInputRef.current?.click()}
                data-testid="upload-logo-button"
              >
                {isUploading ? (
                  <>
                    <Loader2Icon className="size-4 animate-spin" />
                    Uploading…
                  </>
                ) : (
                  <>
                    <UploadIcon className="size-4" />
                    Upload logo
                  </>
                )}
              </Button>

              {previewUrl && (
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  disabled={isUploading || isRemoving}
                  onClick={handleRemove}
                  data-testid="remove-logo-button"
                >
                  {isRemoving ? (
                    <Loader2Icon className="size-4 animate-spin" />
                  ) : (
                    <Trash2Icon className="size-4" />
                  )}
                  <span className="sr-only">Remove logo</span>
                </Button>
              )}
            </div>

            {uploadError && (
              <p role="alert" className="text-sm text-destructive">
                {uploadError}
              </p>
            )}
          </div>
        </div>

        {/* Hidden file input */}
        <input
          ref={fileInputRef}
          type="file"
          accept="image/png,image/jpeg,image/webp"
          className="sr-only"
          aria-label="Upload workspace logo"
          onChange={handleFileChange}
          data-testid="logo-file-input"
        />
      </CardContent>
    </Card>
  );
}
