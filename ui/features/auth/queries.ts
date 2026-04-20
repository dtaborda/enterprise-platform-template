import "server-only";

import type { PlatformUser, UserRole } from "@enterprise/contracts";
import { getServerClient } from "@enterprise/core/supabase/server";
import { redirect } from "next/navigation";

/** Get the current authenticated user or null */
export async function getCurrentUser(): Promise<PlatformUser | null> {
  const supabase = await getServerClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return null;
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("tenant_id, role, name, avatar_url")
    .eq("id", user.id)
    .single();

  return {
    id: user.id,
    createdAt: new Date(user.created_at),
    updatedAt: new Date(user.updated_at ?? user.created_at),
    email: user.email ?? "",
    name: profile?.name ?? null,
    avatarUrl: profile?.avatar_url ?? null,
    role: ((profile?.role as UserRole | undefined) ?? "guest") as UserRole,
    tenantId: profile?.tenant_id ?? "",
  };
}

/** Require authentication — redirects to sign-in if unauthenticated */
export async function requireAuth() {
  const user = await getCurrentUser();

  if (!user) {
    redirect("/sign-in");
  }

  return user;
}
