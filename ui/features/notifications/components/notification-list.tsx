"use client";

import { Button } from "@enterprise/ui/components/button";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { markAsReadAction } from "@/features/notifications/actions";
import type { NotificationDto } from "@/features/notifications/types";
import { NotificationEmptyState } from "./notification-empty-state";
import { NotificationItem } from "./notification-item";

const PAGE_SIZE = 20;

interface NotificationListProps {
  initialItems: NotificationDto[];
  hasFilter: boolean;
}

export function NotificationList({ initialItems, hasFilter }: NotificationListProps) {
  const router = useRouter();
  const [items, setItems] = useState(initialItems);
  const [offset, setOffset] = useState(0);
  const [markingId, setMarkingId] = useState<string | null>(null);

  // Sync client state when Server Component re-renders with new data
  // (e.g., after filter change via URL params or router.refresh)
  useEffect(() => {
    setItems(initialItems);
  }, [initialItems]);

  const hasPrev = offset > 0;
  const hasNext = items.length === PAGE_SIZE;

  async function handleMarkAsRead(notificationId: string) {
    setMarkingId(notificationId);
    try {
      await markAsReadAction({ notificationId });
      // Optimistically update the item in place
      setItems((prev) =>
        prev.map((n) =>
          n.id === notificationId ? { ...n, isRead: true, readAt: new Date().toISOString() } : n,
        ),
      );
      router.refresh();
    } finally {
      setMarkingId(null);
    }
  }

  if (items.length === 0) {
    return <NotificationEmptyState hasFilter={hasFilter} />;
  }

  return (
    <div className="flex flex-col gap-1">
      {items.map((notification) => (
        <NotificationItem
          key={notification.id}
          notification={notification}
          onClick={notification.isRead ? undefined : () => handleMarkAsRead(notification.id)}
          isLoading={markingId === notification.id}
        />
      ))}

      {(hasPrev || hasNext) && (
        <div className="flex items-center justify-center gap-2 pt-4">
          <Button
            type="button"
            variant="outline"
            size="sm"
            disabled={!hasPrev}
            onClick={() => setOffset((prev) => prev - PAGE_SIZE)}
          >
            Previous
          </Button>
          <span className="text-xs text-muted-foreground">
            Page {Math.floor(offset / PAGE_SIZE) + 1}
          </span>
          <Button
            type="button"
            variant="outline"
            size="sm"
            disabled={!hasNext}
            onClick={() => setOffset((prev) => prev + PAGE_SIZE)}
          >
            Next
          </Button>
        </div>
      )}
    </div>
  );
}
