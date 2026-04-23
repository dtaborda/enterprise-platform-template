CREATE TYPE "public"."resource_type" AS ENUM('product', 'service', 'asset', 'document', 'other');--> statement-breakpoint
CREATE TYPE "public"."resource_status" AS ENUM('active', 'draft', 'archived', 'suspended');--> statement-breakpoint
CREATE TABLE "resources" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" uuid NOT NULL,
	"title" text NOT NULL,
	"type" "resource_type" NOT NULL,
	"status" "resource_status" DEFAULT 'active' NOT NULL,
	"description" text,
	"metadata" text,
	"image_urls" text,
	"created_by" uuid NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "resources" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE INDEX "resources_tenant_idx" ON "resources" USING btree ("tenant_id");--> statement-breakpoint
CREATE INDEX "resources_status_idx" ON "resources" USING btree ("status");--> statement-breakpoint
CREATE INDEX "resources_type_idx" ON "resources" USING btree ("type");--> statement-breakpoint
CREATE INDEX "resources_created_by_idx" ON "resources" USING btree ("created_by");--> statement-breakpoint
CREATE POLICY "resources_select" ON "resources" AS PERMISSIVE FOR SELECT TO "authenticated" USING (((auth.jwt()->'app_metadata'->>'tenant_id')::uuid = tenant_id));--> statement-breakpoint
CREATE POLICY "resources_insert" ON "resources" AS PERMISSIVE FOR INSERT TO "authenticated" WITH CHECK ((((auth.jwt()->'app_metadata'->>'tenant_id')::uuid = tenant_id) AND (auth.jwt()->'app_metadata'->>'role' IN ('owner', 'admin'))));--> statement-breakpoint
CREATE POLICY "resources_update" ON "resources" AS PERMISSIVE FOR UPDATE TO "authenticated" USING ((((auth.jwt()->'app_metadata'->>'tenant_id')::uuid = tenant_id) AND (auth.jwt()->'app_metadata'->>'role' IN ('owner', 'admin')))) WITH CHECK ((((auth.jwt()->'app_metadata'->>'tenant_id')::uuid = tenant_id) AND (auth.jwt()->'app_metadata'->>'role' IN ('owner', 'admin'))));--> statement-breakpoint
CREATE POLICY "resources_delete" ON "resources" AS PERMISSIVE FOR DELETE TO "authenticated" USING ((((auth.jwt()->'app_metadata'->>'tenant_id')::uuid = tenant_id) AND (auth.jwt()->'app_metadata'->>'role' IN ('owner', 'admin'))));--> statement-breakpoint
CREATE TRIGGER resources_updated_at
  BEFORE UPDATE ON resources
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at();
