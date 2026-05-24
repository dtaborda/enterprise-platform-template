import { cn } from "@enterprise/ui/lib/utils";

interface ErrorStateProps {
  title?: string;
  message?: string;
  onReset?: () => void;
  className?: string;
}

function ErrorState({
  title = "Something went wrong",
  message = "An unexpected error occurred. Please try again.",
  onReset,
  className,
}: ErrorStateProps) {
  return (
    <div
      data-slot="error-state"
      className={cn(
        "flex flex-col items-center justify-center gap-4 rounded-xl py-16 text-center",
        className,
      )}
    >
      <div
        data-slot="error-state-icon"
        className="flex size-12 items-center justify-center rounded-full bg-destructive/10"
      >
        <svg
          xmlns="http://www.w3.org/2000/svg"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          className="size-6 text-destructive"
          aria-hidden="true"
        >
          <circle cx="12" cy="12" r="10" />
          <line x1="12" y1="8" x2="12" y2="12" />
          <line x1="12" y1="16" x2="12.01" y2="16" />
        </svg>
      </div>
      <div className="flex flex-col gap-1">
        <p data-slot="error-state-title" className="text-sm font-semibold text-foreground">
          {title}
        </p>
        <p data-slot="error-state-message" className="text-sm text-muted-foreground">
          {message}
        </p>
      </div>
      {onReset && (
        <button
          data-slot="error-state-reset"
          type="button"
          onClick={onReset}
          className="mt-2 text-sm font-medium text-primary underline-offset-4 hover:underline"
        >
          Try again
        </button>
      )}
    </div>
  );
}

export type { ErrorStateProps };
export { ErrorState };
