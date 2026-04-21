-- Seed data for local development and E2E tests
-- Applied automatically after migrations on `supabase db reset`
--
-- Deterministic test user credentials:
--   admin@enterprise.dev   / password123 (owner)
--   member@enterprise.dev  / password123 (member)
--   guest@enterprise.dev   / password123 (guest)
--   reset@enterprise.dev   / password123 (member, dedicated reset flow)
--   reset2@enterprise.dev  / password123 (member, retry backup)
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
  );

-- Align all non-owner users to the admin tenant and deterministic roles after trigger execution.
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
    ELSE p.role
  END
WHERE p.id IN (
  'b1b2c3d4-e5f6-7890-abcd-ef1234567890',
  'c1b2c3d4-e5f6-7890-abcd-ef1234567890',
  'd1b2c3d4-e5f6-7890-abcd-ef1234567890',
  'e1b2c3d4-e5f6-7890-abcd-ef1234567890'
);

-- Ensure JWT claims include tenant_id + role for RLS-protected profile queries.
WITH seeded_roles AS (
  SELECT *
  FROM (
    VALUES
      ('a1b2c3d4-e5f6-7890-abcd-ef1234567890'::uuid, 'owner'::text),
      ('b1b2c3d4-e5f6-7890-abcd-ef1234567890'::uuid, 'member'::text),
      ('c1b2c3d4-e5f6-7890-abcd-ef1234567890'::uuid, 'guest'::text),
      ('d1b2c3d4-e5f6-7890-abcd-ef1234567890'::uuid, 'member'::text),
      ('e1b2c3d4-e5f6-7890-abcd-ef1234567890'::uuid, 'member'::text)
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
