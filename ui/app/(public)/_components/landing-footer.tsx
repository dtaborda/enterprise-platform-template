import { ThemeToggle } from "@enterprise/ui/theme/toggle";
import Link from "next/link";
import { ROUTES } from "@/lib/routes";

interface FooterLink {
  readonly label: string;
  readonly href: string;
}

interface FooterLinkGroup {
  readonly title: string;
  readonly links: readonly FooterLink[];
}

const FOOTER_GROUPS: readonly FooterLinkGroup[] = [
  {
    title: "Product",
    links: [
      { label: "Features", href: "#features" },
      { label: "Pricing", href: "#" },
      { label: "Changelog", href: "#" },
    ],
  },
  {
    title: "Company",
    links: [
      { label: "About", href: "#" },
      { label: "Blog", href: "#" },
      { label: "Contact", href: "#" },
    ],
  },
] as const;

export function LandingFooter() {
  return (
    <footer className="bg-surface-container-lowest">
      <div className="mx-auto max-w-[1280px] px-4 py-12 md:px-8 md:py-16">
        <div className="grid grid-cols-1 gap-8 md:grid-cols-4">
          {/* Brand column */}
          <div>
            <Link href={ROUTES.home} className="font-headline text-lg font-bold text-foreground">
              Enterprise Platform
            </Link>
            <p className="mt-2 text-sm text-muted-foreground">
              The full-stack, multi-tenant SaaS template. Ship faster.
            </p>
          </div>

          {/* Link groups */}
          {FOOTER_GROUPS.map((group) => (
            <div key={group.title}>
              <h3 className="mb-3 font-label text-sm font-semibold uppercase tracking-wider text-foreground">
                {group.title}
              </h3>
              <ul className="flex flex-col gap-2">
                {group.links.map((link) => (
                  <li key={link.label}>
                    <a
                      href={link.href}
                      className="text-sm text-muted-foreground transition-colors hover:text-foreground"
                    >
                      {link.label}
                    </a>
                  </li>
                ))}
              </ul>
            </div>
          ))}

          {/* Theme column */}
          <div className="flex flex-col gap-3">
            <h3 className="font-label text-sm font-semibold uppercase tracking-wider text-foreground">
              Appearance
            </h3>
            <ThemeToggle />
          </div>
        </div>

        {/* Bottom bar */}
        <div className="mt-8 pt-8 text-center">
          <p className="text-xs text-muted-foreground">
            © 2026 Enterprise Platform. All rights reserved.
          </p>
        </div>
      </div>
    </footer>
  );
}
