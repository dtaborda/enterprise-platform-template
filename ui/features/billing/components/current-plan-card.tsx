"use client";

import type { SubscriptionWithPlan } from "@enterprise/core/services/billing-service";
import { Badge } from "@enterprise/ui/components/badge";
import { Button } from "@enterprise/ui/components/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@enterprise/ui/components/card";
import { useRouter } from "next/navigation";
import { useActionState, useEffect, useState } from "react";
import { getPortalUrlAction, resumeSubscriptionAction } from "@/features/billing/actions";
import { CancelSubscriptionDialog } from "./cancel-subscription-dialog";
import { SubscriptionStatusBadge } from "./subscription-status-badge";

interface CurrentPlanCardProps {
  subscription: SubscriptionWithPlan | null;
  role: string;
}

export function CurrentPlanCard({ subscription, role }: CurrentPlanCardProps) {
  const router = useRouter();
  const isOwner = role === "owner";
  const [cancelDialogOpen, setCancelDialogOpen] = useState(false);
  const [portalLoading, setPortalLoading] = useState(false);
  const [resumeState, resumeFormAction, isResumePending] = useActionState(
    resumeSubscriptionAction,
    null,
  );

  useEffect(() => {
    if (resumeState?.success) {
      router.refresh();
    }
  }, [resumeState, router]);

  async function handlePortalClick() {
    setPortalLoading(true);
    try {
      const result = await getPortalUrlAction();
      if (result.success && result.data) {
        window.open(result.data.url, "_blank", "noopener,noreferrer");
      }
    } finally {
      setPortalLoading(false);
    }
  }

  function handleCancelSuccess() {
    router.refresh();
  }

  if (!subscription) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Current plan</CardTitle>
          <CardDescription>No active subscription found.</CardDescription>
        </CardHeader>
      </Card>
    );
  }

  const plan = subscription.plan;
  const isCancelPending = subscription.cancelAtPeriodEnd;
  const isActive = subscription.status === "active" || subscription.status === "trialing";
  const isCanceled = subscription.status === "canceled";

  const priceDisplay =
    subscription.billingCycle === "yearly"
      ? `$${(plan.priceYearly / 100).toFixed(0)}/yr`
      : `$${(plan.priceMonthly / 100).toFixed(0)}/mo`;

  const renewalDate = new Date(subscription.currentPeriodEnd).toLocaleDateString(undefined, {
    year: "numeric",
    month: "long",
    day: "numeric",
  });

  return (
    <>
      <Card>
        <CardHeader>
          <div className="flex items-start justify-between gap-4">
            <div>
              <CardTitle className="flex items-center gap-2">
                {plan.name}
                <SubscriptionStatusBadge status={subscription.status} />
                {isCancelPending && <Badge variant="warning">Cancels at period end</Badge>}
              </CardTitle>
              <CardDescription className="mt-1">{plan.description}</CardDescription>
            </div>
            <div className="text-right">
              <p className="text-2xl font-bold">
                {plan.priceMonthly === 0 ? "Free" : priceDisplay}
              </p>
            </div>
          </div>
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          <div className="flex flex-wrap gap-6 text-sm text-muted-foreground">
            <span>
              Billing cycle:{" "}
              <span className="capitalize text-foreground">{subscription.billingCycle}</span>
            </span>
            {!isCanceled && (
              <span>
                {isCancelPending ? "Access until" : "Renews on"}:{" "}
                <span className="text-foreground">{renewalDate}</span>
              </span>
            )}
            {isCanceled && subscription.canceledAt && (
              <span>
                Canceled on:{" "}
                <span className="text-foreground">
                  {new Date(subscription.canceledAt).toLocaleDateString()}
                </span>
              </span>
            )}
          </div>

          {isOwner && (
            <div className="flex flex-wrap gap-2">
              {isActive && !isCanceled && (
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={handlePortalClick}
                  disabled={portalLoading}
                >
                  {portalLoading ? "Loading…" : "Manage payment method"}
                </Button>
              )}

              {isActive && !isCancelPending && !isCanceled && (
                <Button
                  type="button"
                  variant="destructive-ghost"
                  size="sm"
                  onClick={() => setCancelDialogOpen(true)}
                >
                  Cancel subscription
                </Button>
              )}

              {isCancelPending && (
                <form action={resumeFormAction}>
                  <Button type="submit" variant="outline" size="sm" disabled={isResumePending}>
                    {isResumePending ? "Resuming…" : "Resume subscription"}
                  </Button>
                </form>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {isOwner && (
        <CancelSubscriptionDialog
          open={cancelDialogOpen}
          accessUntil={subscription.currentPeriodEnd}
          onOpenChange={setCancelDialogOpen}
          onSuccess={handleCancelSuccess}
        />
      )}
    </>
  );
}
