import { redirect } from "next/navigation";
import { requireAuth } from "@/features/auth/queries";
import { OnboardingChecklist } from "@/features/onboarding/components/onboarding-checklist";
import { fetchInitOnboardingProgress } from "@/features/onboarding/queries";
import { ROUTES } from "@/lib/routes";

export const metadata = { title: "Get started" };

export default async function OnboardingPage() {
  const user = await requireAuth();

  // Non-owners are redirected — defense in depth (RLS is the real boundary)
  if (user.role !== "owner") {
    redirect(ROUTES.dashboard);
  }

  // Idempotent init: creates the row on first visit, returns existing on subsequent visits.
  // Emits tenant_onboarding.started only on first call.
  const progress = await fetchInitOnboardingProgress();

  return (
    <div className="mx-auto max-w-2xl">
      <OnboardingChecklist progress={progress} />
    </div>
  );
}
