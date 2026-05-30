"use client";

import { getBrowserClient } from "@enterprise/core/supabase/client";
import { useEffect, useRef, useState } from "react";

interface UseUnreadCountOptions {
  initialCount: number;
  userId: string;
  tenantId: string;
}

/**
 * Manages the notification bell unread count.
 * - Starts from the SSR-fetched initial count.
 * - Subscribes to Supabase Realtime INSERT events on the `notifications` table
 *   filtered by `user_id` to increment on new notifications.
 * - Exposes decrement (markAsRead) and reset (markAllAsRead) to let UI optimistically update.
 */
export function useUnreadCount({ initialCount, userId, tenantId }: UseUnreadCountOptions) {
  const [count, setCount] = useState(initialCount);
  // Keep tenantId in a ref for closure safety inside the Realtime callback
  const tenantIdRef = useRef(tenantId);

  useEffect(() => {
    tenantIdRef.current = tenantId;
  }, [tenantId]);

  useEffect(() => {
    if (!userId) return;

    let isMounted = true;
    const supabase = getBrowserClient();

    const channel = supabase
      .channel(`notifications-badge-${userId}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "notifications",
          filter: `user_id=eq.${userId}`,
        },
        (payload: { new: Record<string, unknown> }) => {
          if (!isMounted) return;
          // Only increment for the current tenant
          const row = payload.new;
          if (row["tenant_id"] === tenantIdRef.current && row["is_read"] === false) {
            setCount((prev) => prev + 1);
          }
        },
      )
      .subscribe();

    return () => {
      isMounted = false;
      supabase.removeChannel(channel);
    };
  }, [userId]);

  function decrement() {
    setCount((prev) => Math.max(0, prev - 1));
  }

  function reset() {
    setCount(0);
  }

  return { count, decrement, reset };
}
