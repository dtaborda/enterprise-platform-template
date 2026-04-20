import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@enterprise/ui/components/card";
import { getServerClient } from "@enterprise/core/supabase/server";
import { getAppUrl } from "@enterprise/core/utils/env";
import { requireAuth } from "@/features/auth/queries";

export const metadata = { title: "Settings" };

export default async function SettingsPage() {
  const user = await requireAuth();
  const supabase = await getServerClient();

  const [{ data: tenant }, { data: profile }] = await Promise.all([
    supabase.from("tenants").select("name, slug, status").eq("id", user.tenantId).single(),
    supabase
      .from("profiles")
      .select("name, email, role, updated_at")
      .eq("id", user.id)
      .single(),
  ]);

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="font-headline text-2xl font-bold">Settings</h1>
        <p className="text-muted-foreground">Starter account and workspace context</p>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Account</CardTitle>
            <CardDescription>Current authenticated user information</CardDescription>
          </CardHeader>
          <CardContent className="space-y-2 text-sm text-muted-foreground">
            <p>Email: {profile?.email ?? user.email}</p>
            <p>Name: {profile?.name ?? "Not set"}</p>
            <p>Role: {profile?.role ?? user.role}</p>
            <p>Last update: {profile?.updated_at ?? "unknown"}</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Workspace</CardTitle>
            <CardDescription>Tenant data available from platform tables</CardDescription>
          </CardHeader>
          <CardContent className="space-y-2 text-sm text-muted-foreground">
            <p>Name: {tenant?.name ?? "Not available"}</p>
            <p>Slug: {tenant?.slug ?? "Not available"}</p>
            <p>Status: {tenant?.status ?? "unknown"}</p>
            <p>Tenant ID: {user.tenantId}</p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Environment</CardTitle>
          <CardDescription>Useful starter metadata for local setup and deployment checks</CardDescription>
        </CardHeader>
        <CardContent className="space-y-2 text-sm text-muted-foreground">
          <p>Runtime: {process.env.NODE_ENV ?? "unknown"}</p>
          <p>App URL: {getAppUrl()}</p>
        </CardContent>
      </Card>
    </div>
  );
}
