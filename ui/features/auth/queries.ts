import "server-only";

import type { PlatformUser } from "@enterprise/contracts";
import { getCurrentPlatformUserService } from "@enterprise/core/services/auth-service";
import { createBackendAdapters } from "@enterprise/core/services/backend-adapters";
import { getServerClient } from "@enterprise/core/supabase/server";
import { redirect } from "next/navigation";

// Auth factory is request-scoped: call authFactory(client) per request.
const { auth: authFactory } = createBackendAdapters();

/** Get the current authenticated user or null */
export async function getCurrentUser(): Promise<PlatformUser | null> {
  const supabase = await getServerClient();
  const auth = authFactory(supabase);
  const result = await getCurrentPlatformUserService(auth);

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
