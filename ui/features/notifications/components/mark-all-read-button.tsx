"use client";

import { Button } from "@enterprise/ui/components/button";
import { CheckCheck } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { markAllAsReadAction } from "@/features/notifications/actions";

interface MarkAllReadButtonProps {
  unreadCount: number;
}

export function MarkAllReadButton({ unreadCount }: MarkAllReadButtonProps) {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);

  async function handleClick() {
    if (unreadCount === 0) return;
    setIsLoading(true);
    try {
      await markAllAsReadAction();
      router.refresh();
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <Button
      type="button"
      variant="outline"
      size="sm"
      disabled={unreadCount === 0 || isLoading}
      onClick={handleClick}
      className="gap-2"
    >
      <CheckCheck className="size-4" aria-hidden="true" />
      {unreadCount > 0 ? `Mark ${unreadCount} as read` : "Mark all as read"}
    </Button>
  );
}
