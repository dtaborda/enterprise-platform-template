---
title: "Billing and plans PRD"
description: "Defines product requirements for plan management, subscription lifecycle, billing visibility, and provider-agnostic billing adapter."
owner: "Engineering"
lastUpdated: "2026-05-11"
---

# Billing and plans PRD

## Purpose

Define implementation-ready product requirements for tenant-scoped billing in a multi-tenant SaaS template, including plan catalog, subscription state management, and a provider-agnostic billing adapter.

## Scope

- Included: plan catalog (DB-driven), subscription lifecycle, upgrade/downgrade flows, billing history view, payment method management (delegated to provider portal), billing adapter pattern, and traceability.
- Excluded: multi-currency tax calculation, invoice rendering, revenue recognition, actual notification delivery system (billing events are flagged for display only), dunning management beyond grace period, and accounting/ERP integrations.

---

## Problem

Template adopters need a complete billing foundation to launch paid SaaS offerings without rebuilding subscription behavior from scratch. Today there is no plan catalog, no subscription state machine, and no billing UI — every adopter reimplements the same primitives in isolation, often incorrectly.

## Users and stakeholders

| Role | Need |
|------|------|
| Tenant owner | Understand current plan, manage subscription, control payment method |
| Tenant admin | View current plan and billing history; cannot change plan or payment method |
| Platform engineering | Consistent, adapter-based billing model that decouples provider choice |
| Template adopter | A complete billing starting point they can swap to any provider without rewrites |

## Goals

- Provide a DB-driven plan catalog that is configurable without code changes.
- Deliver a reliable subscription state machine with clear, auditable transitions.
- Expose upgrade, downgrade, and cancellation flows behind permission-guarded Server Actions.
- Decouple all provider-specific logic behind a `BillingPort` adapter interface.

---

## Permission matrix

| Action | Owner | Admin | Member | Guest |
|--------|-------|-------|--------|-------|
| View current plan and status | Yes | Yes | No | No |
| View billing history | Yes | Yes | No | No |
| Upgrade plan | Yes | No | No | No |
| Downgrade plan | Yes | No | No | No |
| Cancel subscription | Yes | No | No | No |
| Resubscribe / restart trial | Yes | No | No | No |
| Manage payment method (provider portal) | Yes | No | No | No |

> **Important**: Members and guests have no access to the `/billing` page. All billing mutations are owner-only. Admins have read-only visibility.

---

## MVP scope

### Plan and subscription lifecycle

- Maintain a `plans` table as a DB-driven catalog with name, description, price per cycle, feature limits (stored as JSONB), and active flag.
- Each tenant has exactly one `subscriptions` row tracking current plan, state, billing cycle, period dates, and grace period end.
- Tenant owners can view their current plan, available plans, and initiate a plan change.
- Plan changes are applied at period end by default; the adapter MAY support immediate proration.
- Cancellation sets state to `canceled` at period end; active access continues until `current_period_end`.
- A `past_due` state is introduced when a payment fails; `grace_ends_at` is set by the adapter on webhook.
- Resubscription moves the tenant back to `active` (or `trial` if the plan offers a trial reset).
- The billing adapter syncs subscription state via webhooks; the internal state is the authoritative source for entitlement checks.

### Subscription state machine

| From state | Event | To state | Notes |
|-----------|-------|----------|-------|
| — | Tenant signs up | `trial` | Default for new tenants when plan has trial days |
| — | Tenant signs up | `active` | When plan has no trial |
| `trial` | Payment collected | `active` | Trial converts on successful charge |
| `trial` | Trial expires, no payment | `canceled` | Grace period does not apply to trial |
| `active` | Payment fails | `past_due` | `grace_ends_at` set by adapter |
| `active` | Owner cancels | `canceled` | Access until `current_period_end` |
| `past_due` | Payment retry succeeds | `active` | Grace period cleared |
| `past_due` | Grace period expires | `canceled` | Adapter webhook triggers transition |
| `canceled` | Owner resubscribes | `active` | Or `trial` if plan includes a new trial |

