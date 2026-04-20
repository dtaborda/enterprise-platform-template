-- Seed data for local development and E2E tests
-- Applied automatically after migrations on `supabase db reset`
--
-- Test user credentials:
--   Email:    admin@enterprise.dev
--   Password: password123
--
-- We disable the on_auth_user_created trigger to avoid conflicts
-- (the trigger auto-creates tenant + profile, but we want explicit control
-- over IDs and roles for deterministic E2E tests).

-- Disable the auto-onboarding trigger during seeding
ALTER TABLE auth.users DISABLE TRIGGER on_auth_user_created;

-- 1. Create the test tenant
INSERT INTO tenants (id, name, slug, status, created_at, updated_at)
VALUES (
  '00000000-0000-0000-0000-000000000001',
  'Enterprise Demo',
  'enterprise-demo',
  'active',
  NOW(),
  NOW()
);

-- 2. Create test user in auth.users with ALL fields GoTrue expects
INSERT INTO auth.users (
  instance_id,
  id,
  aud,
  role,
  email,
  encrypted_password,
  email_confirmed_at,
  last_sign_in_at,
  raw_app_meta_data,
  raw_user_meta_data,
  created_at,
  updated_at,
  confirmation_token,
  recovery_token,
  email_change,
  email_change_token_new,
  email_change_token_current,
  email_change_confirm_status,
  phone,
  phone_change,
  phone_change_token,
  reauthentication_token,
  is_sso_user,
  is_anonymous
) VALUES (
  '00000000-0000-0000-0000-000000000000',
  'a1b2c3d4-e5f6-7890-abcd-ef1234567890',
  'authenticated',
  'authenticated',
  'admin@enterprise.dev',
  crypt('password123', gen_salt('bf')),
  NOW(),
  NOW(),
  '{"provider":"email","providers":["email"]}',
  '{"full_name":"Admin Demo","tenant_id":"00000000-0000-0000-0000-000000000001"}',
  NOW(),
  NOW(),
  '',
  '',
  '',
  '',
  '',
  0,
  '',
  '',
  '',
  '',
  FALSE,
  FALSE
);

-- 3. Create identity (required for GoTrue email/password auth)
INSERT INTO auth.identities (
  id,
  user_id,
  provider_id,
  identity_data,
  provider,
  last_sign_in_at,
  created_at,
  updated_at
) VALUES (
  'a1b2c3d4-e5f6-7890-abcd-ef1234567890',
  'a1b2c3d4-e5f6-7890-abcd-ef1234567890',
  'admin@enterprise.dev',
  '{"sub":"a1b2c3d4-e5f6-7890-abcd-ef1234567890","email":"admin@enterprise.dev","email_verified":true}',
  'email',
  NOW(),
  NOW(),
  NOW()
);

-- 4. Create profile for the test user
INSERT INTO profiles (id, tenant_id, email, name, role, created_at, updated_at)
VALUES (
  'a1b2c3d4-e5f6-7890-abcd-ef1234567890',
  '00000000-0000-0000-0000-000000000001',
  'admin@enterprise.dev',
  'Admin Demo',
  'owner',
  NOW(),
  NOW()
);

-- Re-enable the trigger for normal operation
ALTER TABLE auth.users ENABLE TRIGGER on_auth_user_created;
