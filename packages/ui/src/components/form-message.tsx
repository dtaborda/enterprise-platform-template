import { cn } from "@enterprise/ui/lib/utils";
import type { ReactNode } from "react";

interface FormMessageProps {
  id?: string;
  children: ReactNode;
  className?: string;
}

export function FormMessage({ id, children, className }: FormMessageProps) {
  if (!children) return null;

  return (
    <p id={id} role="alert" className={cn("text-xs text-destructive", className)}>
      {children}
    </p>
  );
}
