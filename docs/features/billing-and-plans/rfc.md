---
title: "Billing and plans RFC"
description: "Defines the implementation-ready technical architecture for subscription state, plan management, and payment provider integration."
owner: "Engineering"
lastUpdated: "2026-05-11"
---

# Billing and plans RFC

## Purpose

Define an implementation-ready technical approach for provider-agnostic billing and plan management aligned with the service layer, contracts, adapter, and traceability conventions of the Enterprise Platform.

## Scope

- Included: data model, RLS policies, Zod contracts, service APIs, payment adapter (Stripe + local), Server Actions, webhook ingestion route, UI routes, seed data, and testing strategy.
- Excluded: invoice PDF generation, dunning automation, usage-based metering, multi-seat seat licensing, tax calculation (Avalara/TaxJar), finance back-office systems, provider-specific SDK internals beyond the adapter boundary.

---

## Summary

Implement billing as a tenant-bounded module using Drizzle schema for `plans`, `tenant_subscriptions`, and `billing_events` tables with RLS policies, Zod contracts in `@enterprise/contracts` for all inputs and outputs, function-based services in `@enterprise/core/src/services/billing-service.ts`, a port/adapter pattern for payment provider operations (Stripe in production, local no-op in development), thin Server Actions in `ui/features/billing/actions.ts`, and a Next.js Route Handler for idempotent webhook ingestion. All mutations are auditable via `AuditService.log()` and traceable via Sentry instrumentation under the `billing` area.

## Technical objectives

- Tenant subscription state is always consistent, queryable, and auditable — no opaque provider payload blobs as source of truth.
- Local development works without Stripe credentials via `LocalPaymentAdapter`.
- Webhook processing is idempotent: duplicate provider events produce no side effects.
- Billing data is fully tenant-isolated via RLS; webhook handlers use the service role only after signature verification.

---

## Data model

Location: `packages/db/src/schema/billing.ts` — **new file**

### New enums

```typescript
export const subscriptionStatusEnum = pgEnum("subscription_status", [
  "trialing",
  "active",
  "past_due",
  "canceled",
  "unpaid",
]);

export const billingCycleEnum = pgEnum("billing_cycle", [
  "monthly",
  "yearly",
]);
```

### `plans` table

| Column | Type | Constraints |
|--------|------|-------------|
| `id` | `uuid` | PK, `defaultRandom()` |
| `name` | `text` | NOT NULL |
| `slug` | `text` | NOT NULL, UNIQUE |
| `description` | `text` | NULLABLE |
| `price_monthly` | `integer` | NOT NULL (cents) |
| `price_yearly` | `integer` | NOT NULL (cents) |
| `currency` | `text` | NOT NULL, default `'usd'` |
| `features` | `text` | NOT NULL (JSON string — feature flags/limits) |
| `limits` | `text` | NOT NULL (JSON string — quota limits) |
| `is_active` | `boolean` | NOT NULL, default `true` |
| `display_order` | `integer` | NOT NULL, default `0` |
| `trial_days` | `integer` | NOT NULL, default `0` |
| `created_at` | `timestamptz` | NOT NULL, `defaultNow()` |
| `updated_at` | `timestamptz` | NOT NULL, `defaultNow()` |

### `tenant_subscriptions` table

| Column | Type | Constraints |
|--------|------|-------------|
| `id` | `uuid` | PK, `defaultRandom()` |
| `tenant_id` | `uuid` | NOT NULL, FK `tenants.id` ON DELETE CASCADE, UNIQUE |
| `plan_id` | `uuid` | NOT NULL, FK `plans.id` |
| `status` | `subscription_status` enum | NOT NULL |
| `billing_cycle` | `billing_cycle` enum | NOT NULL |
| `current_period_start` | `timestamptz` | NOT NULL |
| `current_period_end` | `timestamptz` | NOT NULL |
| `cancel_at_period_end` | `boolean` | NOT NULL, default `false` |
| `canceled_at` | `timestamptz` | NULLABLE |
| `trial_ends_at` | `timestamptz` | NULLABLE |
| `grace_ends_at` | `timestamptz` | NULLABLE |
| `external_subscription_id` | `text` | NULLABLE, UNIQUE |
| `external_customer_id` | `text` | NULLABLE |
| `created_at` | `timestamptz` | NOT NULL, `defaultNow()` |
| `updated_at` | `timestamptz` | NOT NULL, `defaultNow()` |

