import { Badge } from "@enterprise/ui/components/badge";
import { Button } from "@enterprise/ui/components/button";
import Link from "next/link";

export function HeroSection() {
  return (
    <section
      id="hero"
      aria-labelledby="hero-heading"
      className="bg-background py-24 md:py-32"
      data-testid="hero-section"
    >
      <div className="mx-auto flex max-w-[1280px] flex-col items-center px-4 text-center md:px-8">
        <div className="flex animate-fade-in-up flex-col items-center gap-6">
          <Badge variant="accent" className="mb-2">
            Now in Beta
          </Badge>

          <h1
            id="hero-heading"
            className="max-w-3xl font-headline text-4xl font-bold tracking-tight text-foreground md:text-5xl lg:text-6xl"
          >
            Build Multi-Tenant SaaS Faster
          </h1>

          <p className="max-w-2xl text-lg text-muted-foreground md:text-xl">
            The full-stack SaaS template powered by Next.js, Supabase, and TypeScript. Ship
            production-ready multi-tenant applications with built-in auth, billing, and teams.
          </p>

          <div className="mt-4 flex flex-col gap-3 sm:flex-row">
            <Button variant="gradient" size="lg" asChild className="active:scale-[0.98]">
              <Link href="/sign-up">Get Started</Link>
            </Button>
            <Button variant="ghost" size="lg" asChild>
              <Link href="/sign-in">Sign In</Link>
            </Button>
          </div>
        </div>
      </div>
    </section>
  );
}
