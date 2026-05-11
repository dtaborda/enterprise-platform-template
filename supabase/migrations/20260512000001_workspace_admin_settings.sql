-- Migration: workspace_admin_settings
-- Adds workspace admin columns to tenants table and creates storage bucket for logos

-- ============================================================================
-- Extend tenants table with workspace admin columns
-- ============================================================================

ALTER TABLE public.tenants
  ADD COLUMN IF NOT EXISTS logo_path text,
  ADD COLUMN IF NOT EXISTS timezone text NOT NULL DEFAULT 'UTC',
  ADD COLUMN IF NOT EXISTS locale text NOT NULL DEFAULT 'en-US',
  ADD COLUMN IF NOT EXISTS allow_admin_invites boolean NOT NULL DEFAULT true;

-- ============================================================================
-- Storage bucket: workspace-logos (private, 2MB limit, image types only)
-- ============================================================================

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'workspace-logos',
  'workspace-logos',
  false,
  2097152,
  ARRAY['image/png', 'image/jpeg', 'image/webp']
)
ON CONFLICT (id) DO NOTHING;

-- ============================================================================
-- RLS policies for storage.objects (workspace-logos bucket)
-- ============================================================================

-- SELECT: any authenticated member of the tenant can read logos
CREATE POLICY "workspace_logos_select"
  ON storage.objects
  FOR SELECT
  TO authenticated
  USING (
    bucket_id = 'workspace-logos'
    AND (storage.foldername(name))[1] = (auth.jwt()->'app_metadata'->>'tenant_id')
  );

-- INSERT: only owner or admin can upload logos
CREATE POLICY "workspace_logos_insert"
  ON storage.objects
  FOR INSERT
  TO authenticated
  WITH CHECK (
    bucket_id = 'workspace-logos'
    AND (storage.foldername(name))[1] = (auth.jwt()->'app_metadata'->>'tenant_id')
    AND (auth.jwt()->'app_metadata'->>'role' IN ('owner', 'admin'))
  );

-- UPDATE: only owner or admin can replace logos
CREATE POLICY "workspace_logos_update"
  ON storage.objects
  FOR UPDATE
  TO authenticated
  USING (
    bucket_id = 'workspace-logos'
    AND (storage.foldername(name))[1] = (auth.jwt()->'app_metadata'->>'tenant_id')
    AND (auth.jwt()->'app_metadata'->>'role' IN ('owner', 'admin'))
  )
  WITH CHECK (
    bucket_id = 'workspace-logos'
    AND (storage.foldername(name))[1] = (auth.jwt()->'app_metadata'->>'tenant_id')
    AND (auth.jwt()->'app_metadata'->>'role' IN ('owner', 'admin'))
  );

-- DELETE: only owner or admin can remove logos
CREATE POLICY "workspace_logos_delete"
  ON storage.objects
  FOR DELETE
  TO authenticated
  USING (
    bucket_id = 'workspace-logos'
    AND (storage.foldername(name))[1] = (auth.jwt()->'app_metadata'->>'tenant_id')
    AND (auth.jwt()->'app_metadata'->>'role' IN ('owner', 'admin'))
  );

-- ============================================================================
-- Notify PostgREST to reload schema
-- ============================================================================

NOTIFY pgrst, 'reload schema';
