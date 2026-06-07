// Tenant Onboarding Service
// Manages per-tenant onboarding progress, activation tracking, and checklist state.
// Function-based, receives SupabaseClient via DI, returns ServiceResult<T>.
// No "use server", no revalidatePath, no Sentry — those belong in ui/features/onboarding/actions.ts.
//
// Activation override point: evaluateActivation() — see internal docs below.

import type {
  ActivationResult,
  CompleteBaselineStepDto,
  OnboardingProgressOutput,
} from "@enterprise/contracts";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { ServiceResult } from "./auth-service";
import { updateWorkspaceProfile, updateWorkspaceRegional } from "./workspace-settings-service";

// ─── Internal row type ────────────────────────────────────────────────────────

interface OnboardingProgressRow {
  id: string;
  tenant_id: string;
  state: "not_started" | "in_progress" | "activated";
  baseline_completed_at: string | null;
  first_invite_completed_at: string | null;
  sample_data_completed_at: string | null;
  dismissed: boolean;
  dismissed_at: string | null;
  activated_at: string | null;
  created_at: string;
  updated_at: string;
}

// ─── Audit Logging ────────────────────────────────────────────────────────────

async function writeAuditLog(
  client: SupabaseClient,
  tenantId: string,
  userId: string,
  event: string,
  resourceId?: string,
  metadata?: Record<string, unknown>,
): Promise<void> {
  const action =
    event.includes("activated") || event.includes("started")
      ? "create"
      : event.includes("dismissed")
        ? "update"
        : "update";

  const { error } = await client.from("audit_log").insert({
    tenant_id: tenantId,
    user_id: userId,
    action,
    resource: "tenant-onboarding",
    resource_id: resourceId ?? null,
    metadata: JSON.stringify({ event, ...(metadata ?? {}) }),
    ip_address: null,
    user_agent: null,
  });

  if (error) {
    console.error(`[audit_log] Failed to write [${event}]:`, error);
  }
}

// ─── Row mapper ───────────────────────────────────────────────────────────────

function mapProgressRow(row: OnboardingProgressRow): OnboardingProgressOutput {
  const baselineCompleted = row.baseline_completed_at !== null;
  const firstInviteCompleted = row.first_invite_completed_at !== null;
  const sampleDataCompleted = row.sample_data_completed_at !== null;
  const completedCount = [baselineCompleted, firstInviteCompleted, sampleDataCompleted].filter(
    Boolean,
  ).length;

  return {
    tenantId: row.tenant_id,
    state: row.state,
    baselineCompleted,
    firstInviteCompleted,
    sampleDataCompleted,
    dismissed: row.dismissed,
    activatedAt: row.activated_at ? new Date(row.activated_at) : null,
    completedCount,
    totalSteps: 3,
  };
}

// ─── evaluateActivation (internal override point) ────────────────────────────
//
// ACTIVATION RULE — single override point for template adopters:
//   activated := baseline_completed_at IS NOT NULL
//                AND (first_invite_completed_at IS NOT NULL
//                     OR sample_data_completed_at IS NOT NULL)
//
// Idempotency: guarded by `UPDATE ... WHERE activated_at IS NULL`.
// Only the call that flips NULL→timestamp emits `tenant.activated`.
// Concurrent calls that lose the race return { activated: false } without re-emitting.
//
// To change activation criteria, update ONLY the `shouldActivate` boolean below.

