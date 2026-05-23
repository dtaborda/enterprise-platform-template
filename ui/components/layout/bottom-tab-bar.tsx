"use client";

import type { UserRole } from "@enterprise/contracts";
import { Button } from "@enterprise/ui/components/button";
import {
  Sheet,
  SheetClose,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@enterprise/ui/components/sheet";
import { cn } from "@enterprise/ui/lib/utils";
import {
  CreditCard,
  Ellipsis,
  LayoutDashboard,
  LogOut,
  Package,
  Settings,
  Users,
} from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { signOut } from "@/features/auth/actions";
import { ROUTES } from "@/lib/routes";
import type { NavItem } from "./nav-utils";
import { filterNavItemsByRole, isNavItemActive } from "./nav-utils";

interface BottomTabBarProps {
  userRole: UserRole;
  userLabel: string;
}

const BOTTOM_TAB_ITEMS: readonly NavItem[] = [
  { label: "Dashboard", href: ROUTES.dashboard, icon: LayoutDashboard },
  { label: "Resources", href: ROUTES.resources.root, icon: Package },
  { label: "Team", href: ROUTES.team, icon: Users },
  { label: "Billing", href: ROUTES.billing, icon: CreditCard, roles: ["owner", "admin"] },
];

function canAccessSettings(userRole: UserRole): boolean {
  return userRole === "owner" || userRole === "admin";
}

export function BottomTabBar({ userRole, userLabel }: BottomTabBarProps) {
  const pathname = usePathname();
  const items = filterNavItemsByRole(BOTTOM_TAB_ITEMS, userRole);
  const showSettings = canAccessSettings(userRole);

  return (
    <nav
      className="fixed inset-x-0 bottom-0 z-50 border-t bg-background/80 backdrop-blur-xl lg:hidden"
      data-testid="bottom-tab-bar"
      style={{ paddingBottom: "env(safe-area-inset-bottom)" }}
    >
      <div className="grid h-16 grid-cols-5 items-center px-1">
        {items.map((item) => {
          const active = isNavItemActive(item.href, pathname, ROUTES.dashboard);

          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex h-full flex-col items-center justify-center gap-1 rounded-md px-1 text-[11px] font-medium transition-colors",
                active
                  ? "text-primary"
                  : "text-muted-foreground hover:bg-accent hover:text-accent-foreground",
              )}
              data-testid={`bottom-tab-item-${item.label.toLowerCase()}`}
            >
              <item.icon className="size-4" />
              <span>{item.label}</span>
            </Link>
          );
        })}

        <Sheet>
          <SheetTrigger asChild>
            <Button
              type="button"
              variant="ghost"
              className="h-full flex-col gap-1 rounded-md px-1 text-[11px] text-muted-foreground"
              data-testid="bottom-tab-more"
            >
              <Ellipsis className="size-4" />
              <span>More</span>
            </Button>
          </SheetTrigger>
          <SheetContent
            side="bottom"
            className="rounded-t-2xl"
            showCloseButton={false}
            data-testid="bottom-tab-more-drawer"
          >
            <SheetHeader>
              <SheetTitle>More</SheetTitle>
              <SheetDescription>Workspace actions and account shortcuts</SheetDescription>
            </SheetHeader>

            <div className="space-y-1 px-4 pb-2">
              {showSettings ? (
                <SheetClose asChild>
                  <Link
                    href={ROUTES.settings}
                    className="flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium hover:bg-accent"
                    data-testid="bottom-tab-more-settings"
                  >
                    <Settings className="size-4" />
                    Settings
                  </Link>
                </SheetClose>
              ) : null}

              <form action={signOut}>
                <button
                  type="submit"
                  className="flex w-full items-center gap-3 rounded-md px-3 py-2 text-left text-sm font-medium hover:bg-accent"
                  data-testid="bottom-tab-more-sign-out"
                >
                  <LogOut className="size-4" />
                  Sign out
                </button>
              </form>
            </div>

            <div
              className="border-t px-4 py-3 text-xs text-muted-foreground"
              data-testid="bottom-tab-tenant-info"
            >
              {userLabel}
            </div>
          </SheetContent>
        </Sheet>
      </div>
    </nav>
  );
}
