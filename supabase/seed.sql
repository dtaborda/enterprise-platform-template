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

-- ─── Billing: plans ──────────────────────────────────────────────────────────
--
-- 3 deterministic plans seeded for E2E tests.
-- UUIDs use the b0000001-… prefix to avoid collisions with other seed records.
-- Idempotent: ON CONFLICT DO NOTHING prevents duplicates on repeated resets.

INSERT INTO public.plans (
  id,
  name,
  slug,
  description,
  price_monthly,
  price_yearly,
  currency,
  features,
  limits,
  is_active,
  display_order,
  trial_days,
  created_at,
  updated_at
)
VALUES
  (
    'b0000001-0000-0000-0000-000000000001'::uuid,
    'Free',
    'free',
    'Get started for free with core features.',
    0,
    0,
    'usd',
    '{"core": true}',
    '{"seats": 3, "storage_gb": 1}',
    TRUE,
    1,
    0,
    NOW(),
    NOW()
  ),
  (
    'b0000001-0000-0000-0000-000000000002'::uuid,
    'Pro',
    'pro',
    'Everything in Free, plus advanced features and priority support.',
    2900,
    29000,
    'usd',
    '{"core": true, "ai": true, "analytics": true}',
    '{"seats": 20, "storage_gb": 50}',
    TRUE,
    2,
    14,
    NOW(),
    NOW()
  ),
  (
    'b0000001-0000-0000-0000-000000000003'::uuid,
    'Enterprise',
    'enterprise',
    'Unlimited scale with dedicated support and SLA.',
    9900,
    99000,
    'usd',
    '{"core": true, "ai": true, "analytics": true, "sso": true, "audit_logs": true}',
    '{"seats": -1, "storage_gb": -1}',
    TRUE,
    3,
    14,
    NOW(),
    NOW()
  )
ON CONFLICT (slug) DO NOTHING;

-- ─── Billing: demo subscription ─────────────────────────────────────────────
--
-- Links the demo tenant (owner: admin@enterprise.dev) to the Pro plan.
-- Idempotent: ON CONFLICT (tenant_id) DO NOTHING — one subscription per tenant.

INSERT INTO public.tenant_subscriptions (
  id,
  tenant_id,
  plan_id,
  status,
  billing_cycle,
  current_period_start,
  current_period_end,
  cancel_at_period_end,
  external_subscription_id,
  external_customer_id,
  created_at,
  updated_at
)
SELECT
  'b0000001-0000-0000-0001-000000000001'::uuid,
  p.tenant_id,
  'b0000001-0000-0000-0000-000000000002'::uuid,
  'active'::subscription_status,
  'monthly'::billing_cycle,
  NOW() - INTERVAL '15 days',
  NOW() + INTERVAL '15 days',
  FALSE,
  'local_sub_demo',
  'local_demo_tenant',
  NOW() - INTERVAL '15 days',
  NOW() - INTERVAL '15 days'
FROM public.profiles p
WHERE p.id = 'a1b2c3d4-e5f6-7890-abcd-ef1234567890'
ON CONFLICT (tenant_id) DO NOTHING;

-- ─── Billing: demo billing events ────────────────────────────────────────────
--
-- 3 sample events linked to the demo subscription for history table E2E tests.
-- Idempotent: ON CONFLICT (external_event_id) DO NOTHING.

INSERT INTO public.billing_events (
  id,
  tenant_id,
  subscription_id,
  event_type,
  provider,
  external_event_id,
  payload,
  processed_at,
  created_at
)
SELECT
  event_data.id,
  p.tenant_id,
  'b0000001-0000-0000-0001-000000000001'::uuid,
  event_data.event_type,
  event_data.provider,
  event_data.external_event_id,
  event_data.payload,
  NOW(),
  event_data.created_at
FROM public.profiles p
CROSS JOIN (
  VALUES
    (
      'b0000001-0000-0000-0002-000000000001'::uuid,
      'subscription.created',
      'local',
      'seed_evt_001',
      '{"plan": "pro", "cycle": "monthly"}',
      NOW() - INTERVAL '15 days'
    ),
    (
      'b0000001-0000-0000-0002-000000000002'::uuid,
      'payment.succeeded',
      'local',
      'seed_evt_002',
      '{"amount": 2900, "currency": "usd"}',
      NOW() - INTERVAL '15 days'
    ),
    (
      'b0000001-0000-0000-0002-000000000003'::uuid,
      'plan.upgraded',
      'local',
      'seed_evt_003',
      '{"from": "free", "to": "pro"}',
      NOW() - INTERVAL '10 days'
    )
) AS event_data(id, event_type, provider, external_event_id, payload, created_at)
WHERE p.id = 'a1b2c3d4-e5f6-7890-abcd-ef1234567890'
ON CONFLICT (external_event_id) DO NOTHING;

