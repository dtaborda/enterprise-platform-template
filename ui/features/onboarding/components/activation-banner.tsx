"use client";

import { CheckCircle2 } from "lucide-react";

interface ActivationBannerProps {
  activatedAt: Date | null;
}

export function ActivationBanner({ activatedAt }: ActivationBannerProps) {
  if (!activatedAt) return null;

  return (
    <div
      role="status"
      aria-live="polite"
      className="flex items-start gap-3 rounded-xl bg-success/10 px-4 py-3"
    >
      <CheckCircle2 className="mt-0.5 size-5 shrink-0 text-success" aria-hidden="true" />
      <div className="flex flex-col gap-0.5">
        <p className="text-sm font-semibold text-success">Your workspace is ready</p>
        <p className="text-sm text-muted-foreground">
          You have completed the essential setup. Your workspace is now activated.
        </p>
      </div>
    </div>
  );
}
