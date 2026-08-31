"use server";

import type {
  ActionResult,
  ActivationResult,
  OnboardingProgressOutput,
} from "@enterprise/contracts";
import { completeBaselineStepSchema, inviteMemberSchema } from "@enterprise/contracts";
import { createInvitationEmailAdapter, inviteTenantMember } from "@enterprise/core/services";
import {
  completeBaselineStep,
  completeOnboardingStep,
  dismissChecklist,
  resumeChecklist,
  seedSampleData,
} from "@enterprise/core/services/onboarding-service";
import { getAdminClient } from "@enterprise/core/supabase/admin";
import { getServerClient } from "@enterprise/core/supabase/server";
import { getAppUrl } from "@enterprise/core/utils/env";
import { revalidatePath } from "next/cache";
import { ROUTES } from "@/lib/routes";
import { captureActionError } from "@/lib/sentry";

// ─── Auth context helper ──────────────────────────────────────────────────────

async function getAuthContext(supabase: Awaited<ReturnType<typeof getServerClient>>) {
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return null;
  }

  const tenantId = (user.app_metadata?.["tenant_id"] as string | undefined) ?? null;
  const role = (user.app_metadata?.["role"] as string | undefined) ?? null;

  return { userId: user.id, tenantId, role };
}

// ─── Actions ──────────────────────────────────────────────────────────────────

/**
 * Complete the baseline onboarding step (workspace name + locale).
 * Owner-only. Updates workspace profile via workspace-settings-service
 * and marks the baseline step complete on the onboarding progress row.
 */
export async function completeBaselineStepAction(
  input: Record<string, unknown>,
): Promise<ActionResult<ActivationResult>> {
  const parsed = completeBaselineStepSchema.safeParse(input);

  if (!parsed.success) {
    return {
      success: false,
      error: {
        code: "VALIDATION_ERROR",
        message: "Invalid input",
        details: parsed.error.flatten().fieldErrors as Record<string, unknown>,
      },
    };
  }

  const supabase = await getServerClient();
  const auth = await getAuthContext(supabase);

  if (!auth?.tenantId) {
    return {
      success: false,
      error: { code: "UNAUTHORIZED", message: "Authentication required" },
    };
  }

  if (auth.role !== "owner") {
    return {
      success: false,
      error: {
        code: "FORBIDDEN",
        message: "Only owners can complete the baseline onboarding step",
      },
    };
  }

  try {
    const adminClient = getAdminClient();
    const result = await completeBaselineStep(
      supabase,
      adminClient,
      auth.tenantId,
      auth.userId,
      auth.role,
      parsed.data,
    );

    if (!result.success) {
      return {
        success: false,
        error: { code: result.code ?? "STEP_FAILED", message: result.error },
      };
    }

    revalidatePath(ROUTES.onboarding);

    return { success: true, data: result.data };
  } catch (err) {
    captureActionError(err, {
      actionName: "completeBaselineStepAction",
      area: "onboarding",
      tenantId: auth.tenantId,
      userId: auth.userId,
      inputShape: Object.keys(parsed.data),
    });

    return {
      success: false,
      error: { code: "UNEXPECTED_ERROR", message: "An unexpected error occurred" },
    };
  }
}

/**
 * Send a team invitation and mark the first-invite onboarding step complete.
 * Owner-only. Reuses inviteTenantMember service (action-layer reuse with tenant-team).
 * The onboarding service only records the step — the invite is done here.
 */
export async function completeInviteStepAction(
  input: Record<string, unknown>,
): Promise<ActionResult<ActivationResult>> {
  const parsed = inviteMemberSchema.safeParse(input);

  if (!parsed.success) {
    return {
      success: false,
      error: {
        code: "VALIDATION_ERROR",
        message: "Invalid input",
        details: parsed.error.flatten().fieldErrors as Record<string, unknown>,
      },
    };
  }

  const supabase = await getServerClient();
  const auth = await getAuthContext(supabase);

  if (!auth?.tenantId) {
    return {
      success: false,
      error: { code: "UNAUTHORIZED", message: "Authentication required" },
    };
  }

  if (auth.role !== "owner") {
    return {
      success: false,
      error: {
        code: "FORBIDDEN",
        message: "Only owners can invite members during onboarding",
      },
    };
  }

  try {
    const emailAdapter = createInvitationEmailAdapter();
    const inviteResult = await inviteTenantMember(
      supabase,
      auth.tenantId,
      auth.userId,
      auth.role,
      parsed.data,
      emailAdapter,
      { appUrl: getAppUrl() },
    );

    if (!inviteResult.success) {
      return {
        success: false,
        error: {
          code: inviteResult.code ?? "INVITE_FAILED",
          message: inviteResult.error,
        },
      };
    }

    // Record the onboarding step completion after the invite succeeds
    const stepResult = await completeOnboardingStep(
      supabase,
      auth.tenantId,
      auth.userId,
      "first-invite",
    );

    if (!stepResult.success) {
      return {
        success: false,
        error: { code: stepResult.code ?? "STEP_FAILED", message: stepResult.error },
      };
    }

    revalidatePath(ROUTES.onboarding);

    return { success: true, data: stepResult.data };
  } catch (err) {
    captureActionError(err, {
      actionName: "completeInviteStepAction",
      area: "onboarding",
      tenantId: auth.tenantId,
      userId: auth.userId,
      inputShape: Object.keys(parsed.data),
    });

    return {
      success: false,
      error: { code: "UNEXPECTED_ERROR", message: "An unexpected error occurred" },
    };
  }
}

