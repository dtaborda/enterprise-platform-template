CREATE TYPE "public"."audit_action" AS ENUM('create', 'read', 'update', 'delete', 'login', 'logout', 'custom');--> statement-breakpoint
CREATE TYPE "public"."tenant_status" AS ENUM('active', 'inactive', 'suspended');--> statement-breakpoint
CREATE TYPE "public"."user_role" AS ENUM('owner', 'admin', 'member', 'guest');--> statement-breakpoint
CREATE TABLE "audit_log" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" uuid NOT NULL,
	"user_id" uuid NOT NULL,
	"action" "audit_action" NOT NULL,
	"resource" text NOT NULL,
	"resource_id" uuid,
	"metadata" text,
	"ip_address" text,
	"user_agent" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "audit_log" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "profiles" (
	"id" uuid PRIMARY KEY NOT NULL,
	"tenant_id" uuid NOT NULL,
	"email" text NOT NULL,
	"name" text,
	"avatar_url" text,
	"role" "user_role" DEFAULT 'member' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "profiles" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "tenants" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" text NOT NULL,
	"slug" text NOT NULL,
	"status" "tenant_status" DEFAULT 'active' NOT NULL,
	"settings" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "tenants_slug_unique" UNIQUE("slug")
);
--> statement-breakpoint
ALTER TABLE "tenants" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "user_roles" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"tenant_id" uuid NOT NULL,
	"role" "user_role" NOT NULL,
	"granted_by" uuid NOT NULL,
	"granted_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "user_roles" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE INDEX "audit_log_tenant_idx" ON "audit_log" USING btree ("tenant_id");--> statement-breakpoint
CREATE INDEX "audit_log_user_idx" ON "audit_log" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "audit_log_resource_idx" ON "audit_log" USING btree ("resource");--> statement-breakpoint
CREATE INDEX "audit_log_created_idx" ON "audit_log" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX "profiles_tenant_idx" ON "profiles" USING btree ("tenant_id");--> statement-breakpoint
CREATE INDEX "profiles_email_idx" ON "profiles" USING btree ("email");--> statement-breakpoint
CREATE INDEX "tenants_slug_idx" ON "tenants" USING btree ("slug");--> statement-breakpoint
CREATE INDEX "tenants_status_idx" ON "tenants" USING btree ("status");--> statement-breakpoint
CREATE INDEX "user_roles_user_tenant_idx" ON "user_roles" USING btree ("user_id","tenant_id");--> statement-breakpoint
CREATE POLICY "audit_log_select" ON "audit_log" AS PERMISSIVE FOR SELECT TO "authenticated" USING ((((auth.jwt()->'app_metadata'->>'tenant_id')::uuid = tenant_id) AND (auth.jwt()->'app_metadata'->>'role' IN ('owner', 'admin'))));--> statement-breakpoint
CREATE POLICY "audit_log_insert" ON "audit_log" AS PERMISSIVE FOR INSERT TO "authenticated" WITH CHECK ((((auth.jwt()->'app_metadata'->>'tenant_id')::uuid = tenant_id) AND auth.uid() = user_id));--> statement-breakpoint
CREATE POLICY "profiles_select" ON "profiles" AS PERMISSIVE FOR SELECT TO "authenticated" USING (((auth.jwt()->'app_metadata'->>'tenant_id')::uuid = tenant_id));--> statement-breakpoint
CREATE POLICY "profiles_insert" ON "profiles" AS PERMISSIVE FOR INSERT TO "authenticated" WITH CHECK ((auth.uid() = id AND ((auth.jwt()->'app_metadata'->>'tenant_id')::uuid = tenant_id)));--> statement-breakpoint
CREATE POLICY "profiles_update" ON "profiles" AS PERMISSIVE FOR UPDATE TO "authenticated" USING ((((auth.jwt()->'app_metadata'->>'tenant_id')::uuid = tenant_id) AND (auth.jwt()->'app_metadata'->>'role' IN ('owner', 'admin')))) WITH CHECK ((((auth.jwt()->'app_metadata'->>'tenant_id')::uuid = tenant_id) AND (auth.jwt()->'app_metadata'->>'role' IN ('owner', 'admin'))));--> statement-breakpoint
CREATE POLICY "tenants_select" ON "tenants" AS PERMISSIVE FOR SELECT TO "authenticated" USING (((auth.jwt()->'app_metadata'->>'tenant_id')::uuid = id));--> statement-breakpoint
CREATE POLICY "tenants_insert" ON "tenants" AS PERMISSIVE FOR INSERT TO "service_role" WITH CHECK (true);--> statement-breakpoint
CREATE POLICY "tenants_update" ON "tenants" AS PERMISSIVE FOR UPDATE TO "service_role" USING (true) WITH CHECK (true);--> statement-breakpoint
CREATE POLICY "user_roles_select" ON "user_roles" AS PERMISSIVE FOR SELECT TO "authenticated" USING (((auth.jwt()->'app_metadata'->>'tenant_id')::uuid = tenant_id));--> statement-breakpoint
CREATE POLICY "user_roles_insert" ON "user_roles" AS PERMISSIVE FOR INSERT TO "authenticated" WITH CHECK ((((auth.jwt()->'app_metadata'->>'tenant_id')::uuid = tenant_id) AND (auth.jwt()->'app_metadata'->>'role' IN ('owner', 'admin'))));
