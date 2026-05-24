import { Button } from "@enterprise/ui/components/button";
import Link from "next/link";
import { ROUTES } from "@/lib/routes";

export function LandingNav() {
  return (
    <header className="sticky top-0 z-50 bg-background/80 backdrop-blur-xl">
      <nav
        aria-label="Main navigation"
        className="mx-auto flex h-16 max-w-[1280px] items-center justify-between px-4 md:px-8"
      >
        {/* Brand */}
        <Link href={ROUTES.home} className="font-headline text-lg font-bold text-foreground">
          Enterprise Platform
        </Link>

        {/* Desktop section links */}
        <ul className="hidden items-center gap-6 md:flex">
          <li>
            <a
              href="#features"
              className="text-sm text-muted-foreground transition-colors hover:text-foreground"
            >
              Features
            </a>
          </li>
          <li>
            <a
              href="#social-proof"
              className="text-sm text-muted-foreground transition-colors hover:text-foreground"
            >
              About
            </a>
          </li>
        </ul>

        {/* Auth CTAs */}
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="sm" asChild>
            <Link href="/sign-in">Sign In</Link>
          </Button>
          <Button variant="default" size="sm" asChild className="hidden md:inline-flex">
            <Link href="/sign-up">Get Started</Link>
          </Button>
        </div>
      </nav>
    </header>
  );
}