Rules:
- Only one active subscription per tenant at a time.
- Plan catalog entries may be deactivated; existing subscriptions are not affected.
- `grace_ends_at` is nullable — only set while in `past_due` state.
- Entitlement checks MUST read subscription state from the DB, never from client-side state.
- Billing events that create notification flags in MVP: `subscription.upgraded`, `subscription.downgraded`, `subscription.past_due`, `subscription.canceled` (display only — the notification system is a separate feature).

### Out of scope (MVP)

- Multi-currency and tax calculation engine.
- Invoice PDF rendering and legal compliance workflows.
- Revenue recognition and accounting reports.
- Dunning sequences beyond a single grace period.
- Bulk plan migrations across tenants.
- Custom pricing per tenant (enterprise deals).
- Actual in-app notification delivery (billing events are logged, not delivered in MVP).

---

## UX specification

### Route

`/billing`

### Page layout

```
┌──────────────────────────────────────────────────────────────────┐
│ Header: "Billing" + "Manage your subscription and billing info"  │
├──────────────────────────────────────────────────────────────────┤
│ Current plan card:                                               │
│   Plan name | Price/cycle | Status badge | Renewal/Cancel date  │
│   [Manage payment method →]  (owner only, opens provider portal) │
├──────────────────────────────────────────────────────────────────┤
│ Available plans section (owner only):                            │
│   Plan card grid: Name | Price | Features | [Upgrade]/[Current] │
│   Downgrade shown as secondary CTA on lower-tier cards          │
├──────────────────────────────────────────────────────────────────┤
│ Billing history table:                                           │
│   Date | Event | Plan | Amount | Status                         │
│   (Visible to owner and admin)                                   │
└──────────────────────────────────────────────────────────────────┘
```

### Components and interactions

| Component | Behavior |
|-----------|----------|
| **Current plan card** | Displays plan name, billing interval (monthly/annual), price, status badge (`trial`, `active`, `past_due`, `canceled`), and next renewal date (or cancellation date if canceled). Owner sees "Manage payment method" link. |
| **Past due banner** | Shown when subscription is `past_due`. Displays grace period end date and a "Update payment method" CTA. Dismissible per session. |
| **Plan comparison grid** | Cards for each active plan. Current plan is highlighted with "Current plan" badge. Upgrade/downgrade CTAs trigger a confirmation sheet. Hidden for non-owners. |
| **Plan change sheet** | Slide-over or dialog showing: from plan → to plan, pricing delta, effective date ("at period end"), and a confirm/cancel action pair. |
| **Cancel subscription dialog** | Confirmation dialog: "Your access continues until {date}. Cancel anyway?" Requires explicit owner action. |
| **Billing history table** | Paginated table: date, event type (upgraded, downgraded, payment succeeded, payment failed, canceled), plan name, amount, and status badge. Read-only. |
| **Manage payment method link** | External link to provider customer portal (Stripe customer portal pattern). Opens in new tab. Owner-only. |

### UI states

| State | Behavior |
|-------|----------|
| **Loading** | Skeleton in current plan card and history table |
| **Trial active** | Status badge: `Trial` with days remaining. Plan grid visible with upgrade CTAs. |
| **Active** | Status badge: `Active`. Renewal date shown. Cancel and upgrade/downgrade available. |
| **Past due** | Status badge: `Past due`. Banner with grace period end date displayed above plan card. |
| **Canceled** | Status badge: `Canceled`. Access-until date shown. Resubscribe CTA replaces upgrade/downgrade grid. |
| **No billing history** | "No billing events yet" empty state in history table |
| **Permission denied (member/guest)** | Entire `/billing` page redirects to `/dashboard` — billing is not visible to members or guests. |
| **Plan change pending** | Upgrade/downgrade CTA on current plan shows "Change scheduled: {plan} at period end" badge; cancellable. |

### Role-specific visibility

| Element | Owner | Admin | Member | Guest |
|---------|-------|-------|--------|-------|
| `/billing` page access | Yes | Yes | No (redirect) | No (redirect) |
| Current plan card | Yes | Yes | — | — |
| Past due banner | Yes | Yes | — | — |
| Plan comparison grid | Yes | No | — | — |
| Plan change CTAs | Yes | No | — | — |
| Cancel subscription | Yes | No | — | — |
| Manage payment method | Yes | No | — | — |
| Billing history table | Yes | Yes | — | — |

