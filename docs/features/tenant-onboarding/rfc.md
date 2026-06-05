---
title: "Tenant onboarding RFC"
description: "Defines the technical plan for guided, resumable tenant onboarding and activation tracking."
owner: "Engineering"
lastUpdated: "2026-06-05"
---

# Tenant onboarding RFC

## Purpose

Define an implementation-ready technical approach for a guided, resumable, dismissible onboarding experience that takes a new tenant from creation to first meaningful activation — reusing the existing invitation and workspace-settings subsystems rather than rebuilding them.

## Scope

- Included: data model for per-tenant onboarding progress, RLS policies, contracts, the `onboarding-service.ts` service layer, thin Server Actions, UI routes/components (checklist + launcher chip), idempotent seed data, activation tracking, Sentry instrumentation, and the testing strategy.
- Excluded: adaptive/behavioral onboarding scoring, multi-tenant migration/import tools, onboarding consultant workflows, custom activation-criteria builders, and any new invitation system. The invitation subsystem is owned by `tenant-team-management` and is consumed through its public interface only.

---

## Summary

Implement onboarding as an owner-scoped, additive module using:

- A Drizzle `tenant_onboarding_progress` table (one row per tenant) with RLS policies in `@enterprise/db`.
- Zod 4 contracts in `@enterprise/contracts` for progress DTOs, step inputs, and the activation result.
- A function-based service `@enterprise/core/src/services/onboarding-service.ts` returning `ServiceResult<T>`.
- Thin Server Actions in `ui/features/onboarding/actions.ts` returning `ActionResult<T>` with Sentry area `onboarding`.
- **Reuse, not rebuild**: baseline setup delegates to `workspace-settings-service` (`updateWorkspaceProfile` + `updateWorkspaceRegional`); the first-invite step reuses the existing `tenant-team-management` invite dialog/action and only records its own step completion.
- Idempotent activation: `tenant.activated` is emitted at most once, guarded by a DB check on `activated_at`.
- Audit logging for every mutation and E2E coverage for every owner-facing flow.

## Technical objectives

- Onboarding progress is strictly tenant-scoped and owner-gated (RLS + service guards); no cross-tenant leakage.
- The onboarding service has **zero dependency** on `tenant-team-service` (no circular imports); invitation reuse happens at the action/UI layer.
- Activation fires exactly once per tenant and is centralized + documented as an explicit override point.
- Local development works with no new env vars and no new external adapters.
- All mutations are auditable and traceable in Sentry under area `onboarding`.

---

## Data model

### `tenant_onboarding_progress` table

Location: `packages/db/src/schema/platform.ts` (platform concern — tenant lifecycle).

One row per tenant (1:1). Step completion is modeled as discrete nullable timestamps for queryability and audit precision; `activated_at` is the single source of truth for activation idempotency.

| Column | Type | Constraints |
|--------|------|-------------|
| `id` | `uuid` | PK, `defaultRandom()` |
| `tenant_id` | `uuid` | NOT NULL, UNIQUE, FK to `tenants.id`, ON DELETE CASCADE |
| `state` | `onboarding_state` enum | NOT NULL, default `not_started` |
| `baseline_completed_at` | `timestamptz` | NULLABLE — set when name + locale are saved |
| `first_invite_completed_at` | `timestamptz` | NULLABLE — set when first invitation is created |
| `sample_data_completed_at` | `timestamptz` | NULLABLE — set when starter data is seeded |
| `dismissed` | `boolean` | NOT NULL, default `false` |
| `dismissed_at` | `timestamptz` | NULLABLE |
| `activated_at` | `timestamptz` | NULLABLE — idempotency guard for `tenant.activated` |
| `created_at` | `timestamptz` | NOT NULL, `defaultNow()` |
| `updated_at` | `timestamptz` | NOT NULL, `defaultNow()` |

### New enum

```typescript
export const onboardingStateEnum = pgEnum("onboarding_state", [
  "not_started",
  "in_progress",
  "activated",
]);
```

### Indexes

