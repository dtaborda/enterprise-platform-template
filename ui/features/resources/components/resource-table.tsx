import type { ResourceEntity, ResourceStatus, ResourceType } from "@enterprise/contracts";
import { Badge } from "@enterprise/ui/components/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@enterprise/ui/components/table";
import Link from "next/link";

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

const STATUS_VARIANTS: Record<ResourceStatus, "default" | "secondary" | "destructive" | "outline"> =
  {
    active: "default",
    draft: "secondary",
    archived: "outline",
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
      <div className="rounded-lg border py-16 text-center">
        <p className="text-muted-foreground">No resources found.</p>
        <p className="mt-1 text-sm text-muted-foreground">
          Add a resource to get started, or adjust your filters.
        </p>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-2">
      <p className="text-sm text-muted-foreground">
        {total} {total === 1 ? "resource" : "resources"} found
      </p>
      <div className="rounded-lg border">
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
                      href={`/dashboard/resources/${resource.id}`}
                      className="text-sm text-primary hover:underline"
                    >
                      View
                    </Link>
                    <Link
                      href={`/dashboard/resources/${resource.id}/edit`}
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