/**
 * Load starter sample data and mark the sample-data onboarding step complete.
 * Owner-only. Idempotent — safe to call multiple times.
 */
export async function seedSampleDataAction(): Promise<ActionResult<ActivationResult>> {
  const supabase = await getServerClient();
  const auth = await getAuthContext(supabase);

  if (!auth?.tenantId) {
    return {
      success: false,
      error: { code: "UNAUTHORIZED", message: "Authentication required" },
    };
  }

  if (auth.role !== "owner") {
    return {
      success: false,
      error: { code: "FORBIDDEN", message: "Only owners can seed sample data" },
    };
  }

  try {
    const result = await seedSampleData(supabase, auth.tenantId, auth.userId);

    if (!result.success) {
      return {
        success: false,
        error: { code: result.code ?? "SEED_FAILED", message: result.error },
      };
    }

    revalidatePath(ROUTES.onboarding);

    return { success: true, data: result.data };
  } catch (err) {
    captureActionError(err, {
      actionName: "seedSampleDataAction",
      area: "onboarding",
      tenantId: auth.tenantId,
      userId: auth.userId,
    });

    return {
      success: false,
      error: { code: "UNEXPECTED_ERROR", message: "An unexpected error occurred" },
    };
  }
}

/**
 * Dismiss the onboarding checklist.
 * Owner-only. The checklist can be resumed later.
 */
export async function dismissChecklistAction(): Promise<ActionResult<OnboardingProgressOutput>> {
  const supabase = await getServerClient();
  const auth = await getAuthContext(supabase);

  if (!auth?.tenantId) {
    return {
      success: false,
      error: { code: "UNAUTHORIZED", message: "Authentication required" },
    };
  }

  if (auth.role !== "owner") {
    return {
      success: false,
      error: {
        code: "FORBIDDEN",
        message: "Only owners can dismiss the onboarding checklist",
      },
    };
  }

  try {
    const result = await dismissChecklist(supabase, auth.tenantId, auth.userId);

    if (!result.success) {
      return {
        success: false,
        error: { code: result.code ?? "DISMISS_FAILED", message: result.error },
      };
    }

    revalidatePath(ROUTES.onboarding);

    return { success: true, data: result.data };
  } catch (err) {
    captureActionError(err, {
      actionName: "dismissChecklistAction",
      area: "onboarding",
      tenantId: auth.tenantId,
      userId: auth.userId,
    });

    return {
      success: false,
      error: { code: "UNEXPECTED_ERROR", message: "An unexpected error occurred" },
    };
  }
}

/**
 * Resume a previously dismissed onboarding checklist.
 * Owner-only. Clears the dismissed flag and dismissed_at timestamp.
 */
export async function resumeChecklistAction(): Promise<ActionResult<OnboardingProgressOutput>> {
  const supabase = await getServerClient();
  const auth = await getAuthContext(supabase);

  if (!auth?.tenantId) {
    return {
      success: false,
      error: { code: "UNAUTHORIZED", message: "Authentication required" },
    };
  }

  if (auth.role !== "owner") {
    return {
      success: false,
      error: {
        code: "FORBIDDEN",
        message: "Only owners can resume the onboarding checklist",
      },
    };
  }

  try {
    const result = await resumeChecklist(supabase, auth.tenantId, auth.userId);

    if (!result.success) {
      return {
        success: false,
        error: { code: result.code ?? "RESUME_FAILED", message: result.error },
      };
    }

    revalidatePath(ROUTES.onboarding);

    return { success: true, data: result.data };
  } catch (err) {
    captureActionError(err, {
      actionName: "resumeChecklistAction",
      area: "onboarding",
      tenantId: auth.tenantId,
      userId: auth.userId,
    });

    return {
      success: false,
      error: { code: "UNEXPECTED_ERROR", message: "An unexpected error occurred" },
    };
  }
}
