import type { UserRole } from "@enterprise/contracts";
import type { LucideIcon } from "lucide-react";

interface NavItem {
  label: string;
  href: string;
  icon: LucideIcon;
  roles?: UserRole[];
}

/**
 * Determines if a nav item is active based on pathname matching.
 * Dashboard gets exact match; all others use prefix match with slash separator.
 */
function isNavItemActive(href: string, pathname: string, dashboardHref: string): boolean {
  if (href === dashboardHref) {
    return pathname === dashboardHref;
  }
  return pathname === href || pathname.startsWith(`${href}/`);
}

/**
 * Filters nav items by user role.
 * Items without a roles array are visible to all roles.
 */
function filterNavItemsByRole(items: readonly NavItem[], userRole: UserRole): NavItem[] {
  return items.filter((item) => !item.roles || item.roles.includes(userRole));
}

export type { NavItem };
export { filterNavItemsByRole, isNavItemActive };
