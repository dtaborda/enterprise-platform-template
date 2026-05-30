"use client";

import { Button } from "@enterprise/ui/components/button";
import { cn } from "@enterprise/ui/lib/utils";
import { Bell } from "lucide-react";
import Link from "next/link";
import { useUnreadCount } from "@/features/notifications/hooks/use-unread-count";
import type { NotificationBellProps } from "@/features/notifications/types";
import { ROUTES } from "@/lib/routes";

function formatBadgeCount(count: number): string {
  if (count > 99) return "99+";
  return String(count);
}

export function NotificationBell({ initialCount, userId, tenantId }: NotificationBellProps) {
  const { count } = useUnreadCount({ initialCount, userId, tenantId });

  return (
    <Button
      variant="ghost"
      size="icon"
      asChild
      className="relative"
      aria-label={count > 0 ? `Notifications — ${count} unread` : "Notifications"}
    >
      <Link href={ROUTES.notifications}>
        <Bell className="size-4" aria-hidden="true" />

        {count > 0 && (
          <span
            className={cn(
              "absolute -right-0.5 -top-0.5 flex items-center justify-center rounded-full bg-destructive text-destructive-foreground font-medium leading-none",
              count <= 9
                ? "size-2 text-[0px]" // red dot for 1–9
                : "min-w-4 h-4 px-1 text-[10px]", // numeric for 10+
            )}
            aria-hidden="true"
          >
            {count >= 10 ? formatBadgeCount(count) : null}
          </span>
        )}
      </Link>
    </Button>
  );
}
