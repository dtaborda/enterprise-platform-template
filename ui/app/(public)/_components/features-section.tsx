import { Card, CardContent, CardDescription, CardTitle } from "@enterprise/ui/components/card";
import type { LucideIcon } from "lucide-react";
import { Shield, Users, Zap } from "lucide-react";

interface FeatureItem {
  readonly icon: LucideIcon;
  readonly title: string;
  readonly description: string;
}

const FEATURES: readonly FeatureItem[] = [
  {
    icon: Shield,
    title: "Enterprise Security",
    description:
      "Built-in RLS, RBAC, and audit logging. Every action is tracked, every tenant is isolated.",
  },
  {
    icon: Users,
    title: "Multi-Tenant Ready",
    description:
      "Workspace isolation, team management, and role-based access control out of the box.",
  },
  {
    icon: Zap,
    title: "Ship Faster",
    description:
      "Pre-built auth, billing, and admin dashboards. Focus on your product, not the plumbing.",
  },
] as const;

const ANIMATION_DELAYS = ["0ms", "100ms", "200ms"] as const;

export function FeaturesSection() {
  return (
    <section
      id="features"
      aria-labelledby="features-heading"
      className="bg-surface-container-lowest py-16 md:py-24"
    >
      <div className="mx-auto max-w-[1280px] px-4 md:px-8">
        <p className="mb-2 font-label text-xs uppercase tracking-widest text-primary">Features</p>
        <h2
          id="features-heading"
          className="mb-12 font-headline text-3xl font-bold text-foreground md:text-4xl"
        >
          Everything you need to launch
        </h2>

        <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
          {FEATURES.map((feature, index) => {
            const Icon = feature.icon;
            return (
              <Card
                key={feature.title}
                data-testid="feature-card"
                className="animate-fade-in-up border-0 bg-surface-container-low transition-all hover:bg-surface-container-high"
                style={{ animationDelay: ANIMATION_DELAYS[index] }}
              >
                <CardContent className="flex flex-col gap-3 pt-6">
                  <div className="inline-flex items-center justify-center rounded-lg bg-primary/10 p-2.5">
                    <Icon className="size-5 text-primary" />
                  </div>
                  <CardTitle className="text-lg font-semibold">{feature.title}</CardTitle>
                  <CardDescription className="text-sm text-muted-foreground">
                    {feature.description}
                  </CardDescription>
                </CardContent>
              </Card>
            );
          })}
        </div>
      </div>
    </section>
  );
}
