CREATE TYPE "public"."onboarding_state" AS ENUM('not_started', 'in_progress', 'activated');--> statement-breakpoint
CREATE TABLE "tenant_onboarding_progress" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" uuid NOT NULL,
	"state" "onboarding_state" DEFAULT 'not_started' NOT NULL,
	"baseline_completed_at" timestamp with time zone,
	"first_invite_completed_at" timestamp with time zone,
	"sample_data_completed_at" timestamp with time zone,
	"dismissed" boolean DEFAULT false NOT NULL,
	"dismissed_at" timestamp with time zone,
	"activated_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "tenant_onboarding_progress_tenant_id_unique" UNIQUE("tenant_id")
);
--> statement-breakpoint
ALTER TABLE "tenant_onboarding_progress" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "tenant_onboarding_progress" ADD CONSTRAINT "tenant_onboarding_progress_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "onboarding_tenant_idx" ON "tenant_onboarding_progress" USING btree ("tenant_id");--> statement-breakpoint
CREATE INDEX "onboarding_state_idx" ON "tenant_onboarding_progress" USING btree ("state");--> statement-breakpoint
CREATE POLICY "onboarding_select" ON "tenant_onboarding_progress" AS PERMISSIVE FOR SELECT TO "authenticated" USING ((((auth.jwt()->'app_metadata'->>'tenant_id')::uuid = tenant_id) AND (auth.jwt()->'app_metadata'->>'role' = 'owner')));--> statement-breakpoint
CREATE POLICY "onboarding_insert" ON "tenant_onboarding_progress" AS PERMISSIVE FOR INSERT TO "authenticated" WITH CHECK ((((auth.jwt()->'app_metadata'->>'tenant_id')::uuid = tenant_id) AND (auth.jwt()->'app_metadata'->>'role' = 'owner')));--> statement-breakpoint
CREATE POLICY "onboarding_update" ON "tenant_onboarding_progress" AS PERMISSIVE FOR UPDATE TO "authenticated" USING ((((auth.jwt()->'app_metadata'->>'tenant_id')::uuid = tenant_id) AND (auth.jwt()->'app_metadata'->>'role' = 'owner'))) WITH CHECK ((((auth.jwt()->'app_metadata'->>'tenant_id')::uuid = tenant_id) AND (auth.jwt()->'app_metadata'->>'role' = 'owner')));--> statement-breakpoint
CREATE POLICY "onboarding_delete" ON "tenant_onboarding_progress" AS PERMISSIVE FOR DELETE TO "service_role" USING (true);