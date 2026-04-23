"use client";

import {
  RESOURCE_STATUS,
  RESOURCE_TYPE,
  type ResourceStatus,
  type ResourceType,
} from "@enterprise/contracts";
import { Label } from "@enterprise/ui/components/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@enterprise/ui/components/select";
import { useRouter, useSearchParams } from "next/navigation";

const RESOURCE_TYPE_LABELS: Record<ResourceType, string> = {
  product: "Product",
  service: "Service",
  asset: "Asset",
  document: "Document",
  other: "Other",
};

const RESOURCE_STATUS_LABELS: Record<ResourceStatus, string> = {
  active: "Active",
  draft: "Draft",
  archived: "Archived",
  suspended: "Suspended",
};

export function ResourceFilters() {
  const router = useRouter();
  const searchParams = useSearchParams();

  function updateFilter(key: string, value: string) {
    const params = new URLSearchParams(searchParams.toString());

    if (value && value !== "all") {
      params.set(key, value);
    } else {
      params.delete(key);
    }

    params.delete("offset");

    router.push(`/dashboard/resources?${params.toString()}`);
  }

  const currentType = searchParams.get("type") ?? "";
  const currentStatus = searchParams.get("status") ?? "";

  return (
    <div className="flex flex-wrap items-end gap-4">
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="filter-type" className="text-sm">
          Type
        </Label>
        <Select value={currentType || "all"} onValueChange={(value) => updateFilter("type", value)}>
          <SelectTrigger id="filter-type" className="w-40">
            <SelectValue placeholder="All types" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All types</SelectItem>
            {Object.entries(RESOURCE_TYPE).map(([, value]) => (
              <SelectItem key={value} value={value}>
                {RESOURCE_TYPE_LABELS[value]}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="flex flex-col gap-1.5">
        <Label htmlFor="filter-status" className="text-sm">
          Status
        </Label>
        <Select
          value={currentStatus || "all"}
          onValueChange={(value) => updateFilter("status", value)}
        >
          <SelectTrigger id="filter-status" className="w-40">
            <SelectValue placeholder="All statuses" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All statuses</SelectItem>
            {Object.entries(RESOURCE_STATUS).map(([, value]) => (
              <SelectItem key={value} value={value}>
                {RESOURCE_STATUS_LABELS[value]}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
    </div>
  );
}
