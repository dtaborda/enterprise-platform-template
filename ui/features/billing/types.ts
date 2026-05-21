import type { BillingEventDto, PlanDto, SubscriptionDto } from "@enterprise/contracts";

// ─── Page Props ────────────────────────────────────────────────────────────────

export interface BillingPageProps {
  subscription: SubscriptionDto | null;
  plans: PlanDto[];
  history: BillingEventDto[];
}

// ─── Component Props ───────────────────────────────────────────────────────────

export interface PlanCardProps {
  plan: PlanDto;
  currentPlanId: string | null;
  isOwner: boolean;
}

export interface HistoryRowProps {
  event: BillingEventDto;
}
