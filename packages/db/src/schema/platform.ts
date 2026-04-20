// Platform schema - Multi-tenant tables with RLS
// These are reusable across any enterprise app built on the platform

import { sql } from "drizzle-orm";
import { index, pgEnum, pgPolicy, pgTable, text, timestamp, uuid } from "drizzle-orm/pg-core";
import { authenticatedRole, serviceRole } from "drizzle-orm/supabase";

// ============================================================================
// Enums
// ============================================================================

/** Tenant status enum */
export const tenantStatusEnum = pgEnum("tenant_status", ["active", "inactive", "suspended"]);

/** User role enum */
export const userRoleEnum = pgEnum("user_role", ["owner", "admin", "member", "guest"]);

/** Audit action enum */
export const auditActionEnum = pgEnum("audit_action", [
  "create",
  "read",
  "update",
  "delete",
  "login",
  "logout",
  "custom",
]);

const tenantClaimMatchesColumn = sql`((auth.jwt()->>'tenant_id')::uuid = tenant_id)`;
const adminRoleClaim = sql`(auth.jwt()->>'role' IN ('owner', 'admin'))`;

// ============================================================================
// Tenants Table
// ============================================================================

/** Tenants - each tenant is a separate organization/workspace */
export const tenants = pgTable(
  "tenants",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    name: text("name").notNull(),
    slug: text("slug").notNull().unique(),
    status: tenantStatusEnum("status").notNull().default("active"),
    settings: text("settings"), // JSONB stored as text
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    index("tenants_slug_idx").on(table.slug),
    index("tenants_status_idx").on(table.status),
    pgPolicy("tenants_select", {
      as: "permissive",
      for: "select",
      to: authenticatedRole,
      using: sql`((auth.jwt()->>'tenant_id')::uuid = id)`,
    }),
    pgPolicy("tenants_insert", {
      as: "permissive",
      for: "insert",
      to: serviceRole,
      withCheck: sql`true`,
    }),
    pgPolicy("tenants_update", {
      as: "permissive",
      for: "update",
      to: serviceRole,
      using: sql`true`,
      withCheck: sql`true`,
    }),
  ],
).enableRLS();

// ============================================================================
// Profiles Table
// ============================================================================

/** User profiles - extends Supabase auth.users */
export const profiles = pgTable(
  "profiles",
  {
    id: uuid("id").primaryKey(), // FK to auth.users
    tenantId: uuid("tenant_id").notNull(),
    email: text("email").notNull(),
    name: text("name"),
    avatarUrl: text("avatar_url"),
    role: userRoleEnum("role").notNull().default("member"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    index("profiles_tenant_idx").on(table.tenantId),
    index("profiles_email_idx").on(table.email),
    pgPolicy("profiles_select", {
      as: "permissive",
      for: "select",
      to: authenticatedRole,
      using: tenantClaimMatchesColumn,
    }),
    pgPolicy("profiles_insert", {
      as: "permissive",
      for: "insert",
      to: authenticatedRole,
      withCheck: sql`(auth.uid() = id AND ${tenantClaimMatchesColumn})`,
    }),
    pgPolicy("profiles_update", {
      as: "permissive",
      for: "update",
      to: authenticatedRole,
      using: sql`(${tenantClaimMatchesColumn} AND ${adminRoleClaim})`,
      withCheck: sql`(${tenantClaimMatchesColumn} AND ${adminRoleClaim})`,
    }),
  ],
).enableRLS();

// ============================================================================
// User Roles Table (for role hierarchy)
// ============================================================================

export const userRoles = pgTable(
  "user_roles",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    userId: uuid("user_id").notNull(), // FK to profiles
    tenantId: uuid("tenant_id").notNull(),
    role: userRoleEnum("role").notNull(),
    grantedBy: uuid("granted_by").notNull(),
    grantedAt: timestamp("granted_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    index("user_roles_user_tenant_idx").on(table.userId, table.tenantId),
    pgPolicy("user_roles_select", {
      as: "permissive",
      for: "select",
      to: authenticatedRole,
      using: tenantClaimMatchesColumn,
    }),
    pgPolicy("user_roles_insert", {
      as: "permissive",
      for: "insert",
      to: authenticatedRole,
      withCheck: sql`(${tenantClaimMatchesColumn} AND ${adminRoleClaim})`,
    }),
  ],
).enableRLS();

// ============================================================================
// Audit Log Table
// ============================================================================

export const auditLog = pgTable(
  "audit_log",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    tenantId: uuid("tenant_id").notNull(),
    userId: uuid("user_id").notNull(),
    action: auditActionEnum("action").notNull(),
    resource: text("resource").notNull(),
    resourceId: uuid("resource_id"),
    metadata: text("metadata"), // JSONB stored as text
    ipAddress: text("ip_address"),
    userAgent: text("user_agent"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    index("audit_log_tenant_idx").on(table.tenantId),
    index("audit_log_user_idx").on(table.userId),
    index("audit_log_resource_idx").on(table.resource),
    index("audit_log_created_idx").on(table.createdAt),
    pgPolicy("audit_log_select", {
      as: "permissive",
      for: "select",
      to: authenticatedRole,
      using: sql`(${tenantClaimMatchesColumn} AND ${adminRoleClaim})`,
    }),
    pgPolicy("audit_log_insert", {
      as: "permissive",
      for: "insert",
      to: authenticatedRole,
      withCheck: sql`(${tenantClaimMatchesColumn} AND auth.uid() = user_id)`,
    }),
  ],
).enableRLS();

// ============================================================================
// Type Exports (for use in services)
// ============================================================================

export type Tenant = typeof tenants.$inferSelect;
export type NewTenant = typeof tenants.$inferInsert;
export type Profile = typeof profiles.$inferSelect;
export type NewProfile = typeof profiles.$inferInsert;
export type UserRole = typeof userRoles.$inferSelect;
export type NewUserRole = typeof userRoles.$inferInsert;
export type AuditLogEntry = typeof auditLog.$inferSelect;
export type NewAuditLogEntry = typeof auditLog.$inferInsert;
