# ADR 002: RLS Helper Functions for Multi-Tenant Isolation

## Status
Accepted

## Context
RLS policies in Drizzle need to reference Postgres functions to get tenant/user context from the auth token. These functions must be created via custom migrations.

## Decision

### Required Postgres Functions
These functions must be created in the database via migration:

```sql
-- Returns the tenant_id of the current user from profiles table
CREATE OR REPLACE FUNCTION public.tenant_id() RETURNS uuid 
  SECURITY DEFINER AS $$
  BEGIN
    RETURN nullif(current_setting('request.jwt.claims', true)::json->>'tenant_id', '')::uuid;
  END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Returns the role of the current user from profiles table  
CREATE OR REPLACE FUNCTION public.user_role() RETURNS text
  SECURITY DEFINER AS $$
  BEGIN
    RETURN current_setting('request.jwt.claims', true)::json->>'role';
  END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Returns the user_id from JWT
CREATE OR REPLACE FUNCTION public.user_id() RETURNS uuid
  SECURITY DEFINER AS $$
  BEGIN
    RETURN nullif(current_setting('request.jwt.claims', true)::json->>'sub', '')::uuid;
  END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
```

### Helper Exports
In `packages/db/src/helpers.ts`:
```typescript
export const isTenantMember = sql`tenant_id = public.tenant_id()`;
export const isAdminOrAbove = sql`public.user_role() IN ('owner', 'admin')`;
```

### JWT Claims Configuration
Supabase auth JWT must include:
```json
{
  "tenant_id": "uuid-of-tenant",
  "role": "admin|member|guest"
}
```

This requires a Supabase trigger on profile insert/update to set custom claims.

## Consequences
- RLS policies automatically filter by tenant
- Role-based access control is enforced at DB level
- Helper functions must be in `public` schema (Supabase restricts auth schema)

## References
- Drizzle RLS: https://orm.drizzle.team/docs/rls
- Supabase JWT: https://supabase.com/docs/guides/auth/jwt
- Source implementation: `/Users/damiantaborda/ws/gallo/sala-tickets-app/packages/db/src/helpers.ts`