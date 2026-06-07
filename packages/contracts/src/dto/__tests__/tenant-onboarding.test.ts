import { describe, expect, it } from "vitest";
import {
  activationResultSchema,
  completeBaselineStepSchema,
  completeOnboardingStepSchema,
  ONBOARDING_STATE,
  ONBOARDING_STEP,
  onboardingProgressOutputSchema,
  onboardingStateSchema,
  onboardingStepSchema,
} from "../tenant-onboarding";

// ============================================================================
// RED phase: tests written before implementation exists
// ============================================================================

describe("ONBOARDING_STATE", () => {
  it("has the expected values", () => {
    expect(ONBOARDING_STATE.NOT_STARTED).toBe("not_started");
    expect(ONBOARDING_STATE.IN_PROGRESS).toBe("in_progress");
    expect(ONBOARDING_STATE.ACTIVATED).toBe("activated");
  });
});

describe("ONBOARDING_STEP", () => {
  it("has the expected values", () => {
    expect(ONBOARDING_STEP.BASELINE).toBe("baseline");
    expect(ONBOARDING_STEP.FIRST_INVITE).toBe("first-invite");
    expect(ONBOARDING_STEP.SAMPLE_DATA).toBe("sample-data");
  });
});

describe("onboardingStateSchema", () => {
  it("accepts not_started", () => {
    expect(onboardingStateSchema.parse("not_started")).toBe("not_started");
  });

  it("accepts in_progress", () => {
    expect(onboardingStateSchema.parse("in_progress")).toBe("in_progress");
  });

  it("accepts activated", () => {
    expect(onboardingStateSchema.parse("activated")).toBe("activated");
  });

  it("rejects unknown state", () => {
    expect(() => onboardingStateSchema.parse("completed")).toThrow();
  });
});

describe("onboardingStepSchema", () => {
  it("accepts baseline", () => {
    expect(onboardingStepSchema.parse("baseline")).toBe("baseline");
  });

  it("accepts first-invite", () => {
    expect(onboardingStepSchema.parse("first-invite")).toBe("first-invite");
  });

  it("accepts sample-data", () => {
    expect(onboardingStepSchema.parse("sample-data")).toBe("sample-data");
  });

  it("rejects unknown step", () => {
    expect(() => onboardingStepSchema.parse("unknown")).toThrow();
  });
});

describe("completeBaselineStepSchema", () => {
  it("accepts valid name and locale", () => {
    expect(completeBaselineStepSchema.parse({ name: "Acme Corp", locale: "en-US" })).toEqual({
      name: "Acme Corp",
      locale: "en-US",
    });
  });

  it("accepts name at minimum boundary (2 chars)", () => {
    expect(completeBaselineStepSchema.parse({ name: "AB", locale: "en" })).toMatchObject({
      name: "AB",
    });
  });

  it("accepts name at maximum boundary (100 chars)", () => {
    const longName = "A".repeat(100);
    expect(completeBaselineStepSchema.parse({ name: longName, locale: "en-US" })).toMatchObject({
      name: longName,
    });
  });

  it("rejects name shorter than 2 chars", () => {
    expect(() => completeBaselineStepSchema.parse({ name: "A", locale: "en-US" })).toThrow();
  });

  it("rejects name longer than 100 chars", () => {
    expect(() =>
      completeBaselineStepSchema.parse({ name: "A".repeat(101), locale: "en-US" }),
    ).toThrow();
  });

  it("rejects empty name", () => {
    expect(() => completeBaselineStepSchema.parse({ name: "", locale: "en-US" })).toThrow();
  });

  it("accepts locale at minimum boundary (2 chars, e.g. 'en')", () => {
    expect(completeBaselineStepSchema.parse({ name: "Acme", locale: "en" })).toMatchObject({
      locale: "en",
    });
  });

  it("accepts locale at maximum boundary (35 chars)", () => {
    const longLocale = "a".repeat(35);
    expect(completeBaselineStepSchema.parse({ name: "Acme", locale: longLocale })).toMatchObject({
      locale: longLocale,
    });
  });

  it("rejects locale shorter than 2 chars", () => {
    expect(() => completeBaselineStepSchema.parse({ name: "Acme", locale: "e" })).toThrow();
  });

  it("rejects locale longer than 35 chars", () => {
    expect(() =>
      completeBaselineStepSchema.parse({ name: "Acme", locale: "a".repeat(36) }),
    ).toThrow();
  });

  it("rejects missing name", () => {
    expect(() => completeBaselineStepSchema.parse({ locale: "en-US" })).toThrow();
  });

  it("rejects missing locale", () => {
    expect(() => completeBaselineStepSchema.parse({ name: "Acme Corp" })).toThrow();
  });
});