### `billing_events` table

| Column | Type | Constraints |
|--------|------|-------------|
| `id` | `uuid` | PK, `defaultRandom()` |
| `tenant_id` | `uuid` | NOT NULL, FK `tenants.id` ON DELETE CASCADE |
| `subscription_id` | `uuid` | NULLABLE, FK `tenant_subscriptions.id` |
| `event_type` | `text` | NOT NULL |
| `provider` | `text` | NOT NULL (e.g. `'stripe'`, `'local'`) |
| `external_event_id` | `text` | NULLABLE, UNIQUE |
| `payload` | `text` | NULLABLE (JSON string) |
| `processed_at` | `timestamptz` | NULLABLE |
| `created_at` | `timestamptz` | NOT NULL, `defaultNow()` |

### Indexes

| Index | Columns | Purpose |
|-------|---------|---------|
| `plans_slug_idx` | `slug` | Slug lookup |
| `plans_active_order_idx` | `is_active`, `display_order` | Catalog listing |
| `subscriptions_tenant_idx` | `tenant_id` | Tenant-scoped lookup (UNIQUE constraint also covers this) |
| `subscriptions_external_id_idx` | `external_subscription_id` | Webhook event routing |
| `subscriptions_status_idx` | `status` | Background job filtering |
| `billing_events_tenant_idx` | `tenant_id` | Tenant-scoped history |
| `billing_events_external_event_idx` | `external_event_id` | Idempotency check |
| `billing_events_subscription_idx` | `subscription_id` | Per-subscription history |

### Constraints

- UNIQUE on `tenant_subscriptions.tenant_id` — one active subscription record per tenant.
- UNIQUE on `tenant_subscriptions.external_subscription_id` — prevents duplicate provider linkage.
- UNIQUE on `billing_events.external_event_id` — enforces idempotency at DB level.
- `plans.features` and `plans.limits` store JSON as `text`; parsing happens at the service layer.

### Type exports

```typescript
export type Plan = typeof plans.$inferSelect;
export type NewPlan = typeof plans.$inferInsert;

export type TenantSubscription = typeof tenantSubscriptions.$inferSelect;
export type NewTenantSubscription = typeof tenantSubscriptions.$inferInsert;

export type BillingEvent = typeof billingEvents.$inferSelect;
export type NewBillingEvent = typeof billingEvents.$inferInsert;
```

---

## RLS policies

### `plans`

| Policy | Operation | Role | Condition |
|--------|-----------|------|-----------|
| `plans_select` | SELECT | `authenticated` | Always — plans are a public catalog |
| `plans_insert` | INSERT | `service_role` | Service role only |
| `plans_update` | UPDATE | `service_role` | Service role only |
| `plans_delete` | DELETE | `service_role` | Service role only |

### `tenant_subscriptions`

| Policy | Operation | Role | Condition |
|--------|-----------|------|-----------|
| `subscriptions_select` | SELECT | `authenticated` | `tenant_id` matches JWT claim AND role IN (`owner`, `admin`) |
| `subscriptions_insert` | INSERT | `service_role` | Service role only — created by webhook handler |
| `subscriptions_update` | UPDATE | `service_role` | Service role only — updated by webhook handler |
| `subscriptions_delete` | DELETE | — | No deletes — status transitions only |

### `billing_events`

| Policy | Operation | Role | Condition |
|--------|-----------|------|-----------|
| `billing_events_select` | SELECT | `authenticated` | `tenant_id` matches JWT claim AND role IN (`owner`, `admin`) |
| `billing_events_insert` | INSERT | `service_role` | Service role only — written by webhook handler |
| `billing_events_update` | UPDATE | — | Immutable after insert |
| `billing_events_delete` | DELETE | — | No deletes — audit records |

