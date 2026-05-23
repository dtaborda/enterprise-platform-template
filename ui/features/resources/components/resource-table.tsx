import type { ResourceEntity, ResourceStatus, ResourceType } from "@enterprise/contracts";
import { Badge } from "@enterprise/ui/components/badge";
import { Button } from "@enterprise/ui/components/button";
import { EmptyState } from "@enterprise/ui/components/empty-state";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@enterprise/ui/components/table";
import { Package } from "lucide-react";
import Link from "next/link";
import { ROUTES } from "@/lib/routes";

interface ResourceTableProps {
  items: ResourceEntity[];
  total: number;
}

const TYPE_LABELS: Record<ResourceType, string> = {
  product: "Product",
  service: "Service",
  asset: "Asset",
  document: "Document",
  other: "Other",
};

const STATUS_VARIANTS: Record<ResourceStatus, "success" | "warning" | "neutral" | "destructive"> = {
  active: "success",
  draft: "warning",
  archived: "neutral",
  suspended: "destructive",
};

const STATUS_LABELS: Record<ResourceStatus, string> = {
  active: "Active",
  draft: "Draft",
  archived: "Archived",
  suspended: "Suspended",
};

function truncate(value: string | null, max = 80): string {
  if (!value) return "—";
  return value.length <= max ? value : `${value.slice(0, max)}…`;
}

export function ResourceTable({ items, total }: ResourceTableProps) {
  if (items.length === 0) {
    return (
      <EmptyState
        icon={Package}
        title="No resources found"
        description="Add a resource to get started, or adjust your filters."
        action={
          <Button variant="gradient" asChild>
            <Link href={ROUTES.resources.new}>New resource</Link>
          </Button>
        }
      />
    );
  }

  return (
    <div className="flex flex-col gap-2">
      <p className="text-sm text-muted-foreground">
        {total} {total === 1 ? "resource" : "resources"} found
      </p>
      <div className="rounded-xl bg-card">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Title</TableHead>
              <TableHead>Type</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Description</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {items.map((resource) => (
              <TableRow key={resource.id}>
                <TableCell className="font-medium">{resource.title}</TableCell>
                <TableCell>{TYPE_LABELS[resource.type]}</TableCell>
                <TableCell>
                  <Badge variant={STATUS_VARIANTS[resource.status]}>
                    {STATUS_LABELS[resource.status]}
                  </Badge>
                </TableCell>
                <TableCell>{truncate(resource.description)}</TableCell>
                <TableCell className="text-right">
                  <div className="flex justify-end gap-2">
                    <Link
                      href={ROUTES.resources.detail(resource.id)}
                      className="text-sm text-primary hover:underline"
                    >
                      View
                    </Link>
                    <Link
                      href={ROUTES.resources.edit(resource.id)}
                      className="text-sm text-primary hover:underline"
                    >
                      Edit
                    </Link>
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