-- ─── Notifications: seed rows ─────────────────────────────────────────────────
--
-- 5 notification rows + 1 preference row for E2E tests.
-- All reference the admin demo tenant (resolved via admin user's profile).
-- Notification UUIDs use the c0000001-… prefix to avoid collisions.
-- Preference UUID uses the c0000002-… prefix.
-- Idempotent: ON CONFLICT (id) DO NOTHING.
--
-- User ID reference:
--   owner  → a1b2c3d4-e5f6-7890-abcd-ef1234567890 (admin@enterprise.dev)
--   member → b1b2c3d4-e5f6-7890-abcd-ef1234567890 (member@enterprise.dev)
--   admin  → a2b2c3d4-e5f6-7890-abcd-ef1234567890 (admin-role@enterprise.dev)

INSERT INTO public.notifications (
  id, tenant_id, user_id, type, category,
  title, body, metadata,
  is_read, read_at, source_event, source_entity_id,
  created_at
)
SELECT
  n.id,
  p.tenant_id,
  n.user_id,
  n.type::notification_type,
  n.category::notification_category,
  n.title,
  n.body,
  n.metadata,
  n.is_read,
  n.read_at,
  n.source_event,
  n.source_entity_id,
  n.created_at
FROM public.profiles p
CROSS JOIN (
  VALUES
    -- 1. Unread team_invited for member user
    (
      'c0000001-0000-0000-0000-000000000001'::uuid,
      'b1b2c3d4-e5f6-7890-abcd-ef1234567890'::uuid,
      'team_invited',
      'team',
      'You were invited to join Demo Workspace',
      'Admin User invited you as a member.',
      '{"inviterId":"a1b2c3d4-e5f6-7890-abcd-ef1234567890","role":"member"}',
      FALSE,
      NULL::timestamptz,
      'tenant_member.invited',
      NULL::uuid,
      NOW() - INTERVAL '2 hours'
    ),
    -- 2. Unread billing_past_due for owner user
    (
      'c0000001-0000-0000-0000-000000000002'::uuid,
      'a1b2c3d4-e5f6-7890-abcd-ef1234567890'::uuid,
      'billing_past_due',
      'billing',
      'Your subscription is past due',
      'Update your payment method before the grace period ends.',
      '{"graceEndsAt":"2026-06-15T00:00:00Z"}',
      FALSE,
      NULL::timestamptz,
      'billing.subscription_past_due',
      NULL::uuid,
      NOW() - INTERVAL '1 day'
    ),
    -- 3. Read billing_plan_upgraded for owner user (read 2 days ago)
    (
      'c0000001-0000-0000-0000-000000000003'::uuid,
      'a1b2c3d4-e5f6-7890-abcd-ef1234567890'::uuid,
      'billing_plan_upgraded',
      'billing',
      'Plan upgraded to Pro',
      'Your plan has been upgraded from Free to Pro.',
      '{"fromPlan":"free","toPlan":"pro"}',
      TRUE,
      NOW() - INTERVAL '2 days',
      'billing.plan_upgraded',
      NULL::uuid,
      NOW() - INTERVAL '3 days'
    ),
    -- 4. Read team_invitation_accepted for admin user (read 5 days ago)
    (
      'c0000001-0000-0000-0000-000000000004'::uuid,
      'a2b2c3d4-e5f6-7890-abcd-ef1234567890'::uuid,
      'team_invitation_accepted',
      'team',
      'Member User accepted your invitation',
      'Member User joined Demo Workspace as member.',
      '{"acceptedByName":"Member User","role":"member"}',
      TRUE,
      NOW() - INTERVAL '5 days',
      'tenant_invitation.accepted',
      NULL::uuid,
      NOW() - INTERVAL '6 days'
    ),
    -- 5. Unread team_role_changed for member user
    (
      'c0000001-0000-0000-0000-000000000005'::uuid,
      'b1b2c3d4-e5f6-7890-abcd-ef1234567890'::uuid,
      'team_role_changed',
      'team',
      'Your role was changed to admin',
      'Owner User updated your role from member to admin.',
      '{"previousRole":"member","newRole":"admin","changedBy":"a1b2c3d4-e5f6-7890-abcd-ef1234567890"}',
      FALSE,
      NULL::timestamptz,
      'tenant_member.role_changed',
      NULL::uuid,
      NOW() - INTERVAL '12 hours'
    )
) AS n(id, user_id, type, category, title, body, metadata, is_read, read_at, source_event, source_entity_id, created_at)
WHERE p.id = 'a1b2c3d4-e5f6-7890-abcd-ef1234567890'
ON CONFLICT (id) DO NOTHING;

-- ─── Notifications: seed preferences ─────────────────────────────────────────
--
-- Member user has billing email notifications disabled.
-- This lets E2E tests verify preference toggling behaviour.

INSERT INTO public.notification_preferences (
  id, user_id, tenant_id, category,
  in_app_enabled, email_enabled,
  created_at, updated_at
)
SELECT
  'c0000002-0000-0000-0000-000000000001'::uuid,
  'b1b2c3d4-e5f6-7890-abcd-ef1234567890',
  p.tenant_id,
  'billing'::notification_category,
  TRUE,
  FALSE,
  NOW(),
  NOW()
FROM public.profiles p
WHERE p.id = 'a1b2c3d4-e5f6-7890-abcd-ef1234567890'
ON CONFLICT (id) DO NOTHING;
