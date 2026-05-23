import { cn } from "@enterprise/ui/lib/utils";
import type * as React from "react";

interface PageHeaderProps {
  title: string;
  subtitle?: string;
  action?: React.ReactNode;
  className?: string;
}

function PageHeader({ title, subtitle, action, className }: PageHeaderProps) {
  return (
    <div
      data-slot="page-header"
      className={cn("flex items-start justify-between gap-4", className)}
    >
      <div className="flex flex-col gap-1">
        <h1 data-slot="page-header-title" className="text-2xl font-semibold tracking-tight">
          {title}
        </h1>
        {subtitle && (
          <p data-slot="page-header-subtitle" className="text-sm text-muted-foreground">
            {subtitle}
          </p>
        )}
      </div>
      {action && (
        <div data-slot="page-header-action" className="shrink-0">
          {action}
        </div>
      )}
    </div>
  );
}

export type { PageHeaderProps };
export { PageHeader };