| Index | Columns | Purpose |
|-------|---------|---------|
| `onboarding_tenant_idx` | `tenant_id` (UNIQUE) | One progress row per tenant; tenant-scoped lookup |
| `onboarding_state_idx` | `state` | Filter by lifecycle state (analytics, seed) |

### Constraints

- UNIQUE on `tenant_id` — enforces the 1:1 invariant at the DB level (init becomes a safe upsert via `ON CONFLICT (tenant_id) DO NOTHING`).
- FK `tenant_id` → `tenants.id` with `ON DELETE CASCADE` — progress is removed with its tenant (supports the additive rollback plan).
- `activated_at` is written exactly once; the service refuses to overwrite a non-null value.

### Type exports

```typescript
export type TenantOnboardingProgress = typeof tenantOnboardingProgress.$inferSelect;
export type NewTenantOnboardingProgress = typeof tenantOnboardingProgress.$inferInsert;
```

### Drizzle definition (matches platform.ts conventions)

```typescript
export const tenantOnboardingProgress = pgTable(
  "tenant_onboarding_progress",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    tenantId: uuid("tenant_id")
      .notNull()
      .unique()
      .references(() => tenants.id, { onDelete: "cascade" }),
    state: onboardingStateEnum("state").notNull().default("not_started"),
    baselineCompletedAt: timestamp("baseline_completed_at", { withTimezone: true }),
    firstInviteCompletedAt: timestamp("first_invite_completed_at", { withTimezone: true }),
    sampleDataCompletedAt: timestamp("sample_data_completed_at", { withTimezone: true }),
    dismissed: boolean("dismissed").notNull().default(false),
    dismissedAt: timestamp("dismissed_at", { withTimezone: true }),
    activatedAt: timestamp("activated_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    index("onboarding_tenant_idx").on(table.tenantId),
    index("onboarding_state_idx").on(table.state),
    // policies below
  ],
).enableRLS();
```

> **Migration note**: `tenant_id UNIQUE` + the FK are Drizzle-generatable. Run `pnpm --filter @enterprise/db db:generate`, review the incremental SQL (expect `CREATE TYPE onboarding_state`, `CREATE TABLE`, `CREATE POLICY`), and commit.

---

## RLS policies

### `tenant_onboarding_progress`

Onboarding is owner-only (PRD), so mutation policies restrict to the `owner` role claim. Reuse the existing `tenantClaimMatchesColumn` predicate; add an `ownerRoleClaim` predicate.

```typescript
const tenantClaimMatchesColumn = sql`((auth.jwt()->'app_metadata'->>'tenant_id')::uuid = tenant_id)`;
const ownerRoleClaim = sql`(auth.jwt()->'app_metadata'->>'role' = 'owner')`;
```

| Policy | Operation | Role | Condition |
|--------|-----------|------|-----------|
| `onboarding_select` | SELECT | `authenticated` | `tenantClaimMatchesColumn AND ownerRoleClaim` |
| `onboarding_insert` | INSERT | `authenticated` | `withCheck: tenantClaimMatchesColumn AND ownerRoleClaim` |
| `onboarding_update` | UPDATE | `authenticated` | `using + withCheck: tenantClaimMatchesColumn AND ownerRoleClaim` |
| `onboarding_delete` | DELETE | `serviceRole` | `using: true` (no user-facing delete; cleanup only) |

> **No tenant bypass**: every policy is scoped by the JWT `tenant_id` claim. Non-owner roles cannot SELECT or mutate progress rows; combined with the route-level redirect, members/admins never reach onboarding state.
>
> **Baseline mutation path**: writing `tenants.name`/`locale` goes through `workspace-settings-service`, whose `tenants_update` policy is `serviceRole`-only — those writes use the admin client (server-only), exactly as the existing settings feature does. The progress row itself is written by the owner's authenticated client under the policies above.

---

## Contracts

Location: `packages/contracts/src/dto/tenant-onboarding.ts` (re-exported from `src/index.ts`). Zod 4 API.

### Enums