---

## User stories and acceptance criteria

### US-1: Owner views current plan and subscription status

**As** a tenant owner, **I want** to see my current plan and subscription status so I understand what I am paying for and when it renews.

Acceptance criteria:
1. The `/billing` page loads and displays the current plan name, price, and billing interval.
2. A status badge reflects the subscription state (`trial`, `active`, `past_due`, `canceled`).
3. The next renewal date is displayed when the subscription is `active` or `trial`.
4. When state is `canceled`, the access-until date is displayed instead of a renewal date.
5. When state is `past_due`, a banner shows the grace period end date.

### US-2: Owner upgrades plan

**As** a tenant owner, **I want** to upgrade my subscription plan so my tenant has access to higher-tier features.

Acceptance criteria:
1. The plan comparison grid shows all active plans; the current plan is highlighted.
2. Clicking "Upgrade" on a higher-tier plan opens a confirmation sheet.
3. The sheet shows: current plan, target plan, price delta, and effective date ("at period end").
4. Confirming the upgrade calls the billing adapter and updates the subscription record.
5. The current plan card reflects the scheduled change with a "Change pending" badge.
6. A `billing.plan_upgraded` audit event is logged.

### US-3: Owner downgrades plan

**As** a tenant owner, **I want** to downgrade my subscription so I can reduce costs when my needs change.

Acceptance criteria:
1. Lower-tier plans in the grid show a "Downgrade" CTA (secondary style).
2. Clicking "Downgrade" opens the same confirmation sheet with downgrade-specific messaging.
3. Confirming the downgrade schedules the change for period end.
4. The current plan card reflects the scheduled change.
5. A `billing.plan_downgraded` audit event is logged.

### US-4: Owner cancels subscription

**As** a tenant owner, **I want** to cancel my subscription so I stop being charged while retaining access until the period ends.

Acceptance criteria:
1. A "Cancel subscription" action is available in the current plan card (owner only).
2. Clicking it opens a confirmation dialog with the access-until date.
3. Confirming cancellation updates subscription state to `canceled`.
4. The plan card shows "Canceled — access until {date}" with the correct date.
5. A `billing.subscription_canceled` audit event is logged.
6. Members and admins do not see the cancel action.

### US-5: Owner manages payment method

**As** a tenant owner, **I want** to update my payment method so I can prevent or resolve failed payments.

Acceptance criteria:
1. A "Manage payment method" link is visible in the current plan card (owner only).
2. Clicking the link opens the provider's customer portal in a new tab.
3. The link is generated by the billing adapter (Stripe customer portal URL pattern).
4. Admins, members, and guests do not see this link.

### US-6: Admin views billing information

**As** a tenant admin, **I want** to view the current plan and billing history so I can answer team questions about subscription status.

Acceptance criteria:
1. Admin can access `/billing` and see the current plan card and status badge.
2. Admin can see the billing history table.
3. Admin cannot see the plan comparison grid, upgrade/downgrade CTAs, cancel action, or manage payment method link.
4. Past due banner is visible to admin (read-only — no action CTA for admins).

### US-7: Subscription enters past_due state

**As** the system, **I want** to handle failed payments gracefully so tenants have time to resolve billing issues without losing access immediately.

Acceptance criteria:
1. When the billing adapter webhook reports a payment failure, subscription state transitions to `past_due`.
2. `grace_ends_at` is set based on the plan's grace period configuration.
3. A `billing.subscription_past_due` audit event is logged.
4. The past due banner appears on `/billing` for owner and admin.
5. If the owner updates the payment method and payment succeeds, state returns to `active` and the banner disappears.
6. If `grace_ends_at` passes without payment, a webhook transitions state to `canceled`.

### US-8: Owner resubscribes after cancellation

**As** a tenant owner, **I want** to resubscribe after canceling so I can restart my subscription when my needs return.

