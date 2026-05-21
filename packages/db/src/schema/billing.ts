// Billing schema - Plans, tenant subscriptions, and billing events with RLS
// All billing writes are service_role only (webhook handler + service layer)

import { sql } from "drizzle-orm";
import {
  boolean,
  index,
  integer,
  pgEnum,
  pgPolicy,
  pgTable,
  text,
  timestamp,
  uuid,
} from "drizzle-orm/pg-core";
import { authenticatedRole, serviceRole } from "drizzle-orm/supabase";
import { tenants } from "./platform.js";

// ============================================================================
// Enums
// ============================================================================

/** Subscription lifecycle status */
export const subscriptionStatusEnum = pgEnum("subscription_status", [
  "trialing",
  "active",
  "past_due",
  "canceled",
  "unpaid",
]);

/** Billing frequency */
export const billingCycleEnum = pgEnum("billing_cycle", ["monthly", "yearly"]);

// ============================================================================
// RLS Helpers
// ============================================================================

/** Matches the tenant_id column against the JWT app_metadata tenant_id claim */
const tenantClaimMatchesColumn = sql`((auth.jwt()->'app_metadata'->>'tenant_id')::uuid = tenant_id)`;

/** Restricts access to owner and admin roles via app_metadata */
const ownerOrAdminRoleClaim = sql`(auth.jwt()->'app_metadata'->>'role' IN ('owner', 'admin'))`;

// ============================================================================
// Plans Table
// ============================================================================

/** Plans - the billing catalog (public read, service_role write) */
export const plans = pgTable(
  "plans",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    name: text("name").notNull(),
    slug: text("slug").notNull().unique(),
    description: text("description"),
    priceMonthly: integer("price_monthly").notNull(), // cents
    priceYearly: integer("price_yearly").notNull(), // cents
    currency: text("currency").notNull().default("usd"),
    features: text("features").notNull(), // JSON string
    limits: text("limits").notNull(), // JSON string
    isActive: boolean("is_active").notNull().default(true),
    displayOrder: integer("display_order").notNull().default(0),
    trialDays: integer("trial_days").notNull().default(0),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    index("plans_slug_idx").on(table.slug),
    index("plans_active_order_idx").on(table.isActive, table.displayOrder),
    // Plans are a public catalog — any authenticated user can read
    pgPolicy("plans_select", {
      as: "permissive",
      for: "select",
      to: authenticatedRole,
      using: sql`true`,
    }),
    pgPolicy("plans_insert", {
      as: "permissive",
      for: "insert",
      to: serviceRole,
      withCheck: sql`true`,
    }),
    pgPolicy("plans_update", {
      as: "permissive",
      for: "update",
      to: serviceRole,
      using: sql`true`,
      withCheck: sql`true`,
    }),
    pgPolicy("plans_delete", {
      as: "permissive",
      for: "delete",
      to: serviceRole,
      using: sql`true`,
    }),
  ],
).enableRLS();

// ============================================================================
// Tenant Subscriptions Table
// ============================================================================

/** Tenant subscriptions - one active subscription per tenant */
export const tenantSubscriptions = pgTable(
  "tenant_subscriptions",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    tenantId: uuid("tenant_id")
      .notNull()
      .references(() => tenants.id, { onDelete: "cascade" })
      .unique(),
    planId: uuid("plan_id")
      .notNull()
      .references(() => plans.id),
    status: subscriptionStatusEnum("status").notNull(),
    billingCycle: billingCycleEnum("billing_cycle").notNull(),
    currentPeriodStart: timestamp("current_period_start", { withTimezone: true }).notNull(),
    currentPeriodEnd: timestamp("current_period_end", { withTimezone: true }).notNull(),
    cancelAtPeriodEnd: boolean("cancel_at_period_end").notNull().default(false),
    canceledAt: timestamp("canceled_at", { withTimezone: true }),
    trialEndsAt: timestamp("trial_ends_at", { withTimezone: true }),
    graceEndsAt: timestamp("grace_ends_at", { withTimezone: true }),
    externalSubscriptionId: text("external_subscription_id").unique(),
    externalCustomerId: text("external_customer_id"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    index("subscriptions_tenant_idx").on(table.tenantId),
    index("subscriptions_external_id_idx").on(table.externalSubscriptionId),
    index("subscriptions_status_idx").on(table.status),
    // Only owner and admin can read their tenant's subscription
    pgPolicy("subscriptions_select", {
      as: "permissive",
      for: "select",
      to: authenticatedRole,
      using: sql`(${tenantClaimMatchesColumn} AND ${ownerOrAdminRoleClaim})`,
    }),
    // All writes via service_role only (webhook handler + service layer)
    pgPolicy("subscriptions_insert_sr", {
      as: "permissive",
      for: "insert",
      to: serviceRole,
      withCheck: sql`true`,
    }),
    pgPolicy("subscriptions_update_sr", {
      as: "permissive",
      for: "update",
      to: serviceRole,
      using: sql`true`,
      withCheck: sql`true`,
    }),
    // No DELETE policy — status transitions only, never hard delete
  ],
).enableRLS();

// ============================================================================
// Billing Events Table
// ============================================================================

/** Billing events - immutable audit trail of all payment provider events */
export const billingEvents = pgTable(
  "billing_events",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    tenantId: uuid("tenant_id")
      .notNull()
      .references(() => tenants.id, { onDelete: "cascade" }),
    subscriptionId: uuid("subscription_id").references(() => tenantSubscriptions.id),
    eventType: text("event_type").notNull(),
    provider: text("provider").notNull(),
    externalEventId: text("external_event_id").unique(),
    payload: text("payload"), // JSON string
    processedAt: timestamp("processed_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    index("billing_events_tenant_idx").on(table.tenantId),
    index("billing_events_external_event_idx").on(table.externalEventId),
    index("billing_events_subscription_idx").on(table.subscriptionId),
    // Only owner and admin can read their tenant's billing events
    pgPolicy("billing_events_select", {
      as: "permissive",
      for: "select",
      to: authenticatedRole,
      using: sql`(${tenantClaimMatchesColumn} AND ${ownerOrAdminRoleClaim})`,
    }),
    // All writes via service_role only — immutable after insert
    pgPolicy("billing_events_insert_sr", {
      as: "permissive",
      for: "insert",
      to: serviceRole,
      withCheck: sql`true`,
    }),
    // No UPDATE — immutable after insert
    // No DELETE — audit records must be retained
  ],
).enableRLS();

// ============================================================================
// Type Exports (for use in services)
// ============================================================================

export type Plan = typeof plans.$inferSelect;
export type NewPlan = typeof plans.$inferInsert;

export type TenantSubscription = typeof tenantSubscriptions.$inferSelect;
export type NewTenantSubscription = typeof tenantSubscriptions.$inferInsert;

export type BillingEvent = typeof billingEvents.$inferSelect;
export type NewBillingEvent = typeof billingEvents.$inferInsert;