```typescript
export const ONBOARDING_STATE = {
  NOT_STARTED: "not_started",
  IN_PROGRESS: "in_progress",
  ACTIVATED: "activated",
} as const;
export type OnboardingState = (typeof ONBOARDING_STATE)[keyof typeof ONBOARDING_STATE];
export const onboardingStateSchema = z.enum(["not_started", "in_progress", "activated"]);

export const ONBOARDING_STEP = {
  BASELINE: "baseline",
  FIRST_INVITE: "first-invite",
  SAMPLE_DATA: "sample-data",
} as const;
export type OnboardingStep = (typeof ONBOARDING_STEP)[keyof typeof ONBOARDING_STEP];
export const onboardingStepSchema = z.enum(["baseline", "first-invite", "sample-data"]);
```

### Input schemas

```typescript
// Baseline workspace setup (name + locale) — mandatory step
export const completeBaselineStepSchema = z.object({
  name: z.string().min(2).max(100),
  locale: z.string().min(2).max(35), // BCP-47, e.g. "en-US"
});
export type CompleteBaselineStepDto = z.infer<typeof completeBaselineStepSchema>;

// Mark a non-baseline step complete (first-invite | sample-data)
export const completeOnboardingStepSchema = z.object({
  step: z.enum(["first-invite", "sample-data"]),
});
export type CompleteOnboardingStepDto = z.infer<typeof completeOnboardingStepSchema>;
```

> `dismiss`/`resume`/`seed`/`get` take no body — they derive tenant + user from the authenticated context, so they need no input schema.

### Output schemas

```typescript
export const onboardingProgressOutputSchema = z.object({
  tenantId: z.uuid(),
  state: onboardingStateSchema,
  baselineCompleted: z.boolean(),
  firstInviteCompleted: z.boolean(),
  sampleDataCompleted: z.boolean(),
  dismissed: z.boolean(),
  activatedAt: z.date().nullable(),
  completedCount: z.number().int().min(0),
  totalSteps: z.number().int().min(1),
});
export type OnboardingProgressOutput = z.infer<typeof onboardingProgressOutputSchema>;

export const activationResultSchema = z.object({
  activated: z.boolean(),       // true only on the transition that emits the event
  activatedAt: z.date().nullable(),
  progress: onboardingProgressOutputSchema,
});
export type ActivationResult = z.infer<typeof activationResultSchema>;
```

---

## Service layer

Location: `packages/core/src/services/onboarding-service.ts`. Pattern: function-based (per `packages/core/AGENTS.md`); receives `SupabaseClient` via DI; returns `ServiceResult<T>`; writes `audit_log` for every mutation; **no** Sentry, `revalidatePath`, or `ActionResult` here.

### Service functions

| Function | Args | Returns | Notes |
|----------|------|---------|-------|
| `getOnboardingProgress` | `client, tenantId` | `ServiceResult<OnboardingProgressOutput>` | RLS-scoped read; maps row → DTO (derives `completedCount`/`totalSteps`) |
| `initOnboardingProgress` | `client, tenantId, ownerId` | `ServiceResult<OnboardingProgressOutput>` | Idempotent upsert (`ON CONFLICT (tenant_id) DO NOTHING`); on first create emits `tenant_onboarding.started` |
| `completeBaselineStep` | `client, adminClient, tenantId, userId, role, input` | `ServiceResult<ActivationResult>` | Reuses `updateWorkspaceProfile` (name) + `updateWorkspaceRegional` (locale); sets `baseline_completed_at`; recomputes `state`; calls `evaluateActivation` |
| `completeOnboardingStep` | `client, tenantId, userId, step` | `ServiceResult<ActivationResult>` | Sets `first_invite_completed_at` or `sample_data_completed_at`; emits `tenant_onboarding.step_completed`; calls `evaluateActivation`. **Does not** create invitations |
| `seedSampleData` | `client, tenantId, userId` | `ServiceResult<ActivationResult>` | Idempotent starter records (see Seed data); marks `sample_data_completed_at`; emits `tenant_onboarding.sample_data_seeded`; calls `evaluateActivation` |
| `dismissChecklist` | `client, tenantId, userId` | `ServiceResult<OnboardingProgressOutput>` | Sets `dismissed=true`, `dismissed_at=now()`; emits `tenant_onboarding.dismissed` |
| `resumeChecklist` | `client, tenantId, userId` | `ServiceResult<OnboardingProgressOutput>` | Sets `dismissed=false`, clears `dismissed_at` |
| `evaluateActivation` | `client, tenantId, userId` (internal) | `ServiceResult<ActivationResult>` | **Activation rule + idempotency guard** (below) |