Acceptance criteria:
1. When subscription state is `canceled`, the plan comparison grid shows a "Subscribe" CTA instead of "Upgrade".
2. Clicking "Subscribe" opens a plan selection and confirmation flow.
3. Confirming resubscription transitions state to `active` (or `trial` if plan has a trial and the tenant has never trialed).
4. A `billing.subscription_reactivated` audit event is logged.

---

## Success metrics

- Trial-to-paid conversion rate per tenant cohort (target: > 30% within 14 days of trial start).
- Upgrade completion rate from confirmation sheet (target: > 85% of started upgrade flows complete).
- Billing-related support tickets per 100 tenants per month (target: < 5).
- Subscription state drift incidents (adapter webhook vs. DB mismatch) (target: 0 per month).
- Mean time to resolve `past_due` state (target: < 48 hours).

## Risks

| Risk | Mitigation |
|------|------------|
| Subscription state drifts when webhook delivery fails | Webhook idempotency keys + retry logic in adapter; scheduled reconciliation job (follow-up) |
| Entitlement checks use stale client-side state | Entitlement checks always read from DB via service layer — never trust client-passed plan info |
| Provider outage blocks plan changes | Adapter returns `ServiceResult` error; UI shows a "Try again later" message without corrupting state |
| Plan changes confuse users (at period end vs. immediate) | Confirmation sheet explicitly shows effective date; follow-up email notification on change |
| Grace period not surfaced clearly | Persistent past due banner with exact date; red status badge throughout session |
| Adopters hardcode Stripe — defeats adapter pattern | `BillingPort` interface enforced; Stripe adapter is reference-only, clearly documented as swappable |

---

## Traceability

### Audit events

| Event | Trigger | Metadata |
|-------|---------|----------|
| `billing.plan_upgraded` | Owner confirms plan upgrade | `{ fromPlanId, toPlanId, effectiveAt, initiatedBy }` |
| `billing.plan_downgraded` | Owner confirms plan downgrade | `{ fromPlanId, toPlanId, effectiveAt, initiatedBy }` |
| `billing.subscription_canceled` | Owner confirms cancellation | `{ planId, accessUntil, initiatedBy }` |
| `billing.subscription_reactivated` | Owner resubscribes | `{ planId, initiatedBy }` |
| `billing.subscription_past_due` | Webhook: payment failed | `{ planId, graceEndsAt, providerEventId }` |
| `billing.subscription_activated` | Webhook: payment succeeded after past_due | `{ planId, providerEventId }` |
| `billing.subscription_expired` | Webhook: grace period ended, state → canceled | `{ planId, providerEventId }` |
| `billing.webhook_processing_failed` | Adapter webhook handler throws | `{ providerEventId, errorCode }` |

### Sentry

- Area: `billing`
- Instrumented actions: `upgradePlanAction`, `downgradePlanAction`, `cancelSubscriptionAction`, `resubscribeAction`, `createPaymentPortalSessionAction`, `handleBillingWebhookAction`
- Captured errors: DB state transition failures, adapter call failures, webhook signature verification failures, idempotency key conflicts
- PII exclusions: payment method details, card numbers, customer emails, billing address fields
- Allowed metadata: `inputShape` keys, `errorCode`, `tenantId`, `userId`, `userRole`, `providerEventId`, `fromPlanId`, `toPlanId`

### Seed data

| Entity | State | Details |
|--------|-------|---------|
| Plan | `active` | `Free` — $0/month, 1 seat, 10 resources, no trial |
| Plan | `active` | `Starter` — $29/month, 5 seats, 100 resources, 14-day trial |
| Plan | `active` | `Pro` — $99/month, 25 seats, unlimited resources, 14-day trial |
| Subscription | `trial` | Seed tenant on `Starter`, trial expires in 7 days |
| Subscription | `active` | Second seed tenant on `Pro` plan, renews in 20 days |
| Subscription | `past_due` | Third seed tenant on `Starter`, grace ends in 3 days |
| Subscription | `canceled` | Fourth seed tenant on `Free`, access until yesterday |

### E2E flows

