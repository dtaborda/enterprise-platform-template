import { EmptyState } from "@enterprise/ui/components/empty-state";
import { Bell } from "lucide-react";

interface NotificationEmptyStateProps {
  hasFilter?: boolean;
}

export function NotificationEmptyState({ hasFilter = false }: NotificationEmptyStateProps) {
  if (hasFilter) {
    return (
      <EmptyState
        icon={Bell}
        title="You're all caught up"
        description="No notifications match the current filter."
      />
    );
  }

  return (
    <EmptyState
      icon={Bell}
      title="No notifications yet"
      description="We'll let you know when something happens."
    />
  );
}
