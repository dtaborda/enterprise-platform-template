import {
  Avatar,
  AvatarFallback,
  AvatarGroup,
  AvatarGroupCount,
} from "@enterprise/ui/components/avatar";

interface MetricItem {
  readonly value: string;
  readonly label: string;
}

const METRICS: readonly MetricItem[] = [
  { value: "10,000+", label: "Active Users" },
  { value: "99.9%", label: "Uptime SLA" },
  { value: "50+", label: "Enterprise Clients" },
] as const;

const AVATAR_INITIALS = ["JD", "AS", "MK", "RL", "TW"] as const;

export function SocialProofSection() {
  return (
    <section
      id="social-proof"
      aria-labelledby="social-proof-heading"
      className="bg-background py-16 md:py-24"
    >
      <div className="mx-auto flex max-w-[1280px] flex-col items-center gap-10 px-4 text-center md:px-8">
        {/* Avatar group */}
        <div className="flex flex-col items-center gap-3">
          <AvatarGroup>
            {AVATAR_INITIALS.map((initials) => (
              <Avatar key={initials}>
                <AvatarFallback>{initials}</AvatarFallback>
              </Avatar>
            ))}
            <AvatarGroupCount>+10K</AvatarGroupCount>
          </AvatarGroup>
          <p className="max-w-lg text-sm italic text-muted-foreground">
            Trusted by thousands of developers and enterprise teams worldwide.
          </p>
        </div>

        {/* Section heading */}
        <h2
          id="social-proof-heading"
          className="font-headline text-2xl font-bold text-foreground md:text-3xl"
        >
          Trusted by Thousands
        </h2>

        {/* Metrics */}
        <div className="mt-6 grid grid-cols-1 gap-8 sm:grid-cols-3">
          {METRICS.map((metric) => (
            <div key={metric.label}>
              <p className="font-headline text-3xl font-bold text-foreground md:text-4xl">
                {metric.value}
              </p>
              <p className="mt-1 text-sm text-muted-foreground">{metric.label}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
