CREATE TYPE "public"."notification_category" AS ENUM('team', 'billing', 'system');--> statement-breakpoint
CREATE TYPE "public"."notification_type" AS ENUM('team_invited', 'team_invitation_accepted', 'team_role_changed', 'team_removed', 'billing_past_due', 'billing_plan_upgraded', 'billing_plan_downgraded', 'billing_canceled', 'billing_activated');--> statement-breakpoint
CREATE TABLE "notification_preferences" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"tenant_id" uuid NOT NULL,
	"category" "notification_category" NOT NULL,
	"in_app_enabled" boolean DEFAULT true NOT NULL,
	"email_enabled" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "preferences_user_tenant_category_unique" UNIQUE("user_id","tenant_id","category")
);
--> statement-breakpoint
ALTER TABLE "notification_preferences" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "notifications" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" uuid NOT NULL,
	"user_id" uuid NOT NULL,
	"type" "notification_type" NOT NULL,
	"category" "notification_category" NOT NULL,
	"title" text NOT NULL,
	"body" text NOT NULL,
	"metadata" text,
	"is_read" boolean DEFAULT false NOT NULL,
	"read_at" timestamp with time zone,
	"source_event" text,
	"source_entity_id" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "notifications" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "notification_preferences" ADD CONSTRAINT "notification_preferences_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "notifications" ADD CONSTRAINT "notifications_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "preferences_user_tenant_idx" ON "notification_preferences" USING btree ("user_id","tenant_id");--> statement-breakpoint
CREATE INDEX "notifications_user_tenant_idx" ON "notifications" USING btree ("user_id","tenant_id");--> statement-breakpoint
CREATE INDEX "notifications_user_unread_idx" ON "notifications" USING btree ("user_id","tenant_id","is_read");--> statement-breakpoint
CREATE INDEX "notifications_category_idx" ON "notifications" USING btree ("category");--> statement-breakpoint
CREATE INDEX "notifications_created_at_idx" ON "notifications" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX "notifications_source_event_idx" ON "notifications" USING btree ("source_event");--> statement-breakpoint
CREATE POLICY "preferences_select" ON "notification_preferences" AS PERMISSIVE FOR SELECT TO "authenticated" USING (((user_id = auth.uid()) AND ((auth.jwt()->'app_metadata'->>'tenant_id')::uuid = tenant_id)));--> statement-breakpoint
CREATE POLICY "preferences_insert" ON "notification_preferences" AS PERMISSIVE FOR INSERT TO "authenticated" WITH CHECK (((user_id = auth.uid()) AND ((auth.jwt()->'app_metadata'->>'tenant_id')::uuid = tenant_id)));--> statement-breakpoint
CREATE POLICY "preferences_update" ON "notification_preferences" AS PERMISSIVE FOR UPDATE TO "authenticated" USING (((user_id = auth.uid()) AND ((auth.jwt()->'app_metadata'->>'tenant_id')::uuid = tenant_id))) WITH CHECK (((user_id = auth.uid()) AND ((auth.jwt()->'app_metadata'->>'tenant_id')::uuid = tenant_id)));--> statement-breakpoint
CREATE POLICY "notifications_select" ON "notifications" AS PERMISSIVE FOR SELECT TO "authenticated" USING (((user_id = auth.uid()) AND ((auth.jwt()->'app_metadata'->>'tenant_id')::uuid = tenant_id)));--> statement-breakpoint
CREATE POLICY "notifications_insert" ON "notifications" AS PERMISSIVE FOR INSERT TO "service_role" WITH CHECK (true);--> statement-breakpoint
CREATE POLICY "notifications_update" ON "notifications" AS PERMISSIVE FOR UPDATE TO "authenticated" USING (((user_id = auth.uid()) AND ((auth.jwt()->'app_metadata'->>'tenant_id')::uuid = tenant_id))) WITH CHECK (((user_id = auth.uid()) AND ((auth.jwt()->'app_metadata'->>'tenant_id')::uuid = tenant_id)));