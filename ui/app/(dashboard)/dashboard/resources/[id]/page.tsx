import { Button } from "@enterprise/ui/components/button";
import Link from "next/link";
import { notFound } from "next/navigation";
import { requireAuth } from "@/features/auth/queries";
import { DeleteResourceButton } from "@/features/resources/components/delete-resource-button";
import { ResourceDetail } from "@/features/resources/components/resource-detail";
import { getResourceById } from "@/features/resources/queries";

export const metadata = { title: "Resource Detail" };

interface ResourcePageProps {
  params: Promise<{ id: string }>;
}

export default async function ResourcePage({ params }: ResourcePageProps) {
  const user = await requireAuth();
  const { id } = await params;

  const resource = await getResourceById(id);

  if (!resource) {
    notFound();
  }

  const isAdminOrOwner = user.role === "admin" || user.role === "owner";

  return (
    <div className="flex flex-col gap-6">
      <nav className="flex items-center gap-2 text-sm text-muted-foreground">
        <Link href="/dashboard/resources" className="hover:text-foreground hover:underline">
          Resources
        </Link>
        <span>/</span>
        <span className="truncate text-foreground">{resource.title}</span>
      </nav>

      {isAdminOrOwner && (
        <div className="flex justify-end gap-3">
          <Button variant="outline" size="sm" asChild>
            <Link href={`/dashboard/resources/${id}/edit`}>Edit</Link>
          </Button>
          <DeleteResourceButton id={id} />
        </div>
      )}

      <ResourceDetail resource={resource} />
    </div>
  );
}
