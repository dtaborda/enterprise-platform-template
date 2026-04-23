import Link from "next/link";
import { notFound } from "next/navigation";
import { requireAuth } from "@/features/auth/queries";
import { ResourceForm } from "@/features/resources/components/resource-form";
import { getResourceById } from "@/features/resources/queries";

export const metadata = { title: "Edit Resource" };

interface EditResourcePageProps {
  params: Promise<{ id: string }>;
}

export default async function EditResourcePage({ params }: EditResourcePageProps) {
  const user = await requireAuth();
  const { id } = await params;

  const isAdminOrOwner = user.role === "admin" || user.role === "owner";
  if (!isAdminOrOwner) {
    return (
      <div className="flex flex-col gap-4">
        <p className="text-muted-foreground">You do not have permission to edit resources.</p>
      </div>
    );
  }

  const resource = await getResourceById(id);

  if (!resource) {
    notFound();
  }

  return (
    <div className="flex flex-col gap-6">
      <nav className="flex items-center gap-2 text-sm text-muted-foreground">
        <Link href="/dashboard/resources" className="hover:text-foreground hover:underline">
          Resources
        </Link>
        <span>/</span>
        <Link href={`/dashboard/resources/${id}`} className="hover:text-foreground hover:underline">
          {resource.title}
        </Link>
        <span>/</span>
        <span className="text-foreground">Edit</span>
      </nav>

      <div>
        <h1 className="font-headline text-2xl font-bold">Edit Resource</h1>
        <p className="text-muted-foreground">Update the details for {resource.title}</p>
      </div>

      <div className="max-w-3xl">
        <ResourceForm defaultValues={resource} />
      </div>
    </div>
  );
}
