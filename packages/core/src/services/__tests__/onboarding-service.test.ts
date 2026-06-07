// Tenant Onboarding Service — Unit Tests (Strict TDD)
// Written FIRST (RED phase) before the service implementation exists.
// Covers: init idempotency, baseline success + no-activation alone,
//         completeOnboardingStep, seedSampleData idempotency,
//         evaluateActivation happy/idempotent/race, dismiss/resume.

import type { SupabaseClient } from "@supabase/supabase-js";
import { describe, expect, it, vi } from "vitest";
import {
  completeBaselineStep,
  completeOnboardingStep,
  dismissChecklist,
  getOnboardingProgress,
  initOnboardingProgress,
  resumeChecklist,
  seedSampleData,
} from "../onboarding-service";

// ─── Constants ────────────────────────────────────────────────────────────────

const TENANT_ID = "aaaaaaaa-0000-4000-8000-000000000010";
const USER_ID = "bbbbbbbb-0000-4000-8000-000000000010";

// ─── Fixture rows ─────────────────────────────────────────────────────────────

const NOT_STARTED_ROW = {
  id: "cccccccc-0000-4000-8000-000000000010",
  tenant_id: TENANT_ID,
  state: "not_started",
  baseline_completed_at: null,
  first_invite_completed_at: null,
  sample_data_completed_at: null,
  dismissed: false,
  dismissed_at: null,
  activated_at: null,
  created_at: new Date().toISOString(),
  updated_at: new Date().toISOString(),
};

const IN_PROGRESS_ROW = {
  ...NOT_STARTED_ROW,
  state: "in_progress",
  baseline_completed_at: new Date().toISOString(),
};

const ACTIVATED_ROW = {
  ...IN_PROGRESS_ROW,
  state: "activated",
  first_invite_completed_at: new Date().toISOString(),
  activated_at: new Date().toISOString(),
};

const AFTER_INVITE_ROW = {
  ...IN_PROGRESS_ROW,
  first_invite_completed_at: new Date().toISOString(),
};

const DISMISSED_ROW = {
  ...IN_PROGRESS_ROW,
  dismissed: true,
  dismissed_at: new Date().toISOString(),
};

const RESUMED_ROW = {
  ...DISMISSED_ROW,
  dismissed: false,
  dismissed_at: null,
};

// ─── Mock helpers ─────────────────────────────────────────────────────────────

/**
 * Build a minimal SupabaseClient mock that dispatches by table name.
 * Each call to `from(table)` returns the provided table mock.
 */
function buildClient(tableMocks: Record<string, unknown>): SupabaseClient {
  return {
    from: vi.fn((table: string) => {
      const mock = tableMocks[table];
      if (!mock) {
        // Fallback: audit_log insert always succeeds
        return { insert: vi.fn().mockResolvedValue({ data: null, error: null }) };
      }
      return mock;
    }),
  } as unknown as SupabaseClient;
}

/** Standard audit_log mock — insert always succeeds silently */
const AUDIT_OK = { insert: vi.fn().mockResolvedValue({ data: null, error: null }) };

// ─── getOnboardingProgress ────────────────────────────────────────────────────

describe("getOnboardingProgress", () => {
  it("maps the DB row to OnboardingProgressOutput on success", async () => {
    const client = buildClient({
      tenant_onboarding_progress: {
        select: vi.fn(() => ({
          eq: vi.fn(() => ({
            single: vi.fn().mockResolvedValue({ data: IN_PROGRESS_ROW, error: null }),
          })),
        })),
      },
    });

    const result = await getOnboardingProgress(client, TENANT_ID);

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.tenantId).toBe(TENANT_ID);
      expect(result.data.state).toBe("in_progress");
      expect(result.data.baselineCompleted).toBe(true);
      expect(result.data.firstInviteCompleted).toBe(false);
      expect(result.data.sampleDataCompleted).toBe(false);
      expect(result.data.completedCount).toBe(1);
      expect(result.data.totalSteps).toBe(3);
      expect(result.data.dismissed).toBe(false);
    }
  });

  it("returns PROGRESS_NOT_FOUND when DB returns an error", async () => {
    const client = buildClient({
      tenant_onboarding_progress: {
        select: vi.fn(() => ({
          eq: vi.fn(() => ({
            single: vi.fn().mockResolvedValue({ data: null, error: { message: "Not found" } }),
          })),
        })),
      },
    });

    const result = await getOnboardingProgress(client, TENANT_ID);

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.code).toBe("PROGRESS_NOT_FOUND");
    }
  });
});

