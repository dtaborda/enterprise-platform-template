import { Card, CardContent } from "@enterprise/ui/components/card";
import { TriangleAlertIcon } from "lucide-react";

interface PastDueBannerProps {
  graceEndsAt: string | null;
}

export function PastDueBanner({ graceEndsAt }: PastDueBannerProps) {
  if (!graceEndsAt) return null;

  const graceDate = new Date(graceEndsAt);
  const formatted = graceDate.toLocaleDateString(undefined, {
    year: "numeric",
    month: "long",
    day: "numeric",
  });

  return (
    <Card className="border-destructive bg-destructive/5">
      <CardContent className="flex items-start gap-3 py-4">
        <TriangleAlertIcon className="mt-0.5 size-5 shrink-0 text-destructive" />
        <div>
          <p className="text-sm font-medium text-destructive">Payment failed</p>
          <p className="text-sm text-muted-foreground">
            Your grace period ends on{" "}
            <span className="font-medium text-foreground">{formatted}</span>. Please update your
            payment method to avoid service interruption.
          </p>
        </div>
      </CardContent>
    </Card>
  );
}