### Activation rule (single override point) + idempotency

```
evaluateActivation(client, tenantId, userId):
  1. Load progress row (baseline_completed_at, value-step timestamps, activated_at)
  2. Guard — idempotent: if activated_at IS NOT NULL → return { activated: false } (already fired)
  3. Rule (documented override point):
       activated := baseline_completed_at IS NOT NULL
                    AND (first_invite_completed_at IS NOT NULL
                         OR sample_data_completed_at IS NOT NULL)
  4. If activated:
       UPDATE ... SET activated_at = now(), state = 'activated'
         WHERE tenant_id = $tenantId AND activated_at IS NULL   ← race-safe guard
       if rowsAffected = 1 → write audit `tenant.activated` { tenantId, activatedAt, completedSteps }
       (rowsAffected = 0 means a concurrent call already activated → do NOT emit)
  5. Return { activated, activatedAt, progress }
```

> The `WHERE ... activated_at IS NULL` predicate makes the emit atomic even under concurrent step completions — only the update that flips NULL→now() emits the event. This satisfies the proposal's "guard `tenant.activated` with a DB check before emit" requirement.
>
> **Override point**: the boolean in step 3 is the only place activation is defined. Template adopters change activation criteria here and nowhere else.

### Reuse boundaries (no circular imports)

```
onboarding-service.ts
  ├── imports updateWorkspaceProfile, updateWorkspaceRegional  (workspace-settings-service.ts) ✅ leaf service
  └── DOES NOT import tenant-team-service.ts                    ❌ avoids onboarding↔team coupling

First-invite reuse happens ABOVE the service, at the action/UI layer:
  invite dialog (tenant-team-management) → inviteMemberAction (area: team) → on success
    → completeInviteStepAction (area: onboarding) → completeOnboardingStep(step: "first-invite")
```

The onboarding service therefore never imports invitation internals; it only records that the step happened. The invitation itself is created by the already-shipped `inviteTenantMember` service via the existing `inviteMemberAction`.

---

## Server Actions

Location: `ui/features/onboarding/actions.ts`. All actions: `"use server"`, validate with Zod, resolve auth context (`getUser()` → `tenant_id`/`role`), enforce **owner-only**, call the service via **subpath import** `@enterprise/core/services`, map to `ActionResult<T>`, and `revalidatePath(ROUTES.onboarding)` on success. The Client Component calls `router.refresh()` after a successful mutation so the Server-Component checklist re-renders.

> **Import rule**: use `from "@enterprise/core/services"`, `from "@enterprise/core/supabase/server"`, `from "@enterprise/core/supabase/admin"` — never the barrel `@enterprise/core` (CI `next-flight-action-entry-loader` cannot resolve barrel re-exports).

### Actions list

| Action | Input schema | Service function | Client(s) | Sentry area |
|--------|-------------|------------------|-----------|-------------|
| `completeBaselineStepAction` | `completeBaselineStepSchema` | `completeBaselineStep` | server + admin | `onboarding` |
| `completeInviteStepAction` | — | `completeOnboardingStep("first-invite")` | server | `onboarding` |
| `seedSampleDataAction` | — | `seedSampleData` | server (+ admin if needed) | `onboarding` |
| `dismissChecklistAction` | — | `dismissChecklist` | server | `onboarding` |
| `resumeChecklistAction` | — | `resumeChecklist` | server | `onboarding` |