> **Note**: All subscription mutations (create, update) use the **admin client** (`service_role`) in the service layer because they originate from webhook events or internal service calls — never direct user mutations through an authenticated client.

---

## Contracts

Location: `packages/contracts/src/dto/billing.ts`

### Output schemas

```typescript
import { z } from "zod";

// Plan display shape
export const planSchema = z.object({
  id: z.string().uuid(),
  name: z.string(),
  slug: z.string(),
  description: z.string().nullable(),
  priceMonthly: z.number().int(),
  priceYearly: z.number().int(),
  currency: z.string(),
  features: z.string(), // JSON string
  limits: z.string(),   // JSON string
  isActive: z.boolean(),
  displayOrder: z.number().int(),
  trialDays: z.number().int(),
});

// Subscription display shape
export const subscriptionSchema = z.object({
  id: z.string().uuid(),
  tenantId: z.string().uuid(),
  planId: z.string().uuid(),
  status: z.enum(["trialing", "active", "past_due", "canceled", "unpaid"]),
  billingCycle: z.enum(["monthly", "yearly"]),
  currentPeriodStart: z.string().datetime(),
  currentPeriodEnd: z.string().datetime(),
  cancelAtPeriodEnd: z.boolean(),
  canceledAt: z.string().datetime().nullable(),
  trialEndsAt: z.string().datetime().nullable(),
  graceEndsAt: z.string().datetime().nullable(),
  externalSubscriptionId: z.string().nullable(),
  externalCustomerId: z.string().nullable(),
  plan: planSchema.optional(), // joined plan details
});

// Billing event display shape
export const billingEventSchema = z.object({
  id: z.string().uuid(),
  tenantId: z.string().uuid(),
  subscriptionId: z.string().uuid().nullable(),
  eventType: z.string(),
  provider: z.string(),
  externalEventId: z.string().nullable(),
  processedAt: z.string().datetime().nullable(),
  createdAt: z.string().datetime(),
});
```

### Input schemas

```typescript
// Change plan
export const changePlanSchema = z.object({
  planId: z.string().uuid(),
});

// Cancel subscription
export const cancelSubscriptionSchema = z.object({
  cancelAtPeriodEnd: z.boolean().default(true),
});

// Billing history query
export const billingHistoryQuerySchema = z.object({
  limit: z.number().int().min(1).max(100).default(50),
  offset: z.number().int().min(0).default(0),
});
```

### Type exports

All DTOs derive types via `z.infer<typeof schema>`.

---

## Service layer

Location: `packages/core/src/services/billing-service.ts`

Pattern: function-based (per `packages/core/AGENTS.md`).

### Service functions

| Function | Args | Returns | Notes |
|----------|------|---------|-------|
| `listPlans` | `client` | `ServiceResult<Plan[]>` | SELECT open to all authenticated — RLS allows it |
| `getSubscription` | `client, tenantId` | `ServiceResult<SubscriptionWithPlan>` | Joins subscription with plan; returns null if no subscription |
| `changePlan` | `client, adminClient, tenantId, userId, input` | `ServiceResult<TenantSubscription>` | Calls payment adapter `changePlan`; syncs state; audit logs |
| `cancelSubscription` | `client, adminClient, tenantId, userId, input` | `ServiceResult<TenantSubscription>` | Calls adapter `cancelSubscription`; sets `cancel_at_period_end`; audit logs |
| `resumeSubscription` | `client, adminClient, tenantId, userId` | `ServiceResult<TenantSubscription>` | Calls adapter `resumeSubscription`; clears `cancel_at_period_end`; audit logs |
| `processWebhookEvent` | `adminClient, event` | `ServiceResult<null>` | Idempotent; checks `external_event_id` uniqueness; routes to `syncSubscriptionState` |
| `getBillingHistory` | `client, tenantId, query` | `ServiceResult<BillingEvent[]>` | Paginated billing event log |
| `syncSubscriptionState` | `adminClient, tenantId, data` | `ServiceResult<TenantSubscription>` | Internal — upserts `tenant_subscriptions` from provider event payload |

