"use client";

import type { PlanRecord } from "@enterprise/core/services/billing-service";
import { Button } from "@enterprise/ui/components/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@enterprise/ui/components/dialog";
import { useActionState, useEffect } from "react";
import { changePlanAction } from "@/features/billing/actions";

interface ChangePlanDialogProps {
  open: boolean;
  fromPlan: PlanRecord | null;
  toPlan: PlanRecord;
  billingCycle: "monthly" | "yearly";
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
}

export function ChangePlanDialog({
  open,
  fromPlan,
  toPlan,
  billingCycle,
  onOpenChange,
  onSuccess,
}: ChangePlanDialogProps) {
  const [state, formAction, isPending] = useActionState(changePlanAction, null);

  useEffect(() => {
    if (state?.success) {
      onSuccess();
      onOpenChange(false);
    }
  }, [state, onSuccess, onOpenChange]);

  const fromPrice =
    fromPlan == null ? 0 : billingCycle === "yearly" ? fromPlan.priceYearly : fromPlan.priceMonthly;

  const toPrice = billingCycle === "yearly" ? toPlan.priceYearly : toPlan.priceMonthly;

  const priceDelta = toPrice - fromPrice;
  const isUpgrade = priceDelta > 0;
  const isDowngrade = priceDelta < 0;

  const priceDeltaDisplay =
    priceDelta === 0
      ? "No price change"
      : `${isUpgrade ? "+" : "-"}$${Math.abs(priceDelta / 100).toFixed(0)}/${billingCycle === "yearly" ? "yr" : "mo"}`;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>
            {isUpgrade ? "Upgrade" : isDowngrade ? "Downgrade" : "Change"} plan?
          </DialogTitle>
          <DialogDescription>
            This change will take effect at the end of your current billing period.
          </DialogDescription>
        </DialogHeader>

        <div className="rounded-md border bg-muted/30 px-4 py-3 text-sm">
          {fromPlan && (
            <p className="text-muted-foreground">
              From: <span className="font-medium text-foreground">{fromPlan.name}</span>
            </p>
          )}
          <p className="mt-1 text-muted-foreground">
            To: <span className="font-medium text-foreground">{toPlan.name}</span>
          </p>
          <p className="mt-1 text-muted-foreground">
            Price change: <span className="font-medium text-foreground">{priceDeltaDisplay}</span>
          </p>
        </div>

        {state && !state.success && (
          <p className="text-sm text-destructive">{state.error?.message ?? "An error occurred"}</p>
        )}

        <DialogFooter>
          <Button
            type="button"
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={isPending}
          >
            Cancel
          </Button>
          <form action={formAction}>
            <input type="hidden" name="planId" value={toPlan.id} />
            <Button type="submit" disabled={isPending}>
              {isPending ? "Confirming…" : "Confirm"}
            </Button>
          </form>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