describe("completeOnboardingStepSchema", () => {
  it("accepts first-invite step", () => {
    expect(completeOnboardingStepSchema.parse({ step: "first-invite" })).toEqual({
      step: "first-invite",
    });
  });

  it("accepts sample-data step", () => {
    expect(completeOnboardingStepSchema.parse({ step: "sample-data" })).toEqual({
      step: "sample-data",
    });
  });

  it("rejects baseline step (baseline is handled by its own schema)", () => {
    expect(() => completeOnboardingStepSchema.parse({ step: "baseline" })).toThrow();
  });

  it("rejects unknown step", () => {
    expect(() => completeOnboardingStepSchema.parse({ step: "other" })).toThrow();
  });

  it("rejects missing step", () => {
    expect(() => completeOnboardingStepSchema.parse({})).toThrow();
  });
});

describe("onboardingProgressOutputSchema", () => {
  const validTenantId = "a1b2c3d4-e5f6-7890-abcd-ef1234567890";

  const validProgress = {
    tenantId: validTenantId,
    state: "not_started" as const,
    baselineCompleted: false,
    firstInviteCompleted: false,
    sampleDataCompleted: false,
    dismissed: false,
    activatedAt: null,
    completedCount: 0,
    totalSteps: 3,
  };

  it("accepts a complete valid progress record", () => {
    expect(onboardingProgressOutputSchema.parse(validProgress)).toMatchObject({
      tenantId: validTenantId,
      state: "not_started",
      completedCount: 0,
      totalSteps: 3,
    });
  });

  it("accepts null activatedAt", () => {
    expect(
      onboardingProgressOutputSchema.parse({ ...validProgress, activatedAt: null }),
    ).toMatchObject({ activatedAt: null });
  });

  it("accepts a Date for activatedAt", () => {
    const activatedAt = new Date("2026-06-01T10:00:00.000Z");
    expect(onboardingProgressOutputSchema.parse({ ...validProgress, activatedAt })).toMatchObject({
      activatedAt,
    });
  });

  it("accepts all states", () => {
    for (const state of ["not_started", "in_progress", "activated"] as const) {
      expect(onboardingProgressOutputSchema.parse({ ...validProgress, state })).toMatchObject({
        state,
      });
    }
  });

  it("accepts completedCount at 0 (minimum)", () => {
    expect(
      onboardingProgressOutputSchema.parse({ ...validProgress, completedCount: 0 }),
    ).toMatchObject({ completedCount: 0 });
  });

  it("rejects completedCount below 0", () => {
    expect(() =>
      onboardingProgressOutputSchema.parse({ ...validProgress, completedCount: -1 }),
    ).toThrow();
  });

  it("accepts totalSteps at 1 (minimum)", () => {
    expect(onboardingProgressOutputSchema.parse({ ...validProgress, totalSteps: 1 })).toMatchObject(
      { totalSteps: 1 },
    );
  });

  it("rejects totalSteps below 1", () => {
    expect(() =>
      onboardingProgressOutputSchema.parse({ ...validProgress, totalSteps: 0 }),
    ).toThrow();
  });

  it("rejects invalid state", () => {
    expect(() =>
      onboardingProgressOutputSchema.parse({ ...validProgress, state: "done" }),
    ).toThrow();
  });

  it("rejects invalid tenantId (not UUID)", () => {
    expect(() =>
      onboardingProgressOutputSchema.parse({ ...validProgress, tenantId: "not-a-uuid" }),
    ).toThrow();
  });

  it("rejects missing tenantId", () => {
    const { tenantId: _omitted, ...rest } = validProgress;
    expect(() => onboardingProgressOutputSchema.parse(rest)).toThrow();
  });
});

describe("activationResultSchema", () => {
  const validTenantId = "a1b2c3d4-e5f6-7890-abcd-ef1234567890";

  const validProgress = {
    tenantId: validTenantId,
    state: "activated" as const,
    baselineCompleted: true,
    firstInviteCompleted: true,
    sampleDataCompleted: false,
    dismissed: false,
    activatedAt: new Date("2026-06-01T10:00:00.000Z"),
    completedCount: 2,
    totalSteps: 3,
  };

  it("accepts a successful activation result", () => {
    expect(
      activationResultSchema.parse({
        activated: true,
        activatedAt: new Date("2026-06-01T10:00:00.000Z"),
        progress: validProgress,
      }),
    ).toMatchObject({ activated: true });
  });

  it("accepts activated:false with null activatedAt", () => {
    expect(
      activationResultSchema.parse({
        activated: false,
        activatedAt: null,
        progress: { ...validProgress, state: "in_progress", activatedAt: null },
      }),
    ).toMatchObject({ activated: false, activatedAt: null });
  });

  it("rejects missing activated field", () => {
    expect(() =>
      activationResultSchema.parse({
        activatedAt: null,
        progress: validProgress,
      }),
    ).toThrow();
  });

  it("rejects invalid progress sub-object", () => {
    expect(() =>
      activationResultSchema.parse({
        activated: true,
        activatedAt: null,
        progress: { tenantId: "bad" },
      }),
    ).toThrow();
  });
});
