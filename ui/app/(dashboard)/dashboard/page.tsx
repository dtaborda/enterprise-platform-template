import { getServerClient } from "@enterprise/core/supabase/server";
import { getAppUrl } from "@enterprise/core/utils/env";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@enterprise/ui/components/card";
import { requireAuth } from "@/features/auth/queries";

export const metadata = { title: "Dashboard" };

export default async function DashboardPage() {
  const user = await requireAuth();
  const supabase = await getServerClient();

  const [{ data: tenant }, { data: profile }] = await Promise.all([
    supabase.from("tenants").select("name, slug, status").eq("id", user.tenantId).single(),
    supabase.from("profiles").select("updated_at").eq("id", user.id).single(),
  ]);

  const appUrl = getAppUrl();

  const starterFacts = [
    {
      title: "Signed-in account",
      value: user.email,
      description: user.name ?? "No profile name set",
    },
    {
      title: "Workspace",
      value: tenant?.name ?? "Tenant not initialized",
      description: tenant?.slug ? `Slug: ${tenant.slug}` : `Tenant ID: ${user.tenantId}`,
    },
    {
      title: "Role",
      value: user.role,
      description: "Resolved from profile + RLS context",
    },
    {
      title: "Runtime",
      value: process.env.NODE_ENV ?? "unknown",
      description: `App URL: ${appUrl}`,
    },
  ];

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="font-headline text-2xl font-bold">Dashboard</h1>
        <p className="text-muted-foreground">
          Starter data from your authenticated platform context
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {starterFacts.map((item) => (
          <Card key={item.title}>
            <CardHeader>
              <CardDescription>{item.description}</CardDescription>
              <CardTitle className="text-xl">{item.value}</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-xs text-muted-foreground">{item.title}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Platform status</CardTitle>
          <CardDescription>Minimal server-side status for starter onboarding</CardDescription>
        </CardHeader>
        <CardContent className="text-sm text-muted-foreground">
          <p>Tenant status: {tenant?.status ?? "unknown"}</p>
          <p>Profile updated: {profile?.updated_at ?? "not available"}</p>
          <p>User ID: {user.id}</p>
        </CardContent>
      </Card>
    </div>
  );
}
