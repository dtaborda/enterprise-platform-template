// Tenant Onboarding DTOs
// Schemas for onboarding progress, baseline setup, step completion, and activation result

import { z } from "zod";

// ============================================================================
// Enums
// ============================================================================

export const ONBOARDING_STATE = {
  NOT_STARTED: "not_started",
  IN_PROGRESS: "in_progress",
  ACTIVATED: "activated",
} as const;

export type OnboardingState = (typeof ONBOARDING_STATE)[keyof typeof ONBOARDING_STATE];

export const onboardingStateSchema = z.enum(["not_started", "in_progress", "activated"]);

export const ONBOARDING_STEP = {
  BASELINE: "baseline",
  FIRST_INVITE: "first-invite",
  SAMPLE_DATA: "sample-data",
} as const;

export type OnboardingStep = (typeof ONBOARDING_STEP)[keyof typeof ONBOARDING_STEP];

export const onboardingStepSchema = z.enum(["baseline", "first-invite", "sample-data"]);

// ============================================================================
// Input Schemas
// ============================================================================

/** Baseline workspace setup (name + locale) — mandatory step */
export const completeBaselineStepSchema = z.object({
  name: z.string().min(2).max(100),
  locale: z.string().min(2).max(35), // BCP-47, e.g. "en-US"
});

export type CompleteBaselineStepDto = z.infer<typeof completeBaselineStepSchema>;

/** Mark a non-baseline step complete (first-invite | sample-data only) */
export const completeOnboardingStepSchema = z.object({
  step: z.enum(["first-invite", "sample-data"]),
});

export type CompleteOnboardingStepDto = z.infer<typeof completeOnboardingStepSchema>;

// ============================================================================
// Output Schemas
// ============================================================================

/** Current onboarding progress for a tenant */
export const onboardingProgressOutputSchema = z.object({
  tenantId: z.string().uuid(),
  state: onboardingStateSchema,
  baselineCompleted: z.boolean(),
  firstInviteCompleted: z.boolean(),
  sampleDataCompleted: z.boolean(),
  dismissed: z.boolean(),
  activatedAt: z.date().nullable(),
  completedCount: z.number().int().min(0),
  totalSteps: z.number().int().min(1),
});

export type OnboardingProgressOutput = z.infer<typeof onboardingProgressOutputSchema>;

/** Result of a step completion that may trigger activation */
export const activationResultSchema = z.object({
  /** true only on the transition that emits the tenant.activated event */
  activated: z.boolean(),
  activatedAt: z.date().nullable(),
  progress: onboardingProgressOutputSchema,
});

export type ActivationResult = z.infer<typeof activationResultSchema>;