### Idempotency contract

`processWebhookEvent` MUST:

1. Check `billing_events.external_event_id` for the incoming event ID.
2. If a row already exists, return `{ ok: true, data: null }` (no-op).
3. Otherwise insert the event row first, then call `syncSubscriptionState`.
4. Use the admin client for all writes — never the authenticated client.

```
Webhook flow:
  Route Handler receives raw body + signature header
    │
    ├─ 1. Verify signature via adapter.verifyWebhookSignature()
    ├─ 2. Parse event type and payload
    ├─ 3. Call processWebhookEvent(adminClient, event)
    │       ├─ Check external_event_id uniqueness
    │       ├─ Insert billing_events row
    │       └─ Call syncSubscriptionState(adminClient, tenantId, data)
    └─ 4. Return HTTP 200 OK (always — to prevent provider retry on non-5xx)
```

---

## Server Actions

Location: `ui/features/billing/actions.ts`

All actions follow the thin wrapper pattern:

```
validate input (Zod) → get authenticated client + admin client → call service → map to ActionResult → revalidatePath
```

### Actions list

| Action | Schema | Service function | Sentry area |
|--------|--------|-----------------|-------------|
| `changePlanAction` | `changePlanSchema` | `changePlan` | `billing` |
| `cancelSubscriptionAction` | `cancelSubscriptionSchema` | `cancelSubscription` | `billing` |
| `resumeSubscriptionAction` | — | `resumeSubscription` | `billing` |
| `getPortalUrlAction` | — | adapter `getPortalUrl` | `billing` |

### Webhook route

Location: `ui/app/api/webhooks/billing/route.ts`

This is a Next.js **Route Handler** (not a Server Action). It:

1. Reads the raw request body and signature header.
2. Calls `adapter.verifyWebhookSignature(payload, signature)`.
3. Parses event type and routes to `processWebhookEvent(adminClient, event)`.
4. Always returns `200 OK` on success; `400` on invalid signature; `500` on unexpected errors.

> **Critical**: Do NOT use `"use server"` in the webhook route file. It is a Route Handler (`export async function POST`), not a Server Action.

### Sentry instrumentation

Every Server Action wraps its body with `Sentry.withServerActionInstrumentation`. Non-validation errors call `captureActionError` with:
- `actionName`: the action function name
- `area`: `"billing"`
- `tenantId`, `userId`, `userRole` from auth context
- `inputShape`: `Object.keys(parsed.data)` — NEVER values
- `errorCode`: from `ServiceResult.code`

---

## Sentry area registration

Add `billing` to the `SentryArea` union in `ui/lib/sentry.ts`:

```typescript
export type SentryArea = "auth" | "billing" | "dashboard" | "resources" | "settings" | "team" | "webhook";
```

---

## External adapter

### Interface

Location: `packages/core/src/services/ports/payment-provider-port.ts`

```typescript
export interface PaymentProviderPort {
  createCustomer(params: {
    tenantId: string;
    tenantName: string;
    email: string;
  }): Promise<{ customerId: string }>;

  createSubscription(params: {
    customerId: string;
    planId: string;
    billingCycle: string;
  }): Promise<{ subscriptionId: string; status: string }>;

  changePlan(params: {
    subscriptionId: string;
    newPlanId: string;
  }): Promise<{ success: boolean }>;

  cancelSubscription(params: {
    subscriptionId: string;
    cancelAtPeriodEnd: boolean;
  }): Promise<{ success: boolean }>;

  resumeSubscription(params: {
    subscriptionId: string;
  }): Promise<{ success: boolean }>;

  getPortalUrl(params: {
    customerId: string;
    returnUrl: string;
  }): Promise<{ url: string }>;

  verifyWebhookSignature(
    payload: string,
    signature: string,
  ): Promise<boolean>;
}
```

### Implementations

