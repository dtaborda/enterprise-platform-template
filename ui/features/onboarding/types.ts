// Feature-local view types for the onboarding checklist UI.
// Enriches service DTOs with display metadata consumed by onboarding components.

import type { OnboardingProgressOutput } from "@enterprise/contracts";

// ─── Step metadata ─────────────────────────────────────────────────────────────

export interface OnboardingStepMeta {
  id: string;
  label: string;
  description: string;
  completed: boolean;
  optional: boolean;
}

// ─── Enriched view state ───────────────────────────────────────────────────────

export interface OnboardingViewState extends OnboardingProgressOutput {
  steps: OnboardingStepMeta[];
  progressPercent: number;
  isActivated: boolean;
}
