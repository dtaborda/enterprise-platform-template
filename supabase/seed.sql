-- Seed data for local development and E2E tests
-- Applied automatically after migrations on `supabase db reset`
--
-- Deterministic test user credentials:
--   admin@enterprise.dev      / password123 (owner)
--   member@enterprise.dev     / password123 (member)
--   guest@enterprise.dev      / password123 (guest)
--   reset@enterprise.dev      / password123 (member, dedicated reset flow)
--   reset2@enterprise.dev     / password123 (member, retry backup)
--   admin-role@enterprise.dev / password123 (admin — workspace-admin E2E)
--
-- The INSERT into auth.users triggers handle_new_user() which
-- auto-creates the tenant ("Enterprise Demo") and profile (owner role).

-- Create deterministic test users with all required GoTrue fields.
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
)
VALUES
  (
    '00000000-0000-0000-0000-000000000000',
    'a1b2c3d4-e5f6-7890-abcd-ef1234567890',
    'authenticated',
    'authenticated',
    'admin@enterprise.dev',
    crypt('password123', gen_salt('bf')),
    NOW(),
    NOW(),
    '{"provider":"email","providers":["email"]}',
    '{"full_name":"Admin Demo","company_name":"Enterprise Demo","slug":"enterprise-demo"}',
    NOW(),
    NOW(),
    '',
    '',
    '',
    '',
    '',
    0,
    '+10000000001',
    '',
    '',
    '',
    FALSE,
    FALSE
  ),
  (
    '00000000-0000-0000-0000-000000000000',
    'b1b2c3d4-e5f6-7890-abcd-ef1234567890',
    'authenticated',
    'authenticated',
    'member@enterprise.dev',
    crypt('password123', gen_salt('bf')),
    NOW(),
    NOW(),
    '{"provider":"email","providers":["email"]}',
    '{"full_name":"Member Demo","company_name":"Member Org","slug":"member-org"}',
    NOW(),
    NOW(),
    '',
    '',
    '',
    '',
    '',
    0,
    '+10000000002',
    '',
    '',
    '',
    FALSE,
    FALSE
  ),
  (
    '00000000-0000-0000-0000-000000000000',
    'c1b2c3d4-e5f6-7890-abcd-ef1234567890',
    'authenticated',
    'authenticated',
    'guest@enterprise.dev',
    crypt('password123', gen_salt('bf')),
    NOW(),
    NOW(),
    '{"provider":"email","providers":["email"]}',
    '{"full_name":"Guest Demo","company_name":"Guest Org","slug":"guest-org"}',
    NOW(),
    NOW(),
    '',
    '',
    '',
    '',
    '',
    0,
    '+10000000003',
    '',
    '',
    '',
    FALSE,
    FALSE
  ),
  (
    '00000000-0000-0000-0000-000000000000',
    'd1b2c3d4-e5f6-7890-abcd-ef1234567890',
    'authenticated',
    'authenticated',
    'reset@enterprise.dev',
    crypt('password123', gen_salt('bf')),
    NOW(),
    NOW(),
    '{"provider":"email","providers":["email"]}',
    '{"full_name":"Reset Demo","company_name":"Reset Org","slug":"reset-org"}',
    NOW(),
    NOW(),
    '',
    '',
    '',
    '',
    '',
    0,
    '+10000000004',
    '',
    '',
    '',
    FALSE,
    FALSE
  ),
  (
    '00000000-0000-0000-0000-000000000000',
    'e1b2c3d4-e5f6-7890-abcd-ef1234567890',
    'authenticated',
    'authenticated',
    'reset2@enterprise.dev',
    crypt('password123', gen_salt('bf')),
    NOW(),
    NOW(),
    '{"provider":"email","providers":["email"]}',
    '{"full_name":"Reset Two Demo","company_name":"Reset Org","slug":"reset-org-two"}',
    NOW(),
    NOW(),
    '',
    '',
    '',
    '',
    '',
    0,
    '+10000000005',
    '',
    '',
    '',
    FALSE,
    FALSE
  ),
  (
    '00000000-0000-0000-0000-000000000000',
    'a2b2c3d4-e5f6-7890-abcd-ef1234567890',
    'authenticated',
    'authenticated',
    'admin-role@enterprise.dev',
    crypt('password123', gen_salt('bf')),
    NOW(),
    NOW(),
    '{"provider":"email","providers":["email"]}',
    '{"full_name":"Admin Role Demo","company_name":"Admin Role Org","slug":"admin-role-org"}',
    NOW(),
    NOW(),
    '',
    '',
    '',
    '',
    '',
    0,
    '+10000000006',
    '',
    '',
    '',
    FALSE,
    FALSE
  );