| Adapter | Location | Behavior | Selection |
|---------|----------|----------|-----------|
| `LocalPaymentAdapter` | `packages/core/src/services/adapters/local-payment-adapter.ts` | In-memory state, console logs, instant status changes, always verifies signature | Default when `STRIPE_SECRET_KEY` is not set |
| `StripePaymentAdapter` | `packages/core/src/services/adapters/stripe-payment-adapter.ts` | Real Stripe API calls, stripe-js webhook signature verification | When `STRIPE_SECRET_KEY` is set |

### Adapter factory

```typescript
// packages/core/src/services/adapters/payment-adapter-factory.ts

export function createPaymentAdapter(): PaymentProviderPort {
  const stripeKey = process.env["STRIPE_SECRET_KEY"];
  if (stripeKey) {
    return new StripePaymentAdapter(stripeKey);
  }
  return new LocalPaymentAdapter();
}
```

Selection is based on env var presence, NOT `NODE_ENV`.

---

## UI routes and components

### Routes

| Route | Component | Auth | Description |
|-------|-----------|------|-------------|
| `/billing` | `BillingPage` | Required, owner/admin | Billing dashboard: current plan, usage, history, upgrade CTA |

### Feature module structure

```
ui/features/billing/
├── actions.ts                         # Server Actions (thin wrappers)
├── queries.ts                         # Server-side data fetching
├── types.ts                           # Feature-local types
├── components/
│   ├── billing-page-header.tsx        # Header with title and manage billing CTA
│   ├── current-plan-card.tsx          # Active plan display with status badge
│   ├── plan-comparison.tsx            # Plan cards grid for upgrade/downgrade
│   ├── billing-history-table.tsx      # Paginated billing events table
│   ├── change-plan-dialog.tsx         # Confirmation dialog for plan change
│   ├── cancel-subscription-dialog.tsx # Confirmation dialog for cancellation
│   └── subscription-status-badge.tsx  # Status chip: active, trialing, past_due, etc.
└── hooks/
```

### App routes

```
ui/app/(protected)/billing/
├── page.tsx                           # Server Component — fetches data, passes to views
└── error.tsx                          # Error boundary with Sentry

ui/app/api/webhooks/billing/
└── route.ts                           # Next.js Route Handler — webhook ingestion
```

> Route is registered in `ui/lib/routes.ts`:
> ```typescript
> billing: "/billing",
> ```

---

## Seed data

Location: additions to `supabase/seed.sql`

### Seed plans

```sql
-- Free plan
INSERT INTO public.plans (
  id, name, slug, description,
  price_monthly, price_yearly, currency,
  features, limits,
  is_active, display_order, trial_days,
  created_at, updated_at
) VALUES (
  'b0000001-0000-0000-0000-000000000001',
  'Free', 'free',
  'Get started with the essentials.',
  0, 0, 'usd',
  '{"ai":false,"analytics":false}',
  '{"members":3,"resources":10}',
  true, 1, 0,
  now(), now()
);

-- Pro plan ($29/mo, $290/yr)
INSERT INTO public.plans (
  id, name, slug, description,
  price_monthly, price_yearly, currency,
  features, limits,
  is_active, display_order, trial_days,
  created_at, updated_at
) VALUES (
  'b0000001-0000-0000-0000-000000000002',
  'Pro', 'pro',
  'For growing teams that need more power.',
  2900, 29000, 'usd',
  '{"ai":true,"analytics":true}',
  '{"members":25,"resources":500}',
  true, 2, 14,
  now(), now()
);

-- Enterprise plan ($99/mo, $990/yr)
INSERT INTO public.plans (
  id, name, slug, description,
  price_monthly, price_yearly, currency,
  features, limits,
  is_active, display_order, trial_days,
  created_at, updated_at
) VALUES (
  'b0000001-0000-0000-0000-000000000003',
  'Enterprise', 'enterprise',
  'Unlimited scale with dedicated support.',
  9900, 99000, 'usd',
  '{"ai":true,"analytics":true,"sso":true,"audit":true}',
  '{"members":-1,"resources":-1}',
  true, 3, 0,
  now(), now()
);
```

### Seed subscription and events

