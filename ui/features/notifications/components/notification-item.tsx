"use client";

import { cn } from "@enterprise/ui/lib/utils";
import { CreditCard, Users } from "lucide-react";
import type { NotificationItemProps } from "@/features/notifications/types";

function formatRelativeTime(iso: string): string {
  const now = Date.now();
  const then = new Date(iso).getTime();
  const diffMs = now - then;
  const diffSecs = Math.floor(diffMs / 1000);
  const diffMins = Math.floor(diffSecs / 60);
  const diffHours = Math.floor(diffMins / 60);
  const diffDays = Math.floor(diffHours / 24);

  if (diffSecs < 60) return "just now";
  if (diffMins < 60) return `${diffMins} minute${diffMins === 1 ? "" : "s"} ago`;
  if (diffHours < 24) return `${diffHours} hour${diffHours === 1 ? "" : "s"} ago`;
  if (diffDays < 30) return `${diffDays} day${diffDays === 1 ? "" : "s"} ago`;
  return new Date(iso).toLocaleDateString(undefined, { month: "short", day: "numeric" });
}

interface NotificationItemClickableProps extends NotificationItemProps {
  onClick?: () => void;
  isLoading?: boolean;
}

export function NotificationItem({
  notification,
  onClick,
  isLoading,
}: NotificationItemClickableProps) {
  const CategoryIcon = notification.category === "billing" ? CreditCard : Users;

  return (
    <button
      type="button"
      onClick={onClick}
      disabled={isLoading}
      className={cn(
        "flex w-full items-start gap-3 rounded-lg p-3 text-left transition-colors",
        notification.isRead
          ? "bg-surface-container-low hover:bg-surface-container-high"
          : "bg-primary/5 hover:bg-primary/10",
        isLoading && "opacity-50 cursor-wait",
      )}
    >
      {/* Unread dot */}
      <div className="flex shrink-0 flex-col items-center pt-1">
        <span
          className={cn(
            "size-2 rounded-full",
            notification.isRead ? "bg-transparent" : "bg-primary",
          )}
          role={notification.isRead ? undefined : "status"}
        />
      </div>

      {/* Category icon */}
      <div className="flex size-8 shrink-0 items-center justify-center rounded-full bg-muted">
        <CategoryIcon className="size-4 text-muted-foreground" aria-hidden="true" />
      </div>

      {/* Content */}
      <div className="flex min-w-0 flex-1 flex-col gap-1">
        <p
          className={cn(
            "text-sm leading-tight",
            notification.isRead ? "font-normal text-foreground" : "font-medium text-foreground",
          )}
        >
          {notification.title}
        </p>
        <p className="line-clamp-2 text-xs text-muted-foreground">{notification.body}</p>
        <p className="text-xs text-muted-foreground/70">
          {formatRelativeTime(notification.createdAt)}
        </p>
      </div>
    </button>
  );
}