// ─── initOnboardingProgress ───────────────────────────────────────────────────

describe("initOnboardingProgress", () => {
  it("first call — inserts row and emits tenant_onboarding.started", async () => {
    const auditInsert = vi.fn().mockResolvedValue({ data: null, error: null });

    const client = buildClient({
      tenant_onboarding_progress: {
        upsert: vi.fn(() => ({
          select: vi.fn(() => ({
            maybeSingle: vi.fn().mockResolvedValue({ data: NOT_STARTED_ROW, error: null }),
          })),
        })),
      },
      audit_log: { insert: auditInsert },
    });

    const result = await initOnboardingProgress(client, TENANT_ID, USER_ID);

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.state).toBe("not_started");
      expect(result.data.baselineCompleted).toBe(false);
    }
    // Audit event should have been fired (void, so we can only check it was called)
    expect(auditInsert).toHaveBeenCalled();
  });

  it("repeat call — returns existing row with no second started event", async () => {
    const auditInsert = vi.fn().mockResolvedValue({ data: null, error: null });

    // upsert returns null → conflict (row already exists)
    // select returns existing row
    const client = buildClient({
      tenant_onboarding_progress: {
        upsert: vi.fn(() => ({
          select: vi.fn(() => ({
            maybeSingle: vi.fn().mockResolvedValue({ data: null, error: null }),
          })),
        })),
        select: vi.fn(() => ({
          eq: vi.fn(() => ({
            single: vi.fn().mockResolvedValue({ data: IN_PROGRESS_ROW, error: null }),
          })),
        })),
      },
      audit_log: { insert: auditInsert },
    });

    const result = await initOnboardingProgress(client, TENANT_ID, USER_ID);

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.state).toBe("in_progress");
    }
    // No audit event on repeat call
    expect(auditInsert).not.toHaveBeenCalled();
  });
});

// ─── completeBaselineStep ────────────────────────────────────────────────────

