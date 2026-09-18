-- Harden the trigger functions created in 20260420000002_custom_triggers.sql
--
-- WHY
-- The Supabase database linter reported three findings against this project:
--
--   1. function_search_path_mutable
--      `public.handle_new_user` and `public.update_updated_at` had no fixed
--      `search_path`. A SECURITY DEFINER function with a caller-influenced
--      search_path is the classic privilege-escalation vector: an attacker who
--      can prepend a schema shadows `public.tenants` / `public.profiles` with
--      their own tables, and the function writes to those instead.
--
--   2. anon_security_definer_function_executable
--   3. authenticated_security_definer_function_executable
--      `public.handle_new_user()` lives in the PostgREST-exposed `public`
--      schema, so it was callable as `POST /rest/v1/rpc/handle_new_user` by the
--      `anon` and `authenticated` roles. Neither role has any reason to invoke
--      it directly — it exists solely as an AFTER INSERT trigger on auth.users.
--
-- SAFETY OF THE REVOKE
-- Revoking EXECUTE does NOT disable the trigger. PostgreSQL checks EXECUTE on
-- the trigger function when the TRIGGER IS CREATED, not on every fire; at fire
-- time the function runs regardless of the inserting role's privileges. This
-- was verified empirically against this database inside a rolled-back
-- transaction: with EXECUTE revoked from anon/authenticated/public, inserting a
-- row into auth.users still produced the tenant row, the profile row with
-- role='owner', and the tenant_id/role claims in raw_app_meta_data.
--
-- CHOICE OF search_path VALUE
-- `public, pg_temp` rather than `''`. Every object reference inside both
-- functions is already schema-qualified (`public.tenants`, `public.profiles`,
-- `auth.users`), so the value only needs to be FIXED, not empty. Pinning it at
-- the function level makes it immutable for callers, which is what the linter
-- asks for.

-- ============================================================================
-- 1. Pin search_path
-- ============================================================================

ALTER FUNCTION public.handle_new_user() SET search_path = public, pg_temp;
ALTER FUNCTION public.update_updated_at() SET search_path = public, pg_temp;

-- ============================================================================
-- 2. Remove the PostgREST RPC surface
-- ============================================================================
-- Both are trigger-only functions. No client role should be able to call them.

REVOKE EXECUTE ON FUNCTION public.handle_new_user() FROM anon, authenticated, public;
REVOKE EXECUTE ON FUNCTION public.update_updated_at() FROM anon, authenticated, public;
