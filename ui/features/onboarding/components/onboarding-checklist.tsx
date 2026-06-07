"use client";

import type { OnboardingProgressOutput } from "@enterprise/contracts";
import { Badge } from "@enterprise/ui/components/badge";
import {
  Card,
  CardContent,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@enterprise/ui/components/card";
import { cn } from "@enterprise/ui/lib/utils";
import { CheckCircle2, Circle } from "lucide-react";
import { ActivationBanner } from "./activation-banner";
import { BaselineSetupForm } from "./baseline-setup-form";
import { DismissDialog } from "./dismiss-dialog";
import { InviteStepTrigger } from "./invite-step-trigger";
import { SampleDataStep } from "./sample-data-step";

interface OnboardingChecklistProps {
  progress: OnboardingProgressOutput;
}

// ─── Inline progress bar (no Progress primitive in @enterprise/ui) ─────────────

interface ProgressBarProps {
  value: number; // 0–100
}

function ProgressBar({ value }: ProgressBarProps) {
  return (
    <div
      role="progressbar"
      aria-valuenow={value}
      aria-valuemin={0}
      aria-valuemax={100}
      aria-label="Setup progress"
      className="h-2 w-full overflow-hidden rounded-full bg-muted"
    >
      <div
        className="h-full rounded-full bg-primary transition-all"
        style={{ width: `${value}%` }}
      />
    </div>
  );
}

// ─── Step row ─────────────────────────────────────────────────────────────────

interface StepRowProps {
  label: string;
  description: string;
  completed: boolean;
  optional?: boolean;
  children?: React.ReactNode;
}

function StepRow({ label, description, completed, optional = false, children }: StepRowProps) {
  return (
    <div
      className={cn(
        "flex flex-col gap-3 rounded-xl p-4 transition-colors",
        completed ? "opacity-60" : "bg-surface-container-low hover:bg-muted/50",
      )}
    >
      <div className="flex items-start gap-3">
        {completed ? (
          <CheckCircle2 className="mt-0.5 size-5 shrink-0 text-success" aria-hidden="true" />
        ) : (
          <Circle className="mt-0.5 size-5 shrink-0 text-muted-foreground" aria-hidden="true" />
        )}
        <div className="flex flex-1 flex-col gap-0.5">
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-sm font-medium">{label}</span>
            {optional && (
              <Badge variant="neutral" className="text-xs">
                Optional
              </Badge>
            )}
            {completed && (
              <Badge variant="success" className="text-xs">
                Done
              </Badge>
            )}
          </div>
          <p className="text-xs text-muted-foreground">{description}</p>
        </div>
      </div>

      {!completed && children && <div className="ml-8">{children}</div>}
    </div>
  );
}

// ─── Main checklist ───────────────────────────────────────────────────────────

export function OnboardingChecklist({ progress }: OnboardingChecklistProps) {
  const { completedCount, totalSteps, activatedAt } = progress;
  const progressPercent = totalSteps > 0 ? Math.round((completedCount / totalSteps) * 100) : 0;

  return (
    <div className="flex flex-col gap-6" data-testid="onboarding-checklist">
      {activatedAt && <ActivationBanner activatedAt={activatedAt} />}

      <Card>
        <CardHeader>
          <div className="flex flex-col gap-3">
            <div className="flex items-center justify-between">
              <CardTitle>Get started</CardTitle>
              <span
                role="status"
                className="text-sm font-medium text-muted-foreground"
                aria-label={`${completedCount} of ${totalSteps} steps complete`}
              >
                {completedCount}/{totalSteps}
              </span>
            </div>
            <ProgressBar value={progressPercent} />
          </div>
        </CardHeader>

        <CardContent className="flex flex-col gap-3">
          {/* Step 1: Baseline workspace setup (mandatory) */}
          <StepRow
            label="Set up your workspace"
            description="Give your workspace a name and set the locale for date and number formatting."
            completed={progress.baselineCompleted}
          >
            <BaselineSetupForm />
          </StepRow>

          {/* Step 2: Invite first teammate (optional) */}
          <StepRow
            label="Invite your first teammate"
            description="Add a colleague to start collaborating in your workspace."
            completed={progress.firstInviteCompleted}
            optional
          >
            <InviteStepTrigger />
          </StepRow>

          {/* Step 3: Load sample data (optional) */}
          <StepRow
            label="Load sample data"
            description="Populate your workspace with starter records to explore the platform."
            completed={progress.sampleDataCompleted}
            optional
          >
            <SampleDataStep />
          </StepRow>
        </CardContent>

        <CardFooter className="justify-end">
          <DismissDialog />
        </CardFooter>
      </Card>
    </div>
  );
}
