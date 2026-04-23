import type { ResourceEntity, ResourceStatus, ResourceType } from "@enterprise/contracts";
import { Badge } from "@enterprise/ui/components/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@enterprise/ui/components/card";
import Image from "next/image";
import type { ReactNode } from "react";

interface ResourceDetailProps {
  resource: ResourceEntity;
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

function parseImageUrls(raw: string | null): string[] {
  if (!raw) return [];
  try {
    const parsed: unknown = JSON.parse(raw);
    if (Array.isArray(parsed)) {
      return parsed.filter((value): value is string => typeof value === "string");
    }
  } catch {
    return [];
  }
  return [];
}

function prettyMetadata(raw: string | null): string {
  if (!raw) return "—";
  try {
    const parsed: unknown = JSON.parse(raw);
    return JSON.stringify(parsed, null, 2);
  } catch {
    return raw;
  }
}

interface FieldProps {
  label: string;
  value: ReactNode;
}

function Field({ label, value }: FieldProps) {
  return (
    <div className="flex flex-col gap-0.5">
      <dt className="text-xs font-medium uppercase tracking-wide text-muted-foreground">{label}</dt>
      <dd className="text-sm">{value ?? "—"}</dd>
    </div>
  );
}

export function ResourceDetail({ resource }: ResourceDetailProps) {
  const imageUrls = parseImageUrls(resource.imageUrls);

  return (
    <div className="flex flex-col gap-6">
      <Card>
        <CardHeader>
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <CardTitle className="text-xl">{resource.title}</CardTitle>
              <CardDescription>{TYPE_LABELS[resource.type]}</CardDescription>
            </div>
            <Badge variant={STATUS_VARIANTS[resource.status]}>
              {STATUS_LABELS[resource.status]}
            </Badge>
          </div>
        </CardHeader>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Resource Details</CardTitle>
        </CardHeader>
        <CardContent>
          <dl className="grid gap-4 sm:grid-cols-2">
            <Field label="Type" value={TYPE_LABELS[resource.type]} />
            <Field label="Status" value={STATUS_LABELS[resource.status]} />
            <Field label="Description" value={resource.description} />
          </dl>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Metadata (JSON)</CardTitle>
        </CardHeader>
        <CardContent>
          <pre className="overflow-x-auto rounded-md bg-muted p-3 text-xs">
            {prettyMetadata(resource.metadata)}
          </pre>
        </CardContent>
      </Card>

      {imageUrls.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Images</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
              {imageUrls.map((url) => (
                <a
                  key={url}
                  href={url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="overflow-hidden rounded-md border"
                >
                  <Image
                    src={url}
                    alt="Resource preview"
                    width={400}
                    height={225}
                    unoptimized
                    className="aspect-video w-full object-cover"
                  />
                </a>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Metadata</CardTitle>
        </CardHeader>
        <CardContent>
          <dl className="grid gap-4 sm:grid-cols-2">
            <Field label="Resource ID" value={<code className="text-xs">{resource.id}</code>} />
            <Field label="Tenant ID" value={<code className="text-xs">{resource.tenantId}</code>} />
            <Field
              label="Created"
              value={new Date(resource.createdAt).toLocaleDateString("en-US", {
                year: "numeric",
                month: "long",
                day: "numeric",
              })}
            />
            <Field
              label="Last Updated"
              value={new Date(resource.updatedAt).toLocaleDateString("en-US", {
                year: "numeric",
                month: "long",
                day: "numeric",
              })}
            />
          </dl>
        </CardContent>
      </Card>
    </div>
  );
}
