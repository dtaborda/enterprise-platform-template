"use client";

import type { UserRole } from "@enterprise/contracts";
import { cn } from "@enterprise/ui/lib/utils";
import type { LucideIcon } from "lucide-react";
import { LayoutDashboard, Package, Settings } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";

interface NavItem {
  label: string;
  href: string;
  icon: LucideIcon;
  roles?: UserRole[];
}

export const NAV_ITEMS: NavItem[] = [
  { label: "Dashboard", href: "/dashboard", icon: LayoutDashboard },
  { label: "Resources", href: "/dashboard/resources", icon: Package },
  { label: "Settings", href: "/dashboard/settings", icon: Settings },
];

interface SidebarProps {
  userRole: UserRole;
  userLabel: string;
}

export function Sidebar({ userRole, userLabel }: SidebarProps) {
  const items = NAV_ITEMS.filter((item) => !item.roles || item.roles.includes(userRole));

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
          const isActive = pathname === item.href || pathname.startsWith(`${item.href}/`);

          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors",
                isActive
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
