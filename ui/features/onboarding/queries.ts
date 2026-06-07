import "server-only";

import type { OnboardingProgressOutput } from "@enterprise/contracts";
import {
  getOnboardingProgress,
  initOnboardingProgress,
} from "@enterprise/core/services/onboarding-service";
import { getServerClient } from "@enterprise/core/supabase/server";

/**
 * Fetch the current onboarding progress for the authenticated owner.
 * Returns null if no progress row exists yet or if the user is not authenticated.
 * RLS ensures only the tenant owner can read the row.
 */
export async function fetchOnboardingProgress(): Promise<OnboardingProgressOutput | null> {
  const supabase = await getServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return null;
  }

  const tenantId = (user.app_metadata?.["tenant_id"] as string | undefined) ?? null;

  if (!tenantId) {
    return null;
  }

  const result = await getOnboardingProgress(supabase, tenantId);

  if (!result.success) {
    if (result.code === "PROGRESS_NOT_FOUND") {
      return null;
    }
    throw new Error(result.error);
  }

  return result.data;
}

/**
 * Initialize and return the onboarding progress row for the authenticated owner.
 * Idempotent — safe to call on every owner page load.
 * Emits `tenant_onboarding.started` only on the first call.
 * Throws if the user is not authenticated or tenant is missing.
 */
export async function fetchInitOnboardingProgress(): Promise<OnboardingProgressOutput> {
  const supabase = await getServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    throw new Error("Authentication required");
  }

  const tenantId = (user.app_metadata?.["tenant_id"] as string | undefined) ?? null;

  if (!tenantId) {
    throw new Error("Tenant not found in auth metadata");
  }

  const result = await initOnboardingProgress(supabase, tenantId, user.id);

  if (!result.success) {
    throw new Error(result.error);
  }

  return result.data;
}
