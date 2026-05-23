import { cn } from "@enterprise/ui/lib/utils";
import { Skeleton } from "./skeleton";

interface TableSkeletonProps {
  /** Number of rows to display. Defaults to 5. */
  rows?: number;
  /** Number of columns to display. Defaults to 4. */
  columns?: number;
  className?: string;
}

function TableSkeleton({ rows = 5, columns = 4, className }: TableSkeletonProps) {
  return (
    <div
      data-slot="table-skeleton"
      className={cn("w-full overflow-hidden rounded-xl bg-card shadow-sm", className)}
    >
      {/* Table header */}
      <div className="border-b border-border/50 px-6 py-3">
        <div className="flex items-center gap-4">
          {Array.from({ length: columns }).map((_, i) => (
            <Skeleton
              // biome-ignore lint/suspicious/noArrayIndexKey: static skeleton cells
              key={i}
              className={cn("h-4", i === 0 ? "w-1/4" : "flex-1")}
            />
          ))}
        </div>
      </div>
      {/* Table rows */}
      <div className="divide-y divide-border/30">
        {Array.from({ length: rows }).map((_, rowIndex) => (
          <div
            // biome-ignore lint/suspicious/noArrayIndexKey: static skeleton rows
            key={rowIndex}
            className="flex items-center gap-4 px-6 py-4"
          >
            {Array.from({ length: columns }).map((_, colIndex) => (
              <Skeleton
                // biome-ignore lint/suspicious/noArrayIndexKey: static skeleton cells
                key={colIndex}
                className={cn(
                  "h-4",
                  colIndex === 0 ? "w-1/4" : colIndex === columns - 1 ? "w-16" : "flex-1",
                )}
              />
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}

export type { TableSkeletonProps };
export { TableSkeleton };