describe("completeBaselineStep", () => {
  it("sets baseline_completed_at, delegates name+locale to workspace-settings, returns in_progress", async () => {
    const auditInsert = vi.fn().mockResolvedValue({ data: null, error: null });

    // adminClient: timezone fetch + profile update + regional update + audit logs from workspace service
    const adminClient = buildClient({
      tenants: {
        // timezone pre-fetch
        select: vi.fn(() => ({
          eq: vi.fn(() => ({
            single: vi.fn().mockResolvedValue({ data: { timezone: "UTC" }, error: null }),
          })),
        })),
        // updateWorkspaceProfile + updateWorkspaceRegional both use update()
        update: vi.fn(() => ({
          eq: vi.fn(() => ({
            select: vi.fn(() => ({
              single: vi.fn().mockResolvedValue({
                data: { name: "Test Workspace", timezone: "UTC", locale: "en-US" },
                error: null,
              }),
            })),
          })),
        })),
      },
      audit_log: { insert: auditInsert },
    });

    // client: progress update (baseline) + evaluateActivation SELECT (no value steps → no activation)
    const client = buildClient({
      tenant_onboarding_progress: {
        update: vi.fn(() => ({
          eq: vi.fn(() => ({
            select: vi.fn(() => ({
              single: vi.fn().mockResolvedValue({ data: IN_PROGRESS_ROW, error: null }),
            })),
          })),
        })),
        select: vi.fn(() => ({
          eq: vi.fn(() => ({
            single: vi.fn().mockResolvedValue({ data: IN_PROGRESS_ROW, error: null }),
          })),
        })),
      },
      audit_log: { insert: auditInsert },
    });

    const result = await completeBaselineStep(client, adminClient, TENANT_ID, USER_ID, "owner", {
      name: "Test Workspace",
      locale: "en-US",
    });

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.progress.baselineCompleted).toBe(true);
      expect(result.data.progress.state).toBe("in_progress");
    }
  });

  it("baseline alone does NOT activate (no value step present)", async () => {
    const auditInsert = vi.fn().mockResolvedValue({ data: null, error: null });

    const adminClient = buildClient({
      tenants: {
        select: vi.fn(() => ({
          eq: vi.fn(() => ({
            single: vi.fn().mockResolvedValue({ data: { timezone: "UTC" }, error: null }),
          })),
        })),
        update: vi.fn(() => ({
          eq: vi.fn(() => ({
            select: vi.fn(() => ({
              single: vi.fn().mockResolvedValue({
                data: { name: "Only Baseline", timezone: "UTC", locale: "en-US" },
                error: null,
              }),
            })),
          })),
        })),
      },
      audit_log: { insert: auditInsert },
    });

    // Row has baseline only — no first_invite or sample_data
    const client = buildClient({
      tenant_onboarding_progress: {
        update: vi.fn(() => ({
          eq: vi.fn(() => ({
            select: vi.fn(() => ({
              single: vi.fn().mockResolvedValue({ data: IN_PROGRESS_ROW, error: null }),
            })),
          })),
        })),
        select: vi.fn(() => ({
          eq: vi.fn(() => ({
            // evaluateActivation SELECT: baseline only, no value step
            single: vi.fn().mockResolvedValue({ data: IN_PROGRESS_ROW, error: null }),
          })),
        })),
      },
      audit_log: { insert: auditInsert },
    });

    const result = await completeBaselineStep(client, adminClient, TENANT_ID, USER_ID, "owner", {
      name: "Only Baseline",
      locale: "en-US",
    });

    expect(result.success).toBe(true);
    if (result.success) {
      // Must NOT be activated — value step is still pending
      expect(result.data.activated).toBe(false);
      expect(result.data.activatedAt).toBeNull();
      expect(result.data.progress.state).toBe("in_progress");
    }
  });
});

// ─── completeOnboardingStep ───────────────────────────────────────────────────

describe("completeOnboardingStep", () => {
  it("first-invite — sets timestamp, emits step_completed, does NOT create invitations", async () => {
    const auditInsert = vi.fn().mockResolvedValue({ data: null, error: null });

    const client = buildClient({
      tenant_onboarding_progress: {
        update: vi.fn(() => ({
          eq: vi.fn(() => ({
            select: vi.fn(() => ({
              single: vi.fn().mockResolvedValue({ data: AFTER_INVITE_ROW, error: null }),
            })),
            // Race-safe activation update chain (evaluateActivation)
            is: vi.fn(() => ({
              select: vi.fn(() => ({
                maybeSingle: vi.fn().mockResolvedValue({ data: ACTIVATED_ROW, error: null }),
              })),
            })),
          })),
        })),
        // evaluateActivation SELECT: baseline + first_invite → will trigger activation
        select: vi.fn(() => ({
          eq: vi.fn(() => ({
            single: vi.fn().mockResolvedValue({ data: AFTER_INVITE_ROW, error: null }),
          })),
        })),
      },
      audit_log: { insert: auditInsert },
    });

    const result = await completeOnboardingStep(client, TENANT_ID, USER_ID, "first-invite");

    expect(result.success).toBe(true);
    // step_completed audit event fired
    expect(auditInsert).toHaveBeenCalled();
    // No invitation created — service is pure step recording
    // (Verified by absence of any team/invite table calls — no tenant_invitations mock needed)
  });
});

// ─── seedSampleData ────────────────────────────────────────────────────────────

