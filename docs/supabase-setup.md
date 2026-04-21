# Supabase Project Setup Guide

## Creating a New Supabase Project

1. Go to [supabase.com](https://supabase.com) and create a new project
2. Note the project reference ID (from URL: `https://supabase.com/dashboard/project/[REF]`)
3. Set a secure database password

## Environment Variables

After creating the project, set these environment variables:

```bash
# From Supabase Dashboard → Settings → API
NEXT_PUBLIC_SUPABASE_URL=https://[REF].supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key

# Database connection (Transaction pooler - port 6543)
DATABASE_URL=postgresql://postgres.[REF]:[PASSWORD]@aws-1-us-west-2.pooler.supabase.com:6543/postgres
```

## Required Database Setup

### 1. Enable RLS on all tables

All platform tables have RLS enabled by default. Ensure it's active:

```sql
-- In Supabase SQL Editor
SELECT schemaname, tablename, rowsecurity 
FROM pg_tables 
WHERE schemaname = 'public';
```

### 2. Create RLS Helper Functions

Run the migration in `supabase/migrations/` to create helper functions:

```sql
-- Required for RLS policies
CREATE OR REPLACE FUNCTION public.tenant_id() RETURNS uuid 
  SECURITY DEFINER AS $$
  BEGIN
    RETURN nullif(current_setting('request.jwt.claims', true)::json->>'tenant_id', '')::uuid;
  END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION public.user_role() RETURNS text
  SECURITY DEFINER AS $$
  BEGIN
    RETURN current_setting('request.jwt.claims', true)::json->>'role';
  END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION public.user_id() RETURNS uuid
  SECURITY DEFINER AS $$
  BEGIN
    RETURN nullif(current_setting('request.jwt.claims', true)::json->>'sub', '')::uuid;
  END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
```

### 3. Auth Configuration

In Supabase Dashboard → Authentication → Settings:

- Site URL: Your app URL (e.g., `http://localhost:3000` for dev)
- Redirect URLs: Add your production URL
- Enable email confirmations if needed

### 4. Storage Buckets

Create required storage buckets:

```sql
-- In Supabase SQL Editor
INSERT INTO storage.buckets (id, name, public) VALUES 
  ('avatars', 'avatars', true),
  ('documents', 'documents', false),
  ('images', 'images', true);
```

### 5. Apply Migrations

```bash
# Link to your Supabase project
npx supabase link --project-ref [REF]

# Push migrations
npx supabase db push
```

## Local Development

```bash
# Start local Supabase
supabase start

# Use local URL in .env.local
NEXT_PUBLIC_SUPABASE_URL=http://127.0.0.1:54331
# Anon key from `supabase status`
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJ...
```

## Local auth testing setup

Use this setup to run deterministic auth unit/E2E tests locally.

### Required local services

- Supabase local stack (`supabase start`)
- Inbucket email capture (`http://localhost:54334` from `supabase/config.toml`)

### Local auth assumptions

- `supabase/config.toml` uses `[auth.email] enable_confirmations = false` for local development.
- Seeded users are pre-confirmed (`email_confirmed_at` set), so local login is available immediately.

### Deterministic test credentials

- `admin@enterprise.dev` / `password123` → owner
- `member@enterprise.dev` / `password123` → member
- `guest@enterprise.dev` / `password123` → guest
- `reset@enterprise.dev` / `password123` → member (password reset flow)
- `reset2@enterprise.dev` / `password123` → member (retry backup)

### Inbucket endpoints used by E2E

Auth reset tests use:
- `GET /api/v1/mailbox/{mailbox}`
- `GET /api/v1/mailbox/{mailbox}/{id}`
- `DELETE /api/v1/mailbox/{mailbox}`

Default base URL:
- `http://localhost:54334`

Override with:

```bash
INBUCKET_URL=http://localhost:54334
```
