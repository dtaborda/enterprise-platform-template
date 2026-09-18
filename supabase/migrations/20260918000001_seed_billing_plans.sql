-- Seed billing plans: free, pro, enterprise
--
-- WHY THIS IS A MIGRATION AND NOT SEED DATA
-- `supabase/seed.sql` only runs on `supabase db reset` against the LOCAL stack.
-- Remote environments (staging, production) never execute it, so the `plans`
-- catalog stayed empty there after `20260521000001_billing_schema.sql` created
-- the table. `initializeSubscription()` in
-- `packages/core/src/services/billing-service.ts` looks up
-- `slug = 'free' AND is_active = true` during signup and, because it is wrapped
-- in a try/catch so signup never fails on billing errors, it silently no-ops
-- when that row is missing — leaving every new tenant without a subscription.
-- Shipping the catalog as a migration guarantees it exists in every environment.
--
-- Scope: plans ONLY. `tenant_subscriptions` is intentionally NOT seeded here —
-- the demo subscription in `supabase/seed.sql` is E2E-only fixture data, and
-- production tenants receive their subscription from `initializeSubscription()`
-- at signup.
--
-- Determinism: `created_at` / `updated_at` are omitted so the column defaults
-- (`now()`) fill them. No `NOW()` literals in the migration body.
--
-- Idempotent: `ON CONFLICT (slug) DO NOTHING` (see `plans_slug_unique`) makes
-- re-running safe and keeps this aligned with `supabase/seed.sql`, which uses
-- the same UUIDs and the same conflict target.

-- ============================================================================
-- plans catalog
-- ============================================================================

-- IMPORTANT: `price_monthly` and `price_yearly` are INTEGER CENTS, not dollars.
-- 2900 = $29.00 / month, 29000 = $290.00 / year. Do NOT "fix" these to decimals.

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
  trial_days
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
    0
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
    14
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
    14
  )
ON CONFLICT (slug) DO NOTHING;