Progress reads live in `ui/features/onboarding/queries.ts` (`getOnboardingProgress` / `initOnboardingProgress` on first owner load) — Server Components, not actions.

### Sentry instrumentation

Every action's catch block calls `captureActionError(err, { actionName, area: "onboarding", tenantId, userId, userRole, errorCode, inputShape })`. `inputShape` is `Object.keys(parsed.data)` only — **never values** (workspace name, email, tokens are PII/secrets and are excluded; `globals` scrubbing in `beforeSendFilter` is the backstop).

---

## UI routes and components

### Routes

| Route | Component | Auth | Description |
|-------|-----------|------|-------------|
| `/onboarding` | `OnboardingPage` (Server Component) | Required, **owner only** | Full checklist; auto-shown on first owner login; non-owners redirect to `/dashboard` |
| App shell (sidebar) | `OnboardingLauncherChip` | Owner only | Persistent launcher chip with completion fraction; visible until permanent dismiss |

Register the path in **both** `ui/lib/routes.ts` (`ROUTES.onboarding = "/onboarding"`) and `ui/e2e/helpers/routes.ts` (re-export). Pages live under `ui/app/(protected)/onboarding/` (never under `dashboard/`).

```typescript
// ui/lib/routes.ts (addition)
export const ROUTES = {
  // ...existing
  onboarding: "/onboarding",
} as const;
```

### Feature module structure

```
ui/features/onboarding/
├── actions.ts                      # Server Actions (thin wrappers, area "onboarding")
├── queries.ts                      # getOnboardingProgress + initOnboardingProgress (Server)
├── types.ts                        # Feature-local view types
├── components/
│   ├── onboarding-checklist.tsx    # Client — step list + progress bar + dismiss
│   ├── baseline-setup-form.tsx     # Client — name + locale (useActionState + FormField)
│   ├── sample-data-step.tsx        # Client — "Load sample data" CTA + loading/error
│   ├── invite-step-trigger.tsx     # Client — opens reused team invite dialog; onSuccess → completeInviteStepAction
│   ├── activation-banner.tsx       # "Your workspace is ready"
│   ├── dismiss-dialog.tsx          # Confirmation → dismissChecklistAction
│   └── onboarding-launcher-chip.tsx# Sidebar chip "Setup · N/M" → /onboarding (resume)
└── hooks/                          # (only if shared interactivity emerges)
```

### App routes

```
ui/app/(protected)/onboarding/
├── page.tsx     # Server Component: owner guard + redirect; init/fetch progress; render checklist
└── error.tsx    # Error boundary wired to Sentry area "onboarding"
```

### Component sourcing (no rebuild)

- Primitives from `@enterprise/ui` (shadcn): `Card`, `Progress`, `Button`, `Badge`, `Dialog`, `Input`, plus shared `FormField`/`FormBanner`/`SubmitButton` and `useFormValidation` for the baseline form.
- **Invite step reuses the existing `tenant-team-management` invite dialog component** — no new invite UI. On its success callback, the trigger calls `completeInviteStepAction`.

---

## Seed data

Location: additions to `supabase/seed.sql`. Idempotent (`ON CONFLICT (tenant_id) DO NOTHING`), deterministic UUIDs, clearly labeled, re-run safe under `supabase db reset`. Maps onto existing deterministic seed tenants/users.

```sql
-- Onboarding progress: not_started (fresh owner workspace)
INSERT INTO public.tenant_onboarding_progress (
  id, tenant_id, state, created_at, updated_at
) VALUES (
  'd1e2f3a4-0001-0001-0001-000000000001',
  '<demo_tenant_id>',                       -- admin@enterprise.dev tenant, reset for the not_started case
  'not_started', now(), now()
) ON CONFLICT (tenant_id) DO NOTHING;

-- Onboarding progress: in_progress (baseline done, value step pending)
INSERT INTO public.tenant_onboarding_progress (
  id, tenant_id, state, baseline_completed_at, created_at, updated_at
) VALUES (
  'd1e2f3a4-0001-0001-0001-000000000002',
  '<second_tenant_id>',
  'in_progress', now() - interval '1 hour', now() - interval '1 hour', now()
) ON CONFLICT (tenant_id) DO NOTHING;

-- Onboarding progress: activated (baseline + value step + activated_at set)
INSERT INTO public.tenant_onboarding_progress (
  id, tenant_id, state, baseline_completed_at, first_invite_completed_at,
  activated_at, created_at, updated_at
) VALUES (
  'd1e2f3a4-0001-0001-0001-000000000003',
  '<third_tenant_id>',
  'activated', now() - interval '2 days', now() - interval '2 days',
  now() - interval '2 days', now() - interval '2 days', now()
) ON CONFLICT (tenant_id) DO NOTHING;
```