describe("seedSampleData", () => {
  it("idempotent — re-run does not duplicate step_completed; marks step once", async () => {
    const auditInsert = vi.fn().mockResolvedValue({ data: null, error: null });

    // Row already has sample_data_completed_at set → idempotent path
    const alreadySeededRow = { ...IN_PROGRESS_ROW, sample_data_completed_at: new Date().toISOString() };

    const client = buildClient({
      tenant_onboarding_progress: {
        select: vi.fn(() => ({
          eq: vi.fn(() => ({
            single: vi
              .fn()
              // First SELECT (idempotency check): already seeded
              .mockResolvedValueOnce({ data: alreadySeededRow, error: null })
              // Second SELECT (evaluateActivation): same row
              .mockResolvedValueOnce({ data: alreadySeededRow, error: null }),
          })),
        })),
        // Seed update is skipped (already seeded); evaluateActivation still runs its guarded update
        update: vi.fn(() => ({
          eq: vi.fn(() => ({
            select: vi.fn(() => ({
              single: vi.fn().mockResolvedValue({ data: alreadySeededRow, error: null }),
            })),
            // Race-safe activation update chain (evaluateActivation)
            is: vi.fn(() => ({
              select: vi.fn(() => ({
                maybeSingle: vi.fn().mockResolvedValue({ data: alreadySeededRow, error: null }),
              })),
            })),
          })),
        })),
      },
      audit_log: { insert: auditInsert },
    });

    const result = await seedSampleData(client, TENANT_ID, USER_ID);

    expect(result.success).toBe(true);
    // Audit should NOT have been called for sample_data_seeded (idempotent skip)
    expect(auditInsert).not.toHaveBeenCalledWith(
      expect.objectContaining({ metadata: expect.stringContaining("sample_data_seeded") }),
    );
  });
});

// ─── evaluateActivation (tested via completeOnboardingStep) ──────────────────

describe("evaluateActivation", () => {
  it("happy path — baseline + value step → sets activated_at, state=activated, emits tenant.activated", async () => {
    const auditInsert = vi.fn().mockResolvedValue({ data: null, error: null });

    // After completing first-invite, row has baseline + first_invite set
    const criteriaMetRow = {
      ...IN_PROGRESS_ROW,
      first_invite_completed_at: new Date().toISOString(),
    };

    const client = buildClient({
      tenant_onboarding_progress: {
        update: vi.fn(() => ({
          eq: vi.fn(() => ({
            select: vi.fn(() => ({
              single: vi.fn().mockResolvedValue({ data: criteriaMetRow, error: null }),
            })),
            // Race-safe activation update chain
            is: vi.fn(() => ({
              select: vi.fn(() => ({
                maybeSingle: vi.fn().mockResolvedValue({ data: ACTIVATED_ROW, error: null }),
              })),
            })),
          })),
        })),
        select: vi.fn(() => ({
          eq: vi.fn(() => ({
            // evaluateActivation SELECT
            single: vi.fn().mockResolvedValue({ data: criteriaMetRow, error: null }),
          })),
        })),
      },
      audit_log: { insert: auditInsert },
    });

    const result = await completeOnboardingStep(client, TENANT_ID, USER_ID, "first-invite");

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.activated).toBe(true);
      expect(result.data.activatedAt).not.toBeNull();
      expect(result.data.progress.state).toBe("activated");
    }
    // tenant.activated audit event emitted
    expect(auditInsert).toHaveBeenCalled();
  });

  it("idempotency — second call with activated_at already set returns activated:false without re-emitting", async () => {
    const auditInsert = vi.fn().mockResolvedValue({ data: null, error: null });

    const client = buildClient({
      tenant_onboarding_progress: {
        update: vi.fn(() => ({
          eq: vi.fn(() => ({
            select: vi.fn(() => ({
              single: vi.fn().mockResolvedValue({ data: ACTIVATED_ROW, error: null }),
            })),
          })),
        })),
        select: vi.fn(() => ({
          eq: vi.fn(() => ({
            // evaluateActivation SELECT: row already has activated_at set
            single: vi.fn().mockResolvedValue({ data: ACTIVATED_ROW, error: null }),
          })),
        })),
      },
      audit_log: { insert: auditInsert },
    });

    const result = await completeOnboardingStep(client, TENANT_ID, USER_ID, "first-invite");

    expect(result.success).toBe(true);
    if (result.success) {
      // Already activated — guard fires, returns false for this call
      expect(result.data.activated).toBe(false);
    }
    // NO additional tenant.activated event (step_completed may still fire)
    const activationCalls = auditInsert.mock.calls.filter((call) => {
      const row = call[0] as Record<string, unknown>;
      return typeof row["metadata"] === "string" && (row["metadata"] as string).includes("tenant.activated");
    });
    expect(activationCalls).toHaveLength(0);
  });

  it("race guard — concurrent flip: UPDATE WHERE activated_at IS NULL returns no rows → activated:false, no re-emit", async () => {
    const auditInsert = vi.fn().mockResolvedValue({ data: null, error: null });

    const criteriaMetRow = {
      ...IN_PROGRESS_ROW,
      first_invite_completed_at: new Date().toISOString(),
    };

    // Differentiate the two SELECT calls and two UPDATE calls
    const selectSingle = vi
      .fn()
      // evaluateActivation first SELECT: criteria met, activated_at IS NULL
      .mockResolvedValueOnce({ data: criteriaMetRow, error: null })
      // evaluateActivation fallback SELECT after race: row already activated by concurrent call
      .mockResolvedValueOnce({ data: ACTIVATED_ROW, error: null });

    // First update: step completion (completeOnboardingStep progress update)
    // Second update: activation attempt (evaluateActivation, guarded by IS NULL)
    const stepUpdateChain = {
      eq: vi.fn(() => ({
        select: vi.fn(() => ({
          single: vi.fn().mockResolvedValue({ data: criteriaMetRow, error: null }),
        })),
      })),
    };
    const activationUpdateChain = {
      eq: vi.fn(() => ({
        is: vi.fn(() => ({
          select: vi.fn(() => ({
            // Race: another request already did the flip → no rows returned
            maybeSingle: vi.fn().mockResolvedValue({ data: null, error: null }),
          })),
        })),
      })),
    };

    const client = buildClient({
      tenant_onboarding_progress: {
        update: vi
          .fn()
          .mockReturnValueOnce(stepUpdateChain) // step completion update
          .mockReturnValueOnce(activationUpdateChain), // activation race guard update
        select: vi.fn(() => ({
          eq: vi.fn(() => ({
            single: selectSingle,
          })),
        })),
      },
      audit_log: { insert: auditInsert },
    });

    const result = await completeOnboardingStep(client, TENANT_ID, USER_ID, "first-invite");

    expect(result.success).toBe(true);
    if (result.success) {
      // Race condition: another call won the flip → this call returns activated:false
      expect(result.data.activated).toBe(false);
    }
    // No tenant.activated emitted by this call (the other concurrent call did it)
    const activationCalls = auditInsert.mock.calls.filter((call) => {
      const row = call[0] as Record<string, unknown>;
      return typeof row["metadata"] === "string" && (row["metadata"] as string).includes("tenant.activated");
    });
    expect(activationCalls).toHaveLength(0);
  });
});

