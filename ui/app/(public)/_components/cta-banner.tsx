import { Button } from "@enterprise/ui/components/button";
import Link from "next/link";

export function CtaBanner() {
  return (
    <section
      aria-labelledby="cta-heading"
      className="bg-background/80 py-16 backdrop-blur-xl md:py-24"
    >
      <div className="mx-auto max-w-[1280px] px-4 md:px-8">
        <div className="flex flex-col items-center gap-6 rounded-2xl text-center shadow-lg">
          <h2
            id="cta-heading"
            className="font-headline text-2xl font-bold text-foreground md:text-3xl"
          >
            Ready to ship your SaaS?
          </h2>
          <p className="max-w-xl text-lg text-muted-foreground">
            Start building today with the enterprise-grade foundation your product deserves.
          </p>
          <Button variant="default" size="lg" asChild className="active:scale-[0.98]">
            <Link href="/sign-up">Start Building Today</Link>
          </Button>
        </div>
      </div>
    </section>
  );
}
