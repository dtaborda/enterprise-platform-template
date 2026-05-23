"use client";

import type { UserRole } from "@enterprise/contracts";
import { BottomTabBar } from "./bottom-tab-bar";
import { Header } from "./header";
import { Sidebar } from "./sidebar";

interface DashboardShellProps {
  children: React.ReactNode;
  userRole: UserRole;
  userLabel: string;
}

export function DashboardShell({ children, userRole, userLabel }: DashboardShellProps) {
  return (
    <div className="min-h-screen lg:h-screen">
      <Sidebar userRole={userRole} userLabel={userLabel} />
      <div className="flex min-h-screen flex-1 flex-col lg:ml-[var(--sidebar-width)] lg:h-screen lg:overflow-hidden">
        <Header userRole={userRole} userLabel={userLabel} />
        <main className="flex-1 overflow-y-auto p-6 pb-20 lg:pb-6">{children}</main>
      </div>
      <BottomTabBar userRole={userRole} userLabel={userLabel} />
    </div>
  );
}