-- Matching identities for all seeded users.
INSERT INTO auth.identities (
  id,
  user_id,
  provider_id,
  identity_data,
  provider,
  last_sign_in_at,
  created_at,
  updated_at
)
VALUES
  (
    'a1b2c3d4-e5f6-7890-abcd-ef1234567890',
    'a1b2c3d4-e5f6-7890-abcd-ef1234567890',
    'admin@enterprise.dev',
    '{"sub":"a1b2c3d4-e5f6-7890-abcd-ef1234567890","email":"admin@enterprise.dev","email_verified":true}',
    'email',
    NOW(),
    NOW(),
    NOW()
  ),
  (
    'b1b2c3d4-e5f6-7890-abcd-ef1234567890',
    'b1b2c3d4-e5f6-7890-abcd-ef1234567890',
    'member@enterprise.dev',
    '{"sub":"b1b2c3d4-e5f6-7890-abcd-ef1234567890","email":"member@enterprise.dev","email_verified":true}',
    'email',
    NOW(),
    NOW(),
    NOW()
  ),
  (
    'c1b2c3d4-e5f6-7890-abcd-ef1234567890',
    'c1b2c3d4-e5f6-7890-abcd-ef1234567890',
    'guest@enterprise.dev',
    '{"sub":"c1b2c3d4-e5f6-7890-abcd-ef1234567890","email":"guest@enterprise.dev","email_verified":true}',
    'email',
    NOW(),
    NOW(),
    NOW()
  ),
  (
    'd1b2c3d4-e5f6-7890-abcd-ef1234567890',
    'd1b2c3d4-e5f6-7890-abcd-ef1234567890',
    'reset@enterprise.dev',
    '{"sub":"d1b2c3d4-e5f6-7890-abcd-ef1234567890","email":"reset@enterprise.dev","email_verified":true}',
    'email',
    NOW(),
    NOW(),
    NOW()
  ),
  (
    'e1b2c3d4-e5f6-7890-abcd-ef1234567890',
    'e1b2c3d4-e5f6-7890-abcd-ef1234567890',
    'reset2@enterprise.dev',
    '{"sub":"e1b2c3d4-e5f6-7890-abcd-ef1234567890","email":"reset2@enterprise.dev","email_verified":true}',
    'email',
    NOW(),
    NOW(),
    NOW()
  ),
  (
    'a2b2c3d4-e5f6-7890-abcd-ef1234567890',
    'a2b2c3d4-e5f6-7890-abcd-ef1234567890',
    'admin-role@enterprise.dev',
    '{"sub":"a2b2c3d4-e5f6-7890-abcd-ef1234567890","email":"admin-role@enterprise.dev","email_verified":true}',
    'email',
    NOW(),
    NOW(),
    NOW()
  );

-- Align all non-owner users to the admin tenant and deterministic roles after trigger execution.
-- admin-role@enterprise.dev is assigned role='admin' on the demo tenant.
WITH admin_tenant AS (
  SELECT tenant_id
  FROM public.profiles
  WHERE id = 'a1b2c3d4-e5f6-7890-abcd-ef1234567890'
)
UPDATE public.profiles p
SET
  tenant_id = (SELECT tenant_id FROM admin_tenant),
  role = CASE
    WHEN p.id = 'b1b2c3d4-e5f6-7890-abcd-ef1234567890' THEN 'member'
    WHEN p.id = 'c1b2c3d4-e5f6-7890-abcd-ef1234567890' THEN 'guest'
    WHEN p.id = 'd1b2c3d4-e5f6-7890-abcd-ef1234567890' THEN 'member'
    WHEN p.id = 'e1b2c3d4-e5f6-7890-abcd-ef1234567890' THEN 'member'
    WHEN p.id = 'a2b2c3d4-e5f6-7890-abcd-ef1234567890' THEN 'admin'
    ELSE p.role
  END