```sql
-- Demo tenant on Pro plan, active, monthly
INSERT INTO public.tenant_subscriptions (
  id, tenant_id, plan_id, status, billing_cycle,
  current_period_start, current_period_end,
  cancel_at_period_end,
  external_subscription_id, external_customer_id,
  created_at, updated_at
) VALUES (
  'b0000002-0000-0000-0000-000000000001',
  '<demo_tenant_id>',
  'b0000001-0000-0000-0000-000000000002',
  'active', 'monthly',
  now() - interval '10 days',
  now() + interval '20 days',
  false,
  'sub_local_demo', 'cus_local_demo',
  now() - interval '10 days', now()
);

-- Event: subscription created
INSERT INTO public.billing_events (
  id, tenant_id, subscription_id,
  event_type, provider, external_event_id,
  payload, processed_at, created_at
) VALUES (
  'b0000003-0000-0000-0000-000000000001',
  '<demo_tenant_id>',
  'b0000002-0000-0000-0000-000000000001',
  'subscription.created', 'local', 'evt_local_001',
  '{"status":"active","plan":"pro"}',
  now() - interval '10 days',
  now() - interval '10 days'
);

-- Event: payment succeeded
INSERT INTO public.billing_events (
  id, tenant_id, subscription_id,
  event_type, provider, external_event_id,
  payload, processed_at, created_at
) VALUES (
  'b0000003-0000-0000-0000-000000000002',
  '<demo_tenant_id>',
  'b0000002-0000-0000-0000-000000000001',
  'payment.succeeded', 'local', 'evt_local_002',
  '{"amount":2900,"currency":"usd"}',
  now() - interval '10 days',
  now() - interval '10 days'
);

-- Event: plan upgraded
INSERT INTO public.billing_events (
  id, tenant_id, subscription_id,
  event_type, provider, external_event_id,
  payload, processed_at, created_at
) VALUES (
  'b0000003-0000-0000-0000-000000000003',
  '<demo_tenant_id>',
  'b0000002-0000-0000-0000-000000000001',
  'plan.upgraded', 'local', 'evt_local_003',
  '{"from":"free","to":"pro"}',
  now() - interval '10 days',
  now() - interval '10 days'
);
```

> **Note**: `<demo_tenant_id>` references the existing deterministic seed ID from `seed.sql`.

---

## Testing strategy

### Unit tests

Location: `packages/core/src/services/__tests__/billing-service.test.ts`

| Test | What it verifies |
|------|------------------|
| `listPlans` returns active plans | Sorted by `display_order`; inactive plans excluded |
| `getSubscription` with existing subscription | Returns subscription joined with plan |
| `getSubscription` with no subscription | Returns `null` data, no error |
| `changePlan` success | Calls adapter `changePlan`, upserts subscription, logs audit event |
| `changePlan` with invalid plan ID | Returns validation error before adapter call |
| `cancelSubscription` at period end | Sets `cancel_at_period_end = true`, calls adapter |
| `cancelSubscription` immediate | Sets `cancel_at_period_end = false`, calls adapter |
| `resumeSubscription` success | Clears `cancel_at_period_end`, calls adapter |
| `resumeSubscription` already active | No-op — returns current state |
| `processWebhookEvent` new event | Inserts billing event, calls `syncSubscriptionState` |
| `processWebhookEvent` duplicate event | Returns success without duplicate insert (idempotent) |
| `getBillingHistory` paginated | Returns correct page with limit/offset |

### Contract tests

Location: `packages/contracts/src/__tests__/billing.test.ts`

Test all schemas for valid input, boundary values, and rejection of invalid input.

### E2E tests

Location: `ui/e2e/billing/billing.spec.ts`

| Test | Tag | Flow |
|------|-----|------|
| Owner sees billing page | `@critical` | Login as owner → navigate to `/billing` → verify plan card |
| Admin sees billing page | `@critical` | Login as admin → navigate to `/billing` → verify plan card |
| Member cannot access billing | `@critical` | Login as member → navigate to `/billing` → verify redirect |
| Owner sees plan comparison | | Login as owner → verify plan comparison grid |
| Owner initiates plan change | | Login as owner → click upgrade → confirm dialog → verify updated plan |
| Owner cancels subscription | | Login as owner → cancel → confirm dialog → verify `cancel_at_period_end` badge |
| Owner resumes subscription | | Login as owner → resume after cancel → verify active state |
| Billing history table renders | | Login as owner → verify billing history table has rows |
| Billing history pagination | | Login as owner → navigate billing history pages |

