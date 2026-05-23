import { cn } from "@enterprise/ui/lib/utils";
import { Skeleton } from "./skeleton";

interface CardSkeletonProps {
  className?: string;
}

function CardSkeleton({ className }: CardSkeletonProps) {
  return (
    <div
      data-slot="card-skeleton"
      className={cn("flex flex-col gap-6 rounded-xl bg-card py-6 shadow-sm", className)}
    >
      {/* Header area */}
      <div className="flex items-start justify-between gap-4 px-6">
        <div className="flex flex-col gap-2 flex-1">
          <Skeleton className="h-5 w-2/3" />
          <Skeleton className="h-4 w-1/2" />
        </div>
        <Skeleton className="size-8 shrink-0 rounded-md" />
      </div>
      {/* Content area */}
      <div className="flex flex-col gap-3 px-6">
        <Skeleton className="h-4 w-full" />
        <Skeleton className="h-4 w-full" />
        <Skeleton className="h-4 w-4/5" />
      </div>
      {/* Footer area */}
      <div className="flex items-center gap-3 px-6">
        <Skeleton className="h-9 w-24 rounded-md" />
        <Skeleton className="h-9 w-20 rounded-md" />
      </div>
    </div>
  );
}

export type { CardSkeletonProps };
export { CardSkeleton };
