import { cn } from "@enterprise/ui/lib/utils";
import type { LucideIcon } from "lucide-react";
import type * as React from "react";

interface EmptyStateProps {
  icon: LucideIcon;
  title: string;
  description: string;
  action?: React.ReactNode;
  className?: string;
}

function EmptyState({ icon: Icon, title, description, action, className }: EmptyStateProps) {
  return (
    <div
      data-slot="empty-state"
      className={cn(
        "flex flex-col items-center justify-center gap-4 rounded-xl py-16 text-center",
        className,
      )}
    >
      <div
        data-slot="empty-state-icon"
        className="flex size-12 items-center justify-center rounded-full bg-muted"
      >
        <Icon className="size-6 text-muted-foreground" aria-hidden="true" />
      </div>
      <div className="flex flex-col gap-1">
        <p data-slot="empty-state-title" className="text-sm font-semibold text-foreground">
          {title}
        </p>
        <p data-slot="empty-state-description" className="text-sm text-muted-foreground">
          {description}
        </p>
      </div>
      {action && (
        <div data-slot="empty-state-action" className="mt-2">
          {action}
        </div>
      )}
    </div>
  );
}

export type { EmptyStateProps };
export { EmptyState };
