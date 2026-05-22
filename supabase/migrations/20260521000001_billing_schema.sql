-- Billing schema: plans, tenant_subscriptions, billing_events
-- Adds subscription lifecycle management with RLS-enforced tenant isolation.
-- All writes are service_role only (webhook handler + service layer).

-- ============================================================================
-- Enums
-- ============================================================================

CREATE TYPE "public"."subscription_status" AS ENUM(
  'trialing',
  'active',
  'past_due',
  'canceled',
  'unpaid'
);

CREATE TYPE "public"."billing_cycle" AS ENUM('monthly', 'yearly');

-- ============================================================================
-- plans
-- ============================================================================

CREATE TABLE "plans" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "name" text NOT NULL,
  "slug" text NOT NULL,
  "description" text,
  "price_monthly" integer NOT NULL,
  "price_yearly" integer NOT NULL,
  "currency" text DEFAULT 'usd' NOT NULL,
  "features" text NOT NULL,
  "limits" text NOT NULL,
  "is_active" boolean DEFAULT true NOT NULL,
  "display_order" integer DEFAULT 0 NOT NULL,
  "trial_days" integer DEFAULT 0 NOT NULL,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  "updated_at" timestamp with time zone DEFAULT now() NOT NULL,
  CONSTRAINT "plans_slug_unique" UNIQUE("slug")
);

ALTER TABLE "plans" ENABLE ROW LEVEL SECURITY;

CREATE INDEX "plans_slug_idx" ON "plans" USING btree ("slug");
CREATE INDEX "plans_active_order_idx" ON "plans" USING btree ("is_active", "display_order");

-- Plans are a public catalog — any authenticated user can read
CREATE POLICY "plans_select" ON "plans"
  AS PERMISSIVE FOR SELECT
  TO "authenticated"
  USING (true);

-- All writes via service_role only
CREATE POLICY "plans_insert" ON "plans"
  AS PERMISSIVE FOR INSERT
  TO "service_role"
  WITH CHECK (true);

CREATE POLICY "plans_update" ON "plans"
  AS PERMISSIVE FOR UPDATE
  TO "service_role"
  USING (true)
  WITH CHECK (true);

CREATE POLICY "plans_delete" ON "plans"
  AS PERMISSIVE FOR DELETE
  TO "service_role"
  USING (true);

-- ============================================================================
-- tenant_subscriptions
-- ============================================================================

CREATE TABLE "tenant_subscriptions" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "tenant_id" uuid NOT NULL,
  "plan_id" uuid NOT NULL,
  "status" "subscription_status" NOT NULL,
  "billing_cycle" "billing_cycle" NOT NULL,
  "current_period_start" timestamp with time zone NOT NULL,
  "current_period_end" timestamp with time zone NOT NULL,
  "cancel_at_period_end" boolean DEFAULT false NOT NULL,
  "canceled_at" timestamp with time zone,
  "trial_ends_at" timestamp with time zone,
  "grace_ends_at" timestamp with time zone,
  "external_subscription_id" text,
  "external_customer_id" text,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  "updated_at" timestamp with time zone DEFAULT now() NOT NULL,
  CONSTRAINT "tenant_subscriptions_tenant_id_unique" UNIQUE("tenant_id"),
  CONSTRAINT "tenant_subscriptions_external_subscription_id_unique" UNIQUE("external_subscription_id")
);

ALTER TABLE "tenant_subscriptions"
  ADD CONSTRAINT "tenant_subscriptions_tenant_id_tenants_id_fk"
  FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE cascade ON UPDATE no action;

ALTER TABLE "tenant_subscriptions"
  ADD CONSTRAINT "tenant_subscriptions_plan_id_plans_id_fk"
  FOREIGN KEY ("plan_id") REFERENCES "public"."plans"("id") ON DELETE no action ON UPDATE no action;

ALTER TABLE "tenant_subscriptions" ENABLE ROW LEVEL SECURITY;

CREATE INDEX "subscriptions_tenant_idx" ON "tenant_subscriptions" USING btree ("tenant_id");
CREATE INDEX "subscriptions_external_id_idx" ON "tenant_subscriptions" USING btree ("external_subscription_id");
CREATE INDEX "subscriptions_status_idx" ON "tenant_subscriptions" USING btree ("status");

-- Only owner and admin can read their tenant's subscription
CREATE POLICY "subscriptions_select" ON "tenant_subscriptions"
  AS PERMISSIVE FOR SELECT
  TO "authenticated"
  USING (
    ((auth.jwt()->'app_metadata'->>'tenant_id')::uuid = tenant_id)
    AND (auth.jwt()->'app_metadata'->>'role' IN ('owner', 'admin'))
  );

-- All writes via service_role only (webhook handler + service layer)
CREATE POLICY "subscriptions_insert_sr" ON "tenant_subscriptions"
  AS PERMISSIVE FOR INSERT
  TO "service_role"
  WITH CHECK (true);

CREATE POLICY "subscriptions_update_sr" ON "tenant_subscriptions"
  AS PERMISSIVE FOR UPDATE
  TO "service_role"
  USING (true)
  WITH CHECK (true);

-- No DELETE policy — status transitions only, never hard delete

-- ============================================================================
-- billing_events
-- ============================================================================

CREATE TABLE "billing_events" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "tenant_id" uuid NOT NULL,
  "subscription_id" uuid,
  "event_type" text NOT NULL,
  "provider" text NOT NULL,
  "external_event_id" text,
  "payload" text,
  "processed_at" timestamp with time zone,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  CONSTRAINT "billing_events_external_event_id_unique" UNIQUE("external_event_id")
);

ALTER TABLE "billing_events"
  ADD CONSTRAINT "billing_events_tenant_id_tenants_id_fk"
  FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE cascade ON UPDATE no action;

ALTER TABLE "billing_events"
  ADD CONSTRAINT "billing_events_subscription_id_tenant_subscriptions_id_fk"
  FOREIGN KEY ("subscription_id") REFERENCES "public"."tenant_subscriptions"("id") ON DELETE no action ON UPDATE no action;

ALTER TABLE "billing_events" ENABLE ROW LEVEL SECURITY;

CREATE INDEX "billing_events_tenant_idx" ON "billing_events" USING btree ("tenant_id");
CREATE INDEX "billing_events_external_event_idx" ON "billing_events" USING btree ("external_event_id");
CREATE INDEX "billing_events_subscription_idx" ON "billing_events" USING btree ("subscription_id");

-- Only owner and admin can read their tenant's billing events
CREATE POLICY "billing_events_select" ON "billing_events"
  AS PERMISSIVE FOR SELECT
  TO "authenticated"
  USING (
    ((auth.jwt()->'app_metadata'->>'tenant_id')::uuid = tenant_id)
    AND (auth.jwt()->'app_metadata'->>'role' IN ('owner', 'admin'))
  );

-- All writes via service_role only — immutable after insert
CREATE POLICY "billing_events_insert_sr" ON "billing_events"
  AS PERMISSIVE FOR INSERT
  TO "service_role"
  WITH CHECK (true);

-- No UPDATE — immutable after insert
-- No DELETE — audit records must be retained

-- ============================================================================
-- Reload PostgREST schema cache
-- ============================================================================

NOTIFY pgrst, 'reload schema';
