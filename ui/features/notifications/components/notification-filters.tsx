"use client";

import { Button } from "@enterprise/ui/components/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@enterprise/ui/components/select";
import { cn } from "@enterprise/ui/lib/utils";
import { useRouter, useSearchParams } from "next/navigation";
import { useTransition } from "react";
import { ROUTES } from "@/lib/routes";

const CATEGORY_OPTIONS = [
  { value: "all", label: "All categories" },
  { value: "team", label: "Team" },
  { value: "billing", label: "Billing" },
] as const;

export function NotificationFilters() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [isPending, startTransition] = useTransition();

  const currentTab = searchParams.get("tab") ?? "all";
  const currentCategory = searchParams.get("category") ?? "all";

  function updateParams(key: string, value: string) {
    const params = new URLSearchParams(searchParams.toString());
    if (value === "all") {
      params.delete(key);
    } else {
      params.set(key, value);
    }
    startTransition(() => {
      router.push(`${ROUTES.notifications}?${params.toString()}`);
    });
  }

  return (
    <div className="flex flex-wrap items-center gap-3">
      {/* Read state toggle */}
      <div className="flex items-center rounded-lg bg-muted p-1">
        <Button
          type="button"
          variant="ghost"
          size="sm"
          disabled={isPending}
          onClick={() => updateParams("tab", "all")}
          className={cn(
            "h-7 rounded-md px-3 text-xs transition-colors",
            currentTab === "all" && "bg-background shadow-sm",
          )}
        >
          All
        </Button>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          disabled={isPending}
          onClick={() => updateParams("tab", "unread")}
          className={cn(
            "h-7 rounded-md px-3 text-xs transition-colors",
            currentTab === "unread" && "bg-background shadow-sm",
          )}
        >
          Unread
        </Button>
      </div>

      {/* Category dropdown */}
      <Select
        value={currentCategory}
        onValueChange={(value) => updateParams("category", value)}
        disabled={isPending}
      >
        <SelectTrigger className="h-8 w-40 text-xs">
          <SelectValue placeholder="Category" />
        </SelectTrigger>
        <SelectContent>
          {CATEGORY_OPTIONS.map((opt) => (
            <SelectItem key={opt.value} value={opt.value} className="text-xs">
              {opt.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}
