import type { ResourceQueryDto } from "@enterprise/contracts";
import { Button } from "@enterprise/ui/components/button";
import Link from "next/link";
import { requireAuth } from "@/features/auth/queries";
import { ResourceFilters } from "@/features/resources/components/resource-filters";
import { ResourceTable } from "@/features/resources/components/resource-table";
import { getResources } from "@/features/resources/queries";

export const metadata = { title: "Resources" };

const ITEMS_PER_PAGE = 20;

interface ResourcesPageProps {
  searchParams?: Promise<Record<string, string | string[]>>;
}

export default async function ResourcesPage({ searchParams }: ResourcesPageProps) {
  const user = await requireAuth();
  const params = (await searchParams) ?? {};

  const typeParam = typeof params["type"] === "string" ? params["type"] : undefined;
  const statusParam = typeof params["status"] === "string" ? params["status"] : undefined;
  const offsetParam =
    typeof params["offset"] === "string" ? Number.parseInt(params["offset"], 10) : 0;

  const filters: Partial<ResourceQueryDto> = {
    limit: ITEMS_PER_PAGE,
    offset: Number.isNaN(offsetParam) ? 0 : offsetParam,
  };

  if (typeParam) filters.type = typeParam as ResourceQueryDto["type"];
  if (statusParam) filters.status = statusParam as ResourceQueryDto["status"];

  const { items, total } = await getResources(filters as ResourceQueryDto);

  const currentOffset = filters.offset ?? 0;
  const canGoBack = currentOffset > 0;
  const canGoForward = currentOffset + ITEMS_PER_PAGE < total;

  const isAdminOrOwner = user.role === "admin" || user.role === "owner";

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="font-headline text-2xl font-bold">Resources</h1>
          <p className="text-muted-foreground">Browse and manage your resource catalog</p>
        </div>
        {isAdminOrOwner && (
          <Button asChild>
            <Link href="/dashboard/resources/new">New Resource</Link>
          </Button>
        )}
      </div>

      <ResourceFilters />

      <ResourceTable items={items} total={total} />

      {total > ITEMS_PER_PAGE && (
        <div className="flex items-center justify-between">
          <p className="text-sm text-muted-foreground">
            Showing {currentOffset + 1}–{Math.min(currentOffset + ITEMS_PER_PAGE, total)} of {total}
          </p>
          <div className="flex gap-2">
            {canGoBack && (
              <Button variant="outline" size="sm" asChild>
                <Link
                  href={`/dashboard/resources?${new URLSearchParams({
                    ...(typeParam ? { type: typeParam } : {}),
                    ...(statusParam ? { status: statusParam } : {}),
                    offset: String(currentOffset - ITEMS_PER_PAGE),
                  }).toString()}`}
                >
                  Previous
                </Link>
              </Button>
            )}
            {canGoForward && (
              <Button variant="outline" size="sm" asChild>
                <Link
                  href={`/dashboard/resources?${new URLSearchParams({
                    ...(typeParam ? { type: typeParam } : {}),
                    ...(statusParam ? { status: statusParam } : {}),
                    offset: String(currentOffset + ITEMS_PER_PAGE),
                  }).toString()}`}
                >
                  Next
                </Link>
              </Button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
