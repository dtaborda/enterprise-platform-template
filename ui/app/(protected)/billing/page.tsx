import { PageHeader } from "@enterprise/ui/components/page-header";
import { redirect } from "next/navigation";
import { requireAuth } from "@/features/auth/queries";
import { BillingHistoryTable } from "@/features/billing/components/billing-history-table";
import { CurrentPlanCard } from "@/features/billing/components/current-plan-card";
import { PastDueBanner } from "@/features/billing/components/past-due-banner";
import { PlanComparison } from "@/features/billing/components/plan-comparison";
import {
  getBillingHistoryQuery,
  getSubscriptionQuery,
  listPlansQuery,
} from "@/features/billing/queries";
import { ROUTES } from "@/lib/routes";

export const metadata = { title: "Billing" };

export default async function BillingPage() {
  const user = await requireAuth();

  // Member and guest roles cannot access billing
  if (user.role !== "owner" && user.role !== "admin") {
    redirect(ROUTES.dashboard);
  }

  const [subscription, plans, history] = await Promise.all([
    getSubscriptionQuery(user.tenantId),
    listPlansQuery(),
    getBillingHistoryQuery(user.tenantId, { limit: 50, offset: 0 }),
  ]);

  return (
    <div className="flex flex-col gap-6">
      <PageHeader title="Billing" subtitle="Manage your subscription" />

      {subscription?.status === "past_due" && (
        <PastDueBanner graceEndsAt={subscription.graceEndsAt} />
      )}

      <CurrentPlanCard subscription={subscription} role={user.role} />

      {user.role === "owner" && (
        <PlanComparison plans={plans} subscription={subscription} role={user.role} />
      )}

      <BillingHistoryTable initialHistory={history} tenantId={user.tenantId} />
    </div>
  );
}
