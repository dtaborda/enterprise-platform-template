-- Create invitation_status enum
CREATE TYPE "public"."invitation_status" AS ENUM('pending', 'accepted', 'revoked', 'expired');--> statement-breakpoint

-- Create tenant_invitations table
CREATE TABLE "tenant_invitations" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" uuid NOT NULL,
	"email" text NOT NULL,
	"role" "user_role" DEFAULT 'member' NOT NULL,
	"token_hash" text NOT NULL,
	"status" "invitation_status" DEFAULT 'pending' NOT NULL,
	"invited_by" uuid NOT NULL,
	"accepted_by" uuid,
	"expires_at" timestamp with time zone NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "tenant_invitations_token_hash_unique" UNIQUE("token_hash")
);--> statement-breakpoint

-- Add foreign key to tenants
ALTER TABLE "tenant_invitations" ADD CONSTRAINT "tenant_invitations_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint

-- Enable RLS
ALTER TABLE "tenant_invitations" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint

-- Create indexes
CREATE INDEX "invitations_tenant_idx" ON "tenant_invitations" USING btree ("tenant_id");--> statement-breakpoint
CREATE INDEX "invitations_email_idx" ON "tenant_invitations" USING btree ("email");--> statement-breakpoint
CREATE INDEX "invitations_token_hash_idx" ON "tenant_invitations" USING btree ("token_hash");--> statement-breakpoint
CREATE INDEX "invitations_status_idx" ON "tenant_invitations" USING btree ("status");--> statement-breakpoint

-- RLS Policies
-- SELECT: authenticated users who belong to the tenant and are admin or owner
CREATE POLICY "invitations_select" ON "tenant_invitations"
  AS PERMISSIVE FOR SELECT
  TO "authenticated"
  USING (
    ((auth.jwt()->'app_metadata'->>'tenant_id')::uuid = tenant_id)
    AND (auth.jwt()->'app_metadata'->>'role' IN ('owner', 'admin'))
  );--> statement-breakpoint

-- INSERT: authenticated admin/owner of the same tenant
CREATE POLICY "invitations_insert" ON "tenant_invitations"
  AS PERMISSIVE FOR INSERT
  TO "authenticated"
  WITH CHECK (
    ((auth.jwt()->'app_metadata'->>'tenant_id')::uuid = tenant_id)
    AND (auth.jwt()->'app_metadata'->>'role' IN ('owner', 'admin'))
  );--> statement-breakpoint

-- UPDATE: authenticated admin/owner of the same tenant (for status changes: revoke, accept)
CREATE POLICY "invitations_update" ON "tenant_invitations"
  AS PERMISSIVE FOR UPDATE
  TO "authenticated"
  USING (
    ((auth.jwt()->'app_metadata'->>'tenant_id')::uuid = tenant_id)
    AND (auth.jwt()->'app_metadata'->>'role' IN ('owner', 'admin'))
  )
  WITH CHECK (
    ((auth.jwt()->'app_metadata'->>'tenant_id')::uuid = tenant_id)
    AND (auth.jwt()->'app_metadata'->>'role' IN ('owner', 'admin'))
  );--> statement-breakpoint

-- DELETE: service role only (invitations are soft-revoked, not hard-deleted by users)
CREATE POLICY "invitations_delete" ON "tenant_invitations"
  AS PERMISSIVE FOR DELETE
  TO "service_role"
  USING (true);--> statement-breakpoint

-- Auto-update updated_at timestamp
CREATE TRIGGER tenant_invitations_updated_at
  BEFORE UPDATE ON tenant_invitations
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at();