async function evaluateActivation(
  client: SupabaseClient,
  tenantId: string,
  userId: string,
): Promise<ServiceResult<ActivationResult>> {
  // 1. Load the current progress row
  const { data: rowData, error: selectError } = await client
    .from("tenant_onboarding_progress")
    .select("*")
    .eq("tenant_id", tenantId)
    .single();

  if (selectError || !rowData) {
    return {
      success: false,
      error: selectError?.message ?? "Progress row not found for activation check",
      code: "PROGRESS_NOT_FOUND",
    };
  }

  const row = rowData as OnboardingProgressRow;

  // 2. Idempotency guard — already activated
  if (row.activated_at !== null) {
    return {
      success: true,
      data: {
        activated: false,
        activatedAt: new Date(row.activated_at),
        progress: mapProgressRow(row),
      },
    };
  }

  // 3. Activation rule (documented override point — change criteria here only)
  const baselineDone = row.baseline_completed_at !== null;
  const valueStepDone =
    row.first_invite_completed_at !== null || row.sample_data_completed_at !== null;
  const shouldActivate = baselineDone && valueStepDone;

  if (!shouldActivate) {
    return {
      success: true,
      data: {
        activated: false,
        activatedAt: null,
        progress: mapProgressRow(row),
      },
    };
  }

  // 4. Race-safe activation flip: UPDATE WHERE activated_at IS NULL
  const activatedAt = new Date();
  const { data: updatedData } = await client
    .from("tenant_onboarding_progress")
    .update({
      activated_at: activatedAt.toISOString(),
      state: "activated",
      updated_at: activatedAt.toISOString(),
    })
    .eq("tenant_id", tenantId)
    .is("activated_at", null)
    .select()
    .maybeSingle();

  if (!updatedData) {
    // Race condition: another concurrent request already activated this tenant.
    // rowsAffected = 0 (the IS NULL predicate filtered us out).
    // Do NOT emit tenant.activated — the winner already did.
    const { data: currentData } = await client
      .from("tenant_onboarding_progress")
      .select("*")
      .eq("tenant_id", tenantId)
      .single();

    const currentRow = currentData as OnboardingProgressRow | null;

    return {
      success: true,
      data: {
        activated: false,
        activatedAt: currentRow?.activated_at ? new Date(currentRow.activated_at) : null,
        progress: currentRow ? mapProgressRow(currentRow) : mapProgressRow(row),
      },
    };
  }

  // 5. This call won the race — emit tenant.activated exactly once
  const updatedRow = updatedData as OnboardingProgressRow;
  const completedSteps = [
    updatedRow.baseline_completed_at ? "baseline" : null,
    updatedRow.first_invite_completed_at ? "first-invite" : null,
    updatedRow.sample_data_completed_at ? "sample-data" : null,
  ].filter(Boolean);

  void writeAuditLog(client, tenantId, userId, "tenant.activated", tenantId, {
    activatedAt: activatedAt.toISOString(),
    completedSteps,
  });

  return {
    success: true,
    data: {
      activated: true,
      activatedAt,
      progress: mapProgressRow(updatedRow),
    },
  };
}

// ─── Public service functions ─────────────────────────────────────────────────

/**
 * Get the current onboarding progress for a tenant.
 * RLS-scoped read: only the authenticated owner can access.
 */
export async function getOnboardingProgress(
  client: SupabaseClient,
  tenantId: string,
): Promise<ServiceResult<OnboardingProgressOutput>> {
  const { data, error } = await client
    .from("tenant_onboarding_progress")
    .select("*")
    .eq("tenant_id", tenantId)
    .single();

  if (error || !data) {
    return {
      success: false,
      error: error?.message ?? "Onboarding progress not found",
      code: "PROGRESS_NOT_FOUND",
    };
  }

  return { success: true, data: mapProgressRow(data as OnboardingProgressRow) };
}

/**
 * Initialize onboarding progress for a tenant.
 * Idempotent — safe to call on every owner login.
 * Emits `tenant_onboarding.started` on first creation only.
 */
