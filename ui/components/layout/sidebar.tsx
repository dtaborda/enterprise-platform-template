"use client";

import type { UserRole } from "@enterprise/contracts";
import { cn } from "@enterprise/ui/lib/utils";
import { CreditCard, LayoutDashboard, Package, Settings, Users } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
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

interface SidebarProps {
  userRole: UserRole;
  userLabel: string;
}

export function Sidebar({ userRole, userLabel }: SidebarProps) {
  const items = filterNavItemsByRole(NAV_ITEMS, userRole);
  const pathname = usePathname();

  return (
    <aside
      className="hidden h-screen shrink-0 flex-col border-r bg-surface-container-low lg:flex"
      style={{ width: "var(--sidebar-width)" }}
    >
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

      <div className="mt-auto border-t p-4 text-xs text-muted-foreground">{userLabel}</div>
    </aside>
  );
}
