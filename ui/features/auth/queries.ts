import "server-only";

import type { PlatformUser } from "@enterprise/contracts";
import { getCurrentPlatformUserService } from "@enterprise/core/services/auth-service";
import { getServerClient } from "@enterprise/core/supabase/server";
import { redirect } from "next/navigation";

/** Get the current authenticated user or null */
export async function getCurrentUser(): Promise<PlatformUser | null> {
  const supabase = await getServerClient();
  const result = await getCurrentPlatformUserService(supabase);

  if (!result.success) {
    return null;
  }

  return result.data;
}

/** Require authentication — redirects to sign-in if unauthenticated */
export async function requireAuth() {
  const user = await getCurrentUser();

  if (!user) {
    redirect("/sign-in");
  }

  return user;
}