export async function initOnboardingProgress(
  client: SupabaseClient,
  tenantId: string,
  ownerId: string,
): Promise<ServiceResult<OnboardingProgressOutput>> {
  // ON CONFLICT (tenant_id) DO NOTHING — ignoreDuplicates skips on conflict
  const { data: inserted, error: upsertError } = await client
    .from("tenant_onboarding_progress")
    .upsert(
      { tenant_id: tenantId, state: "not_started" },
      { onConflict: "tenant_id", ignoreDuplicates: true },
    )
    .select()
    .maybeSingle();

  if (upsertError) {
    return { success: false, error: upsertError.message, code: "INIT_FAILED" };
  }

  const isFirstInsert = inserted !== null;

  if (isFirstInsert) {
    // Emit started only on genuine first creation
    void writeAuditLog(client, tenantId, ownerId, "tenant_onboarding.started", tenantId, {
      ownerId,
    });
    return { success: true, data: mapProgressRow(inserted as OnboardingProgressRow) };
  }

  // Conflict: row already exists — fetch the current state
  const { data: existing, error: selectError } = await client
    .from("tenant_onboarding_progress")
    .select("*")
    .eq("tenant_id", tenantId)
    .single();

  if (selectError || !existing) {
    return {
      success: false,
      error: selectError?.message ?? "Failed to fetch onboarding progress",
      code: "FETCH_FAILED",
    };
  }

  return { success: true, data: mapProgressRow(existing as OnboardingProgressRow) };
}

/**
 * Complete the baseline step (workspace name + locale).
 * Reuses updateWorkspaceProfile and updateWorkspaceRegional from workspace-settings-service.
 * Calls evaluateActivation after — baseline alone does not activate.
 *
 * @param client - Authenticated (owner) Supabase client
 * @param adminClient - Service-role client (required by workspace-settings writes)
 */
export async function completeBaselineStep(
  client: SupabaseClient,
  adminClient: SupabaseClient,
  tenantId: string,
  userId: string,
  role: string,
  input: CompleteBaselineStepDto,
): Promise<ServiceResult<ActivationResult>> {
  // Fetch current timezone so updateWorkspaceRegional doesn't reset it
  const { data: tenantData, error: tenantError } = await adminClient
    .from("tenants")
    .select("timezone")
    .eq("id", tenantId)
    .single();

  if (tenantError || !tenantData) {
    return {
      success: false,
      error: tenantError?.message ?? "Workspace not found",
      code: "WORKSPACE_NOT_FOUND",
    };
  }

  const timezone = (tenantData as Record<string, unknown>)["timezone"] as string;

  // Delegate name update to workspace-settings-service (reuse audited, RLS-correct path)
  const profileResult = await updateWorkspaceProfile(adminClient, tenantId, userId, role, {
    name: input.name,
  });
  if (!profileResult.success) {
    return profileResult;
  }

  // Delegate locale update (preserve existing timezone)
  const regionalResult = await updateWorkspaceRegional(adminClient, tenantId, userId, role, {
    timezone,
    locale: input.locale,
  });
  if (!regionalResult.success) {
    return regionalResult;
  }

  // Mark baseline step complete on the progress row
  const now = new Date();
  const { data, error } = await client
    .from("tenant_onboarding_progress")
    .update({
      baseline_completed_at: now.toISOString(),
      state: "in_progress",
      updated_at: now.toISOString(),
    })
    .eq("tenant_id", tenantId)
    .select()
    .single();

  if (error || !data) {
    return {
      success: false,
      error: error?.message ?? "Failed to mark baseline step complete",
      code: "UPDATE_FAILED",
    };
  }

  void writeAuditLog(client, tenantId, userId, "tenant_onboarding.step_completed", tenantId, {
    step: "baseline",
    completedAt: now.toISOString(),
  });

  // Evaluate activation — baseline alone is not enough, needs a value step too
  return evaluateActivation(client, tenantId, userId);
}

/**
 * Mark a non-baseline step complete (first-invite | sample-data).
 * Does NOT create invitations — reuse inviteMemberAction at the action/UI layer.
 * Calls evaluateActivation after completion.
 */