| Scenario | Actor | Expected outcome |
|----------|-------|------------------|
| Owner views billing page on active subscription | Owner | Plan card shows correct plan, status badge is `Active`, history table loads |
| Owner upgrades from Starter to Pro | Owner | Confirmation sheet shown, plan change recorded, audit event logged |
| Owner downgrades from Pro to Starter | Owner | Confirmation sheet shown with downgrade messaging, change scheduled |
| Owner cancels subscription | Owner | Confirmation dialog shown with access-until date, state becomes `canceled` |
| Owner resubscribes after cancellation | Owner | Subscribe flow shown, state returns to `active` |
| Admin views billing page | Admin | Plan card and history visible; no upgrade/cancel/payment CTAs present |
| Member tries to access /billing | Member | Redirected to /dashboard |
| Guest tries to access /billing | Guest | Redirected to /dashboard |
| Webhook sets subscription to past_due | System | Past due banner appears on /billing for owner and admin |
| Owner clicks manage payment method | Owner | Provider portal URL returned, link opens in new tab |

### External adapters

| Provider | Interface | Local mode | Production mode | Env var |
|----------|-----------|------------|-----------------|---------|
| Billing provider | `BillingPort` | In-memory adapter — simulates state transitions and logs events | Stripe adapter | `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET` |
| Customer portal | `BillingPort.createPortalSession()` | Returns a mock URL logged to console | Stripe customer portal URL | `STRIPE_SECRET_KEY` |

### Production readiness

- [ ] All audit events verified in `audit_log` table for happy and failure paths
- [ ] Sentry area `billing` registered and all Server Actions instrumented
- [ ] `BillingPort` interface documented with adapter contract and swap instructions
- [ ] Unit tests pass for `billing-service.ts` (all state transition functions)
- [ ] Unit tests pass for `plans-service.ts` (plan catalog read operations)
- [ ] E2E tests pass for all defined flows
- [ ] RLS policies on `plans` and `subscriptions` tables verified (no cross-tenant leaks)
- [ ] Webhook handler verifies provider signature before processing
- [ ] Webhook idempotency enforced (duplicate event IDs are no-ops)
- [ ] Seed data committed and `supabase db reset` runs cleanly
- [ ] `STRIPE_SECRET_KEY` and `STRIPE_WEBHOOK_SECRET` documented in production deployment guide
- [ ] Entitlement gate pattern documented for adopters (how to check plan limits in services)
- [ ] `/billing` route added to `ui/lib/routes.ts` (`ROUTES.billing`)

---

## Decisions log

| Decision | Outcome | Rationale |
|----------|---------|-----------|
| Plan changes apply at period end by default? | Yes — period end | Predictable for users; avoids complex proration math in MVP. Adapter MAY support immediate proration. |
| How is grace period represented in UI? | `past_due` state + banner with `grace_ends_at` date | Clear, persistent signal without interrupting access; matches industry patterns (Stripe, Paddle) |
| Which billing events create notification flags in MVP? | `subscription.upgraded`, `subscription.downgraded`, `subscription.past_due`, `subscription.canceled` | These are the events users care most about; actual delivery is a separate notification feature |
| Plans in DB or hardcoded? | DB-driven `plans` table | Template adopters need to configure plans without code changes; hardcoding defeats the template purpose |
| Provider coupling? | Adapter pattern (`BillingPort` interface) with Stripe as reference implementation | Template must remain provider-agnostic; Stripe adapter is swappable without touching services or UI |
| Members and guests see billing? | No — redirect to /dashboard | Billing is sensitive commercial info; members have no need to see it; consistent with industry norms |
| Resubscription resets trial? | Only if plan has trial and tenant has never trialed it before | Prevents trial abuse while allowing legitimate plan restarts |
| Multi-plan subscriptions (add-ons)? | No — one subscription per tenant in MVP | Simplifies state machine significantly; add-ons are a follow-up |
| Payment method management delegated to provider? | Yes — provider customer portal | Avoids PCI scope for the template; Stripe customer portal handles all card data |

---

*Last updated: 2026-05-11*
