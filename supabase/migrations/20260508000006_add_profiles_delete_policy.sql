-- Allow tenant owners/admins to remove profiles within their tenant.
-- This is required by tenant team management's remove member flow.

CREATE POLICY "profiles_delete" ON "profiles"
  AS PERMISSIVE FOR DELETE
  TO "authenticated"
  USING (
    ((auth.jwt()->'app_metadata'->>'tenant_id')::uuid = tenant_id)
    AND (auth.jwt()->'app_metadata'->>'role' IN ('owner', 'admin'))
  );
