"use client";

import type { UserRole } from "@enterprise/contracts";
import { ThemeToggle } from "@enterprise/ui";
import { Avatar, AvatarFallback } from "@enterprise/ui/components/avatar";
import { Button } from "@enterprise/ui/components/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@enterprise/ui/components/dropdown-menu";
import { LogOut, Settings, User } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { signOut } from "@/features/auth/actions";
import { NotificationBell } from "@/features/notifications/components/notification-bell";
import { ROUTES } from "@/lib/routes";
import { MobileNav } from "./mobile-nav";

interface HeaderProps {
  userRole: UserRole;
  userLabel: string;
  userId: string;
  tenantId: string;
  initialUnreadCount: number;
}

const ROUTE_TITLES = [
  { prefix: ROUTES.settings, title: "Settings" },
  { prefix: ROUTES.team, title: "Team" },
  { prefix: ROUTES.billing, title: "Billing" },
  { prefix: ROUTES.resources.root, title: "Resources" },
  { prefix: ROUTES.notifications, title: "Notifications" },
] as const;

export function Header({ userRole, userLabel, userId, tenantId, initialUnreadCount }: HeaderProps) {
  const avatarLabel = userLabel.trim().charAt(0).toUpperCase() || "U";
  const pathname = usePathname();

  const pageTitle = ROUTE_TITLES.find((r) => pathname.startsWith(r.prefix))?.title ?? "Dashboard";

  return (
    <header className="sticky top-0 z-30 flex h-14 items-center justify-between border-b bg-background/80 px-4 backdrop-blur-sm lg:px-6">
      <div className="flex items-center gap-3">
        <MobileNav userRole={userRole} />
        <p className="font-heading text-sm font-semibold text-foreground">{pageTitle}</p>
      </div>

      <div className="ml-auto flex items-center gap-2">
        <ThemeToggle />
        {userRole !== "guest" && (
          <NotificationBell initialCount={initialUnreadCount} userId={userId} tenantId={tenantId} />
        )}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon" className="rounded-full">
              <Avatar size="sm">
                <AvatarFallback>{avatarLabel}</AvatarFallback>
              </Avatar>
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem>
              <User className="mr-2 size-4" />
              Profile
            </DropdownMenuItem>
            <DropdownMenuItem asChild>
              <Link href={ROUTES.settings}>
                <Settings className="mr-2 size-4" />
                Settings
              </Link>
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <form action={signOut}>
              <DropdownMenuItem asChild>
                <button type="submit" className="flex w-full items-center">
                  <LogOut className="mr-2 size-4" />
                  Sign Out
                </button>
              </DropdownMenuItem>
            </form>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  );
}