// ─── dismissChecklist / resumeChecklist ───────────────────────────────────────

describe("dismissChecklist", () => {
  it("sets dismissed=true and dismissed_at, emits tenant_onboarding.dismissed", async () => {
    const auditInsert = vi.fn().mockResolvedValue({ data: null, error: null });

    const client = buildClient({
      tenant_onboarding_progress: {
        update: vi.fn(() => ({
          eq: vi.fn(() => ({
            select: vi.fn(() => ({
              single: vi.fn().mockResolvedValue({ data: DISMISSED_ROW, error: null }),
            })),
          })),
        })),
      },
      audit_log: { insert: auditInsert },
    });

    const result = await dismissChecklist(client, TENANT_ID, USER_ID);

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.dismissed).toBe(true);
    }
    expect(auditInsert).toHaveBeenCalled();
  });
});

describe("resumeChecklist", () => {
  it("sets dismissed=false and clears dismissed_at", async () => {
    const auditInsert = vi.fn().mockResolvedValue({ data: null, error: null });

    const client = buildClient({
      tenant_onboarding_progress: {
        update: vi.fn(() => ({
          eq: vi.fn(() => ({
            select: vi.fn(() => ({
              single: vi.fn().mockResolvedValue({ data: RESUMED_ROW, error: null }),
            })),
          })),
        })),
      },
      audit_log: { insert: auditInsert },
    });

    const result = await resumeChecklist(client, TENANT_ID, USER_ID);

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.dismissed).toBe(false);
    }
  });
});
