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
    <div className="flex min-h-screen">
      <Sidebar userRole={userRole} userLabel={userLabel} />
      <div className="flex flex-1 flex-col">
        <Header userRole={userRole} userLabel={userLabel} />
        <main className="flex-1 p-6">{children}</main>
      </div>
    </div>
  );
}
