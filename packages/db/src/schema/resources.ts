// Resources domain schema — generic reference entities with RLS

import { sql } from "drizzle-orm";
import { index, pgEnum, pgPolicy, pgTable, text, timestamp, uuid } from "drizzle-orm/pg-core";
import { authenticatedRole } from "drizzle-orm/supabase";

/** Resource type enum */
export const resourceTypeEnum = pgEnum("resource_type", [
  "product",
  "service",
  "asset",
  "document",
  "other",
]);

/** Resource status enum */
export const resourceStatusEnum = pgEnum("resource_status", [
  "active",
  "draft",
  "archived",
  "suspended",
]);

/** Matches the tenant_id column against the JWT app_metadata tenant_id claim */
const tenantClaim = sql`((auth.jwt()->'app_metadata'->>'tenant_id')::uuid = tenant_id)`;

/** Restricts mutations to owner and admin roles */
const adminClaim = sql`(auth.jwt()->'app_metadata'->>'role' IN ('owner', 'admin'))`;

/** Resources — generic reference entities per tenant */
export const resources = pgTable(
  "resources",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    tenantId: uuid("tenant_id").notNull(),
    title: text("title").notNull(),
    type: resourceTypeEnum("type").notNull(),
    status: resourceStatusEnum("status").notNull().default("active"),
    description: text("description"),
    metadata: text("metadata"), // JSON-stringified object for custom fields
    imageUrls: text("image_urls"), // JSON-stringified array of URLs
    createdBy: uuid("created_by").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    index("resources_tenant_idx").on(table.tenantId),
    index("resources_status_idx").on(table.status),
    index("resources_type_idx").on(table.type),
    index("resources_created_by_idx").on(table.createdBy),
    pgPolicy("resources_select", {
      as: "permissive",
      for: "select",
      to: authenticatedRole,
      using: tenantClaim,
    }),
    pgPolicy("resources_insert", {
      as: "permissive",
      for: "insert",
      to: authenticatedRole,
      withCheck: sql`(${tenantClaim} AND ${adminClaim})`,
    }),
    pgPolicy("resources_update", {
      as: "permissive",
      for: "update",
      to: authenticatedRole,
      using: sql`(${tenantClaim} AND ${adminClaim})`,
      withCheck: sql`(${tenantClaim} AND ${adminClaim})`,
    }),
    pgPolicy("resources_delete", {
      as: "permissive",
      for: "delete",
      to: authenticatedRole,
      using: sql`(${tenantClaim} AND ${adminClaim})`,
    }),
  ],
).enableRLS();

export type Resource = typeof resources.$inferSelect;
export type NewResource = typeof resources.$inferInsert;