---

## Trade-offs

| Decision | Chosen | Not chosen | Rationale |
|----------|--------|------------|-----------|
| Subscription source of truth | Normalized `tenant_subscriptions` table | Opaque provider payload blob | Queryable, entitlement checks, RLS-compatible |
| Payment adapter selection | Env-var presence (`STRIPE_SECRET_KEY`) | `NODE_ENV` check | Explicit, testable in any environment |
| Webhook mutations auth | Admin client (`service_role`) | Authenticated client | Webhooks have no user JWT context |
| Idempotency enforcement | DB-level UNIQUE on `external_event_id` + service check | Service-only check | Defense in depth; DB prevents races |
| Plan features/limits | JSON string columns (`text`) | JSONB or separate columns | Drizzle JSONB support variance; parsed at service layer |
| Subscription per tenant | UNIQUE constraint on `tenant_id` | Multi-subscription support | Simpler model for v1; multi-plan is follow-up |
| Payment service pattern | Function-based | Class-based | Consistent with `auth-service.ts` platform convention |

---

## Risks

| Risk | Mitigation |
|------|------------|
| Delayed webhook events produce temporary plan mismatch | Grace period window (`grace_ends_at`) defers enforcement; UI shows warning state |
| Idempotency bug duplicates state transitions | UNIQUE constraint on `external_event_id` prevents DB-level duplicates; service also checks before insert |
| Provider outage blocks subscription changes | `LocalPaymentAdapter` always works; Stripe unavailability surfaces as service error to user |
| Webhook signature bypass | Signature always verified before payload parsing; invalid signature returns `400` without logging sensitive data |
| RLS policy drift between `tenant_subscriptions` and `billing_events` | Both tables use `service_role` for writes; reads use same `tenantClaimMatchesColumn` helper |
| Stripe plan ID ≠ internal plan slug mismatch | `external_subscription_id` and `external_customer_id` are stored; mapping is done in adapter, not in service layer |

---

## Implementation phases

| Phase | Deliverable | Dependencies |
|-------|-------------|--------------|
| 1 | Contracts: Zod schemas and types in `@enterprise/contracts` | None |
| 2 | Data model: `billing.ts` Drizzle schema, enums, RLS policies, migration | Phase 1 |
| 3 | Payment adapter: `PaymentProviderPort` interface + `LocalPaymentAdapter` + `StripePaymentAdapter` | Phase 1 |
| 4 | Services: `billing-service.ts` + unit tests | Phases 1–3 |
| 5 | Server Actions (`actions.ts`) + webhook Route Handler + Sentry area registration | Phase 4 |
| 6 | UI: billing page, components, route registration in `routes.ts` | Phase 5 |
| 7 | Seed data + E2E tests | Phase 6 |

---

## Decisions log

| Decision | Outcome | Rationale |
|----------|---------|-----------|
| New schema file or add to `platform.ts`? | New `billing.ts` file | Separation of concerns; billing schema grows independently |
| `features` and `limits` as JSON string or typed columns? | JSON string (`text`) | Flexible schema without migrations for adding flags; parsed and validated at service layer |
| Subscription immutable delete? | No deletes — status transitions only | Audit trail integrity; `canceled` is a status, not a row deletion |
| Webhook route as Server Action or Route Handler? | Route Handler (`route.ts`) | Server Actions cannot read raw request body or custom headers (signature verification requires raw body) |
| Stripe plan ID mapping? | Stored in `external_subscription_id`; slug is internal identifier | Decouples internal plan model from provider-specific plan IDs |
| Grace period enforcement? | `grace_ends_at` column stored; enforcement is feature-level concern | Billing RFC owns data model; entitlement enforcement is a follow-up |

---

*Last updated: 2026-05-11*
