"use client";

import { cn } from "@enterprise/ui/lib/utils";
import { Rocket } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { ROUTES } from "@/lib/routes";

interface OnboardingLauncherChipProps {
  completedCount: number;
  totalSteps: number;
  className?: string;
}

export function OnboardingLauncherChip({
  completedCount,
  totalSteps,
  className,
}: OnboardingLauncherChipProps) {
  const pathname = usePathname();
  const isActive = pathname === ROUTES.onboarding;

  return (
    <Link
      href={ROUTES.onboarding}
      aria-label={`Workspace setup: ${completedCount} of ${totalSteps} steps complete`}
      data-testid="onboarding-launcher-chip"
      className={cn(
        "flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium transition-all",
        isActive
          ? "bg-primary/10 text-primary"
          : "text-muted-foreground hover:bg-accent hover:text-accent-foreground",
        className,
      )}
    >
      <Rocket className="size-4 shrink-0" aria-hidden="true" />
      <span>
        Setup{" "}
        <span className="text-xs font-normal">
          · {completedCount}/{totalSteps}
        </span>
      </span>
    </Link>
  );
}