> **Note**: `<demo_tenant_id>` etc. reference existing deterministic seed tenant IDs. Because each demo user auto-provisions one tenant via `handle_new_user()`, the in_progress/activated states map to additional seed tenants/users; reuse the same deterministic IDs the E2E suite logs in as. Starter "sample data" rows seeded by `seedSampleData` (e.g. demo `resources`) are tagged so they are recognizable and idempotent.

---

## Testing strategy

Strict TDD (project `strict_tdd=true`): write failing service unit tests first, then implement.

### Unit tests (Vitest) — respect coverage thresholds (core 60%)

Location: `packages/core/src/services/__tests__/onboarding-service.test.ts` (mock `SupabaseClient` per the AGENTS.md pattern).

| Test | Verifies |
|------|----------|
| `initOnboardingProgress` first call | Inserts row, emits `tenant_onboarding.started` |
| `initOnboardingProgress` repeat | `ON CONFLICT DO NOTHING`; no duplicate, no second `started` event |
| `completeBaselineStep` success | Calls `updateWorkspaceProfile` + `updateWorkspaceRegional`; sets `baseline_completed_at`; state→`in_progress` |
| `completeBaselineStep` alone | Does **not** activate (no value step yet) |
| `completeOnboardingStep("first-invite")` | Sets timestamp; emits `step_completed`; no invitation logic invoked |
| `seedSampleData` idempotent | Re-run does not duplicate records; marks step once |
| `evaluateActivation` happy path | baseline + value step → sets `activated_at`, state→`activated`, emits `tenant.activated` |
| `evaluateActivation` idempotency | Second call with `activated_at` set → `activated:false`, no re-emit |
| `evaluateActivation` race guard | Concurrent flip → only one emit (rowsAffected guard) |
| `dismissChecklist` / `resumeChecklist` | Toggle `dismissed` + `dismissed_at`; emit on dismiss |

### Contract tests (Vitest) — respect thresholds (contracts 45%)

Location: `packages/contracts/src/dto/__tests__/tenant-onboarding.test.ts`. Cover valid/boundary/invalid for `completeBaselineStepSchema` (name min 2, locale shape), `completeOnboardingStepSchema` (rejects `baseline`), and output schema parsing.

### E2E tests (Playwright) — Page Object Model

Location: `ui/e2e/onboarding/onboarding.spec.ts`. Run **serial** (stateful per-tenant progress); **no `networkidle` waits** — assert on visible state/role-based locators. Import paths from `ui/e2e/helpers/routes.ts`; log in via `e2e/helpers/auth.ts`.

| Test | Tag | Flow |
|------|-----|------|
| Owner completes baseline | `@critical` | Login owner → fill name+locale → step checks, progress increments |
| Owner reaches activation | `@critical` | baseline + invite (or sample data) → activation banner shown |
| Resume after dismiss | | Dismiss → chip shows `N/M` → click → checklist restored with same state |
| Skip optional steps | | Optional steps stay pending; no blocking error |
| Invite via checklist | | Reused dialog creates invite → first-invite step marked complete |
| Load sample data | | Idempotent seed → step marked complete |
| Baseline validation | | Empty name → inline error, submission blocked |
| Member hits `/onboarding` | `@critical` | Redirect to `/dashboard`; no chip |
| Guest hits `/onboarding` | | Redirect / access denied |

---

## Sentry area registration

