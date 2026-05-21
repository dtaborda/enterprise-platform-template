"use client";

import type { PlanRecord, SubscriptionWithPlan } from "@enterprise/core/services/billing-service";
import { Badge } from "@enterprise/ui/components/badge";
import { Button } from "@enterprise/ui/components/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@enterprise/ui/components/card";
import { CheckIcon } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { ChangePlanDialog } from "./change-plan-dialog";

interface PlanComparisonProps {
  plans: PlanRecord[];
  subscription: SubscriptionWithPlan | null;
  role: string;
}

interface ParsedFeatures {
  [key: string]: boolean | string | number;
}

function parseFeatures(features: string): string[] {
  try {
    const parsed = JSON.parse(features) as ParsedFeatures;
    return Object.entries(parsed)
      .filter(([, value]) => value === true || typeof value === "string")
      .map(([key]) => key.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase()));
  } catch {
    return [];
  }
}

export function PlanComparison({ plans, subscription, role }: PlanComparisonProps) {
  const router = useRouter();
  const isOwner = role === "owner";
  const [selectedPlan, setSelectedPlan] = useState<PlanRecord | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);

  const currentPlanId = subscription?.planId ?? null;
  const currentPlan = plans.find((p) => p.id === currentPlanId) ?? null;
  const billingCycle = subscription?.billingCycle ?? "monthly";
  const isCanceled = subscription?.status === "canceled";

  function handlePlanClick(plan: PlanRecord) {
    setSelectedPlan(plan);
    setDialogOpen(true);
  }

  function handleSuccess() {
    router.refresh();
  }

  if (!isOwner) return null;

  return (
    <>
      <div className="flex flex-col gap-4">
        <div>
          <h2 className="text-lg font-semibold">Plans</h2>
          <p className="text-sm text-muted-foreground">Choose the plan that fits your needs.</p>
        </div>

        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {plans.map((plan) => {
            const isCurrent = plan.id === currentPlanId;
            const price = billingCycle === "yearly" ? plan.priceYearly : plan.priceMonthly;
            const currentPrice = currentPlan
              ? billingCycle === "yearly"
                ? currentPlan.priceYearly
                : currentPlan.priceMonthly
              : 0;
            const isHigherTier = price > currentPrice;
            const isLowerTier = price < currentPrice;
            const features = parseFeatures(plan.features);

            return (
              <Card key={plan.id} className={isCurrent ? "ring-2 ring-primary" : undefined}>
                <CardHeader>
                  <div className="flex items-start justify-between gap-2">
                    <CardTitle className="text-base">{plan.name}</CardTitle>
                    {isCurrent && <Badge variant="secondary">Current plan</Badge>}
                  </div>
                  <CardDescription>{plan.description}</CardDescription>
                  <p className="text-2xl font-bold">
                    {price === 0
                      ? "Free"
                      : `$${(price / 100).toFixed(0)}/${billingCycle === "yearly" ? "yr" : "mo"}`}
                  </p>
                </CardHeader>

                {features.length > 0 && (
                  <CardContent>
                    <ul className="flex flex-col gap-1.5">
                      {features.map((feature) => (
                        <li key={feature} className="flex items-center gap-2 text-sm">
                          <CheckIcon className="size-4 text-primary" />
                          {feature}
                        </li>
                      ))}
                    </ul>
                  </CardContent>
                )}

                <CardFooter>
                  {isCurrent && !isCanceled ? (
                    <Button variant="outline" size="sm" disabled className="w-full">
                      Current plan
                    </Button>
                  ) : (
                    <Button
                      variant={isHigherTier || isCanceled ? "default" : "outline"}
                      size="sm"
                      className="w-full"
                      onClick={() => handlePlanClick(plan)}
                    >
                      {isCanceled
                        ? "Subscribe"
                        : isHigherTier
                          ? "Upgrade"
                          : isLowerTier
                            ? "Downgrade"
                            : "Switch"}
                    </Button>
                  )}
                </CardFooter>
              </Card>
            );
          })}
        </div>
      </div>

      {selectedPlan && (
        <ChangePlanDialog
          open={dialogOpen}
          fromPlan={currentPlan}
          toPlan={selectedPlan}
          billingCycle={billingCycle}
          onOpenChange={setDialogOpen}
          onSuccess={handleSuccess}
        />
      )}
    </>
  );
}
