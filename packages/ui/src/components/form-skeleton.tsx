import { cn } from "@enterprise/ui/lib/utils";
import { Skeleton } from "./skeleton";

interface FormSkeletonProps {
  /** Number of field rows to display. Defaults to 3. */
  fields?: number;
  className?: string;
}

function FormSkeleton({ fields = 3, className }: FormSkeletonProps) {
  return (
    <div data-slot="form-skeleton" className={cn("flex flex-col gap-6", className)}>
      {Array.from({ length: fields }).map((_, i) => (
        <div
          // biome-ignore lint/suspicious/noArrayIndexKey: static skeleton fields
          key={i}
          data-slot="form-skeleton-field"
          className="flex flex-col gap-2"
        >
          {/* Label */}
          <Skeleton className="h-4 w-24" />
          {/* Input */}
          <Skeleton className="h-9 w-full rounded-md" />
        </div>
      ))}
      {/* Submit button area */}
      <div className="flex justify-end gap-3">
        <Skeleton className="h-9 w-20 rounded-md" />
        <Skeleton className="h-9 w-24 rounded-md" />
      </div>
    </div>
  );
}

export type { FormSkeletonProps };
export { FormSkeleton };