Add `onboarding` to the `SentryArea` union in `ui/lib/sentry.ts`:

```typescript
export type SentryArea =
  | "auth"
  | "billing"
  | "dashboard"
  | "notifications"
  | "onboarding"   // ← added
  | "resources"
  | "settings"
  | "team"
  | "webhook";
```

---

## Trade-offs

| Decision | Chosen | Not chosen | Rationale |
|----------|--------|------------|-----------|
| Step storage | Discrete nullable timestamps | JSON blob of step states | Queryable, auditable, type-safe; trivial completion-fraction derivation |
| Row cardinality | 1 row per tenant (`tenant_id` UNIQUE) | Row per step | Simpler reads; matches "per-tenant progress" intent |
| Activation guard | `activated_at IS NULL` predicate in UPDATE | App-level boolean check | Race-safe; only the NULL→now() flip emits the event |
| First-invite reuse | Reuse dialog + action; service records step only | Onboarding service calls invite service | Prevents onboarding↔team circular import; no duplicated invite logic |
| Baseline writes | Delegate to `workspace-settings-service` | New tenant-update logic | Reuses audited, RLS-correct (serviceRole) settings path |
| Owner gating | RLS owner claim + route redirect | UI-only hiding | Defense in depth; RLS is the real boundary |

## Risks

| Risk | Mitigation |
|------|------------|
| Onboarding coupling to invitation internals | Reuse confined to action/UI layer; service has no `tenant-team-service` import |
| Double `tenant.activated` under concurrency | Atomic `WHERE activated_at IS NULL` guard; idempotency unit + race tests |
| Sample data collides with real data | Idempotent, clearly-labeled starter rows; re-run safe |
| Activation criteria misfit for adopters | Centralized in `evaluateActivation`, documented as the single override point |
| RLS drift vs other platform tables | Reuse `tenantClaimMatchesColumn`; add `ownerRoleClaim`; cross-tenant E2E leak test |
| Owner-only assumption changes later | Policy + redirect are the two switch points; documented together |

---

## Implementation phases

Ships as **chained PRs** — each phase is an independently reviewable slice (target < 400 lines), bottom-up so every layer lands with its tests.

| Phase | Deliverable | Dependencies |
|-------|-------------|--------------|
| 1 | Contracts: Zod 4 schemas + types in `@enterprise/contracts` + contract tests | None |
| 2 | Data model: `tenant_onboarding_progress` table, `onboarding_state` enum, RLS policies, generated migration | Phase 1 |
| 3 | Service: `onboarding-service.ts` (init/get/complete/seed/dismiss/resume + `evaluateActivation`) + unit tests (TDD); reuse `workspace-settings-service` | Phases 1–2 |
| 4 | Server Actions + Sentry area `onboarding` + `ROUTES.onboarding` + e2e route helper | Phase 3 |
| 5 | UI: `/onboarding` page, checklist, baseline form, sample-data step, activation banner, launcher chip; reuse team invite dialog | Phase 4 |
| 6 | Seed data + Playwright E2E (`ui/e2e/onboarding/`) + production-readiness verification | Phase 5 |

---

## Decisions log

| Decision | Outcome | Rationale |
|----------|---------|-----------|
| One progress row per tenant? | Yes — `tenant_id` UNIQUE, 1:1 | Matches per-tenant progress; simplest reads/upsert |
| Activation idempotency mechanism? | `activated_at` + `WHERE activated_at IS NULL` | Single source of truth; race-safe single emit |
| Where is activation defined? | `evaluateActivation` only | Explicit, documented override point for adopters |
| First-invite integration layer? | Action/UI, not service | Avoids circular import; reuses shipped invite service unchanged |
| Baseline persistence path? | `workspace-settings-service` (name + locale) | Reuses audited, RLS-correct settings mutations |
| Onboarding visibility (MVP)? | Owner only (RLS owner claim + redirect) | PRD scope; defense in depth |
| New external adapters/env vars? | None | Reuses invitation email adapter; additive feature |

---

*Last updated: 2026-06-05*
