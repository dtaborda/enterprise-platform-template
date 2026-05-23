import { Button } from "@enterprise/ui/components/button";
import { PageHeader } from "@enterprise/ui/components/page-header";
import Link from "next/link";
import { notFound } from "next/navigation";
import { requireAuth } from "@/features/auth/queries";
import { DeleteResourceButton } from "@/features/resources/components/delete-resource-button";
import { ResourceDetail } from "@/features/resources/components/resource-detail";
import { getResourceById } from "@/features/resources/queries";
import { ROUTES } from "@/lib/routes";

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
        <Link href={ROUTES.resources.root} className="hover:text-foreground hover:underline">
          Resources
        </Link>
        <span>/</span>
        <span className="truncate text-foreground">{resource.title}</span>
      </nav>

      <PageHeader
        title={resource.title}
        action={
          isAdminOrOwner ? (
            <div className="flex gap-3">
              <Button variant="outline" size="sm" asChild>
                <Link href={ROUTES.resources.edit(id)}>Edit</Link>
              </Button>
              <DeleteResourceButton id={id} />
            </div>
          ) : undefined
        }
      />

      <ResourceDetail resource={resource} />
    </div>
  );
}
