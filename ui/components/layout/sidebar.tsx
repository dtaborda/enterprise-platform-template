"use client";

import type { UserRole } from "@enterprise/contracts";
import { cn } from "@enterprise/ui/lib/utils";
import { CreditCard, LayoutDashboard, Package, Settings, Users } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { OnboardingLauncherChip } from "@/features/onboarding/components/onboarding-launcher-chip";
import { ROUTES } from "@/lib/routes";
import type { NavItem } from "./nav-utils";
import { filterNavItemsByRole, isNavItemActive } from "./nav-utils";

export const NAV_ITEMS: NavItem[] = [
  { label: "Dashboard", href: ROUTES.dashboard, icon: LayoutDashboard },
  { label: "Resources", href: ROUTES.resources.root, icon: Package },
  { label: "Team", href: ROUTES.team, icon: Users },
  { label: "Billing", href: ROUTES.billing, icon: CreditCard, roles: ["owner", "admin"] },
  { label: "Settings", href: ROUTES.settings, icon: Settings, roles: ["owner", "admin"] },
];

export interface OnboardingChipData {
  completedCount: number;
  totalSteps: number;
}

interface SidebarProps {
  userRole: UserRole;
  userLabel: string;
  onboardingChip?: OnboardingChipData | null;
}

export function Sidebar({ userRole, userLabel, onboardingChip }: SidebarProps) {
  const items = filterNavItemsByRole(NAV_ITEMS, userRole);
  const pathname = usePathname();

  return (
    <aside className="fixed inset-y-0 left-0 z-40 hidden w-[var(--sidebar-width)] flex-col border-r bg-surface-container-low lg:flex">
      <div className="flex h-14 items-center border-b px-4">
        <span className="font-heading text-lg font-bold text-primary">Enterprise</span>
      </div>

      <nav className="flex flex-col gap-1 p-2">
        {items.map((item) => {
          const active = isNavItemActive(item.href, pathname, ROUTES.dashboard);

          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors",
                active
                  ? "bg-primary/10 text-primary"
                  : "text-muted-foreground hover:bg-accent hover:text-accent-foreground",
              )}
            >
              <item.icon className="size-4" />
              {item.label}
            </Link>
          );
        })}
      </nav>

      {/* Onboarding launcher chip — owner-only, hidden once fully activated */}
      {userRole === "owner" && onboardingChip && (
        <div className="px-2 pb-2">
          <OnboardingLauncherChip
            completedCount={onboardingChip.completedCount}
            totalSteps={onboardingChip.totalSteps}
          />
        </div>
      )}

      <div className="mt-auto border-t p-4 text-xs text-muted-foreground">{userLabel}</div>
    </aside>
  );
}