export async function completeOnboardingStep(
  client: SupabaseClient,
  tenantId: string,
  userId: string,
  step: "first-invite" | "sample-data",
): Promise<ServiceResult<ActivationResult>> {
  const columnName =
    step === "first-invite" ? "first_invite_completed_at" : "sample_data_completed_at";
  const now = new Date();

  const { data, error } = await client
    .from("tenant_onboarding_progress")
    .update({
      [columnName]: now.toISOString(),
      updated_at: now.toISOString(),
    })
    .eq("tenant_id", tenantId)
    .select()
    .single();

  if (error || !data) {
    return {
      success: false,
      error: error?.message ?? "Failed to complete onboarding step",
      code: "UPDATE_FAILED",
    };
  }

  void writeAuditLog(client, tenantId, userId, "tenant_onboarding.step_completed", tenantId, {
    step,
    completedAt: now.toISOString(),
  });

  return evaluateActivation(client, tenantId, userId);
}

/**
 * Seed starter sample data and mark the sample-data step complete.
 * Idempotent — re-runs do not duplicate records or re-emit the seeded event.
 */
export async function seedSampleData(
  client: SupabaseClient,
  tenantId: string,
  userId: string,
): Promise<ServiceResult<ActivationResult>> {
  // Load current row to check idempotency
  const { data: progressData, error: progressError } = await client
    .from("tenant_onboarding_progress")
    .select("*")
    .eq("tenant_id", tenantId)
    .single();

  if (progressError || !progressData) {
    return {
      success: false,
      error: progressError?.message ?? "Onboarding progress not found",
      code: "PROGRESS_NOT_FOUND",
    };
  }

  const row = progressData as OnboardingProgressRow;
  const alreadySeeded = row.sample_data_completed_at !== null;

  if (!alreadySeeded) {
    // TODO Phase 6: insert idempotent starter resource rows tagged as demo data
    // For now, mark the step and emit the event

    const now = new Date();
    const { error: updateError } = await client
      .from("tenant_onboarding_progress")
      .update({
        sample_data_completed_at: now.toISOString(),
        updated_at: now.toISOString(),
      })
      .eq("tenant_id", tenantId);

    if (updateError) {
      return { success: false, error: updateError.message, code: "UPDATE_FAILED" };
    }

    void writeAuditLog(client, tenantId, userId, "tenant_onboarding.sample_data_seeded", tenantId, {
      seededAt: now.toISOString(),
    });
  }

  return evaluateActivation(client, tenantId, userId);
}

/**
 * Dismiss the onboarding checklist.
 * Sets dismissed=true and records dismissed_at.
 * Emits tenant_onboarding.dismissed audit event.
 */
export async function dismissChecklist(
  client: SupabaseClient,
  tenantId: string,
  userId: string,
): Promise<ServiceResult<OnboardingProgressOutput>> {
  const now = new Date();
  const { data, error } = await client
    .from("tenant_onboarding_progress")
    .update({
      dismissed: true,
      dismissed_at: now.toISOString(),
      updated_at: now.toISOString(),
    })
    .eq("tenant_id", tenantId)
    .select()
    .single();

  if (error || !data) {
    return {
      success: false,
      error: error?.message ?? "Failed to dismiss checklist",
      code: "UPDATE_FAILED",
    };
  }

  void writeAuditLog(client, tenantId, userId, "tenant_onboarding.dismissed", tenantId, {
    dismissedAt: now.toISOString(),
  });

  return { success: true, data: mapProgressRow(data as OnboardingProgressRow) };
}

/**
 * Resume a previously dismissed checklist.
 * Clears dismissed flag and dismissed_at.
 */
export async function resumeChecklist(
  client: SupabaseClient,
  tenantId: string,
  userId: string,
): Promise<ServiceResult<OnboardingProgressOutput>> {
  const now = new Date();
  const { data, error } = await client
    .from("tenant_onboarding_progress")
    .update({
      dismissed: false,
      dismissed_at: null,
      updated_at: now.toISOString(),
    })
    .eq("tenant_id", tenantId)
    .select()
    .single();

  if (error || !data) {
    return {
      success: false,
      error: error?.message ?? "Failed to resume checklist",
      code: "UPDATE_FAILED",
    };
  }

  return { success: true, data: mapProgressRow(data as OnboardingProgressRow) };
}
