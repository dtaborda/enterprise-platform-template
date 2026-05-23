"use client";

import type { UserRole } from "@enterprise/contracts";
import { Header } from "./header";
import { Sidebar } from "./sidebar";

interface DashboardShellProps {
  children: React.ReactNode;
  userRole: UserRole;
  userLabel: string;
}

export function DashboardShell({ children, userRole, userLabel }: DashboardShellProps) {
  return (
    <div className="min-h-screen">
      <Sidebar userRole={userRole} userLabel={userLabel} />
      <div className="flex min-h-screen flex-1 flex-col lg:ml-[var(--sidebar-width)]">
        <Header userRole={userRole} userLabel={userLabel} />
        <main className="flex-1 p-6 pb-20 lg:pb-6">{children}</main>
      </div>
    </div>
  );
}
