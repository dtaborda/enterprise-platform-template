-- PostgREST caches schema metadata on startup.
-- The tenant_invitations table is created in the previous migration,
-- so we force a schema reload to make the new table immediately visible
-- to Supabase REST and server components during E2E/CI runs.

NOTIFY pgrst, 'reload schema';