WHERE p.id IN (
  'b1b2c3d4-e5f6-7890-abcd-ef1234567890',
  'c1b2c3d4-e5f6-7890-abcd-ef1234567890',
  'd1b2c3d4-e5f6-7890-abcd-ef1234567890',
  'e1b2c3d4-e5f6-7890-abcd-ef1234567890',
  'a2b2c3d4-e5f6-7890-abcd-ef1234567890'
);

-- Sample tenant invitations for E2E testing (pending, accepted, expired).
-- Uses admin tenant's tenant_id and admin user as invited_by.
WITH admin_tenant AS (
  SELECT tenant_id
  FROM public.profiles
  WHERE id = 'a1b2c3d4-e5f6-7890-abcd-ef1234567890'
)
INSERT INTO public.tenant_invitations (
  id,
  tenant_id,
  email,
  role,
  token_hash,
  status,
  invited_by,
  accepted_by,
  expires_at,
  created_at,
  updated_at
)
SELECT
  id,
  (SELECT tenant_id FROM admin_tenant),
  email,
  role,
  token_hash,
  status,
  'a1b2c3d4-e5f6-7890-abcd-ef1234567890',
  accepted_by,
  expires_at,
  NOW(),
  NOW()
FROM (
  VALUES
    (
      'f1b2c3d4-e5f6-7890-abcd-ef1234567891'::uuid,
      'pending@enterprise.dev',
      'member'::public.user_role,
      'e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855',
      'pending'::public.invitation_status,
      NULL::uuid,
      NOW() + INTERVAL '72 hours'
    ),
    (
      'f1b2c3d4-e5f6-7890-abcd-ef1234567892'::uuid,
      'accepted@enterprise.dev',
      'admin'::public.user_role,
      'a665a45920422f9d417e4867efdc4fb8a04a1f3fff1fa07e998e86f7f7a27ae3',
      'accepted'::public.invitation_status,
      'b1b2c3d4-e5f6-7890-abcd-ef1234567890',
      NOW() + INTERVAL '24 hours'
    ),
    (
      'f1b2c3d4-e5f6-7890-abcd-ef1234567893'::uuid,
      'expired@enterprise.dev',
      'guest'::public.user_role,
      'b94d27b9934d3e08a52e52d7da7dabfac484efe04294e576f6ae8f79c2e06a6a',
      'pending'::public.invitation_status,
      NULL::uuid,
      NOW() - INTERVAL '48 hours'
    )
) AS inv(id, email, role, token_hash, status, accepted_by, expires_at);

-- Ensure JWT claims include tenant_id + role for RLS-protected profile queries.
-- All users (including admin-role@enterprise.dev) get their claims updated here.
WITH seeded_roles AS (
  SELECT *
  FROM (
    VALUES
      ('a1b2c3d4-e5f6-7890-abcd-ef1234567890'::uuid, 'owner'::text),
      ('b1b2c3d4-e5f6-7890-abcd-ef1234567890'::uuid, 'member'::text),
      ('c1b2c3d4-e5f6-7890-abcd-ef1234567890'::uuid, 'guest'::text),
      ('d1b2c3d4-e5f6-7890-abcd-ef1234567890'::uuid, 'member'::text),
      ('e1b2c3d4-e5f6-7890-abcd-ef1234567890'::uuid, 'member'::text),
      ('a2b2c3d4-e5f6-7890-abcd-ef1234567890'::uuid, 'admin'::text)
  ) AS role_map(id, role)
)
UPDATE auth.users u
SET raw_app_meta_data = jsonb_build_object(
  'provider',
  'email',
  'providers',
  jsonb_build_array('email'),
  'tenant_id',
  p.tenant_id,
  'role',
  seeded_roles.role
)
FROM public.profiles p
JOIN seeded_roles ON seeded_roles.id = p.id
WHERE u.id = seeded_roles.id;

-- Set workspace-admin columns explicitly on the demo tenant (clarity over relying on defaults).
WITH demo_tenant AS (
  SELECT tenant_id
  FROM public.profiles
  WHERE id = 'a1b2c3d4-e5f6-7890-abcd-ef1234567890'
)
UPDATE public.tenants
SET
  timezone = 'UTC',
  locale = 'en-US',
  allow_admin_invites = TRUE
WHERE id = (SELECT tenant_id FROM demo_tenant);
