import { Badge } from "@enterprise/ui/components/badge";

const STATUS_CONFIG = {
  trialing: { label: "Trial", variant: "default" },
  active: { label: "Active", variant: "secondary" },
  past_due: { label: "Past due", variant: "destructive" },
  canceled: { label: "Canceled", variant: "outline" },
  unpaid: { label: "Unpaid", variant: "destructive" },
} as const;

type SubscriptionStatus = keyof typeof STATUS_CONFIG;

interface SubscriptionStatusBadgeProps {
  status: SubscriptionStatus;
}

export function SubscriptionStatusBadge({ status }: SubscriptionStatusBadgeProps) {
  const config = STATUS_CONFIG[status] ?? { label: status, variant: "outline" as const };

  return <Badge variant={config.variant}>{config.label}</Badge>;
}
