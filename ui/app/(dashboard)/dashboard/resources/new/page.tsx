import Link from "next/link";
import { requireAuth } from "@/features/auth/queries";
import { ResourceForm } from "@/features/resources/components/resource-form";

export const metadata = { title: "New Resource" };

export default async function NewResourcePage() {
  const user = await requireAuth();
  const isAdminOrOwner = user.role === "admin" || user.role === "owner";

  if (!isAdminOrOwner) {
    return (
      <div className="flex flex-col gap-4">
        <p className="text-muted-foreground">You do not have permission to create resources.</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6">
      <nav className="flex items-center gap-2 text-sm text-muted-foreground">
        <Link href="/dashboard/resources" className="hover:text-foreground hover:underline">
          Resources
        </Link>
        <span>/</span>
        <span className="text-foreground">New Resource</span>
      </nav>

      <div>
        <h1 className="font-headline text-2xl font-bold">New Resource</h1>
        <p className="text-muted-foreground">Add a new resource to your workspace</p>
      </div>

      <div className="max-w-3xl">
        <ResourceForm />
      </div>
    </div>
  );
}
