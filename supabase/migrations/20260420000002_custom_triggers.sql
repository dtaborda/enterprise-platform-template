-- Migration 2: Triggers and trigger functions
-- Must run AFTER schema migration (tables must exist).
--
-- Contains two trigger systems:
--   1. update_updated_at — Auto-set updated_at on row update
--   2. handle_new_user  — Auto-create tenant + profile on auth signup


-- ============================================================
-- 1. UPDATED_AT TRIGGER
-- ============================================================
-- Automatically sets updated_at = NOW() on every UPDATE.

CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER set_updated_at BEFORE UPDATE ON tenants
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER set_updated_at BEFORE UPDATE ON profiles
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();


-- ============================================================
-- 2. HANDLE NEW USER — Onboarding trigger
-- ============================================================
-- When a user registers via Supabase Auth, this trigger
-- automatically creates:
--   a) A new tenant (using metadata from the signup form)
--   b) A profile record linking the user to the new tenant
--
-- The user becomes owner of their own tenant.
--
-- SECURITY DEFINER is required because this function writes to
-- tenants and profiles tables, which have RLS enabled.

CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
DECLARE
  new_tenant_id UUID;
BEGIN
  -- Create tenant for the new user
  INSERT INTO public.tenants (name, slug)
  VALUES (
    COALESCE(NEW.raw_user_meta_data->>'company_name', 'My Organization'),
    COALESCE(NEW.raw_user_meta_data->>'slug', 'org-' || LEFT(NEW.id::TEXT, 8))
  )
  RETURNING id INTO new_tenant_id;

  -- Create profile linked to the new tenant
  INSERT INTO public.profiles (id, tenant_id, email, name, role)
  VALUES (
    NEW.id,
    new_tenant_id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'full_name', ''),
    'owner'
  );

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION handle_new_user();
