---
title: "Tenant onboarding PRD"
description: "Defines product requirements for first-time tenant setup and activation flow."
owner: "Engineering"
lastUpdated: "2026-06-05"
---

# Tenant onboarding PRD

## Purpose

Define implementation-ready product requirements for the guided onboarding experience that takes a new tenant from account creation to first meaningful workspace activation.

## Scope

- Included: onboarding checklist lifecycle, baseline workspace setup, first-teammate invite (reusing tenant-team-management), starter-data seeding, activation tracking, dismissal/resume behavior, UX flows, and traceability.
- Excluded: adaptive/behavioral onboarding scoring, multi-tenant migration tools, onboarding consultant workflows, and custom activation criteria builders. The invitation subsystem is owned by the tenant-team-management feature — this feature reuses it without modification.

---

## Problem

New tenants drop off when setup steps are unclear, fragmented, or require support intervention. Without a guided flow, owners skip critical configuration, workspaces lack identity and locale settings, and "activation" — the first signal of genuine engagement — cannot be measured or optimized.

## Users and stakeholders

| Role | Need |
|------|------|
| Tenant owner | Fast, resumable path from creation to a usable workspace |
| Tenant admin | Clear next actions after joining an in-progress tenant |
| Member | Landing directly at the dashboard after accepting an invitation during onboarding |
| Product team | Measurable activation rate and first-week retention baseline |
| Platform engineering | Consistent progress-tracking and audit model across tenant lifecycle |

## Goals

- Reduce time-to-value for new tenants by making required steps explicit and completable in one session.
- Standardize baseline configuration (name, locale) across all tenant activations.
- Provide a resumable, low-friction checklist that adapts to the owner's pace.
- Make activation measurable via a discrete `tenant.activated` audit event.

---

## MVP scope

### Checklist lifecycle

| Step | Type | Description |
|------|------|-------------|
| Baseline workspace setup | **Mandatory** | Set workspace name and locale; required before activation can fire |
| Invite first teammate | Optional | Reuses tenant-team-management invitation service; no new invite logic |
| Load sample data | Optional | Idempotent starter records for key modules |

Rules:
- Progress persists per tenant in `tenant_onboarding_progress` table.
- Checklist auto-shows on first authenticated owner access; dismissed state persists.
- Dismissed checklist collapses to a persistent launcher chip with completion fraction.
- Activation fires when mandatory baseline is complete AND ≥1 value step is done.

### Checklist states

| State | Description |
|-------|-------------|
| `not_started` | No steps completed; checklist shown immediately on first load |
| `in_progress` | At least one step complete; checklist may be dismissed |
| `activated` | Activation criteria met; `tenant.activated` event emitted once |

### Invite step reuse contract

The "Invite first teammate" step MUST:
- Open the existing invite dialog from tenant-team-management.
- Create invitations via the existing `InvitationService` — no new invite logic or adapters.
- Mark the onboarding step complete when a valid invitation is successfully created.

### Out of scope

- Adaptive onboarding based on behavioral scoring.
- Multi-tenant migration or import tools.
- Dedicated onboarding consultant workflows.
- New invitation system (reuse existing from tenant-team-management).
- Custom activation criteria builders.
- Bulk sample data import.
- Resend or repeat sample data steps (idempotent only).

---

## UX specification

### Routes

| Route | Description |
|-------|-------------|
| `/onboarding` | Full checklist view; auto-shown on first owner login, accessible via launcher chip |
| App shell (sidebar) | Persistent launcher chip (collapsed state); visible until activation or permanent dismiss |

Routes registered in `ui/lib/routes.ts` (ROUTES object). Pages under `ui/app/(protected)/onboarding/`.

### Page layout

```
┌─────────────────────────────────────────────────────┐
│ Header: "Get started" + progress bar (N/M steps)    │
├─────────────────────────────────────────────────────┤
│ Step list:                                           │
│   ✅ Baseline workspace setup     [Complete]        │
│   ○  Invite first teammate        [Start →]         │
│   ○  Load sample data             [Start →]         │
├─────────────────────────────────────────────────────┤
│ Footer: [Dismiss checklist]                         │
│   (Activation banner when criteria met:             │
│    "Your workspace is ready")                       │
└─────────────────────────────────────────────────────┘

Dismissed / launcher chip state (sidebar):
┌──────────────────────────┐
│  Setup  ·  1/3 complete  │  ← click to restore
└──────────────────────────┘
```

### Components and interactions

| Component | Behavior |
|-----------|----------|
| **Checklist panel** | Lists all steps with status icons and a CTA per step. Progress bar at top shows completion fraction. Dismiss button in footer. |
| **Baseline setup form** | Inline form: workspace name input (min 2 chars) + locale selector. Validates client-side. Submits via Server Action. Error shown inline on failure. |
| **Invite step trigger** | Clicking "Start" opens the existing tenant-team-management invite dialog. Step marked complete on successful invitation creation. |
| **Sample data step** | Single CTA "Load sample data". Shows loading state while seeding. On success, step marked complete. On failure, toast error and step stays pending. |
| **Launcher chip** | Persistent element in sidebar. Shows "Setup · N/M". Click navigates to `/onboarding` and restores the full checklist. |
| **Activation banner** | Shown at top of checklist when `tenant.activated` is emitted. "Your workspace is ready — here's what's next." |
| **Dismiss dialog** | Confirmation: "Hide this checklist? You can reopen it from the sidebar." Confirms → collapses to launcher chip. |

### UI states

| State | Behavior |
|-------|----------|
| **Loading** | Skeleton rows for steps, skeleton progress bar |
| **Not started** | All steps unchecked; baseline step highlighted as first action |
| **In progress** | Completed steps checked; next incomplete step highlighted |
| **Dismissed** | Checklist hidden; launcher chip visible in sidebar with progress fraction |
| **Activated** | Activation banner shown at top of checklist; launcher chip remains until permanent dismiss |
| **Error — baseline** | Inline form validation error; toast on server-side failure |
| **Error — seeding** | Toast: "Sample data could not be loaded. Try again." Step remains pending. |
| **Step complete** | CTA replaced with "Done" badge; no re-trigger for non-idempotent steps |

### Role-specific visibility

| Element | Owner | Admin | Member | Guest |
|---------|-------|-------|--------|-------|
| Full checklist at `/onboarding` | Yes | No (redirect to dashboard) | No (redirect to dashboard) | No (redirect to dashboard) |
| Launcher chip in sidebar | Yes | No | No | No |
| Baseline setup form | Yes | No | No | No |
| Invite step | Yes | No | No | No |
| Sample data step | Yes | No | No | No |
| Activation banner | Yes | No | No | No |

> **Important**: Onboarding is owner-only in MVP. Admins, members, and guests land directly at the dashboard. Any direct navigation to `/onboarding` by non-owners redirects to `/dashboard`.

---

## User stories and acceptance criteria

### US-1: Owner completes baseline setup

**As** a tenant owner, **I want** to set my workspace name and locale so my workspace has a clear identity.

Acceptance criteria:
- The baseline step is highlighted as the first required action in the checklist.
- Submitting a valid name (≥2 chars) and locale marks the step complete immediately.
- An empty or whitespace-only name shows an inline validation error; submission is blocked.
- `tenant_onboarding.step_completed` is emitted with `{ stepId: "baseline" }`.
- The progress bar increments and the step shows a completion checkmark.

### US-2: Owner invites first teammate from onboarding

**As** a tenant owner, **I want** to invite a teammate directly from the checklist so I do not have to navigate away.

Acceptance criteria:
- Clicking "Start" on the invite step opens the existing invite dialog from tenant-team-management.
- Submitting a valid invitation creates it via the existing `InvitationService`.
- The invite step is marked complete after a successful invitation creation.
- No new invitation logic, table, or adapter is introduced by this feature.
- `tenant_onboarding.step_completed` is emitted with `{ stepId: "first-invite" }`.

### US-3: User resumes a partially-complete checklist

**As** a tenant owner, **I want** my checklist progress to be saved so I can return and continue where I left off.

Acceptance criteria:
- After completing one or more steps, navigating away and returning to `/onboarding` shows the same completion state.
- Progress survives page reloads and re-authentication.
- The progress bar reflects the correct completion fraction on load.

### US-4: Owner dismisses and re-opens the launcher

**As** a tenant owner, **I want** to hide the checklist and bring it back later so it does not block my workflow.

Acceptance criteria:
- Clicking "Dismiss checklist" shows a confirmation dialog.
- Confirming collapses the checklist and shows a launcher chip in the sidebar.
- The launcher chip shows current progress (e.g., "Setup · 1/3").
- Clicking the launcher chip navigates to `/onboarding` and restores the full checklist.
- `tenant_onboarding.dismissed` is emitted on confirm with `{ completedSteps }`.

### US-5: Tenant reaches activation

**As** a tenant owner, **I want** to know when my workspace is fully activated so I am confident it is ready to use.

Acceptance criteria:
- `tenant.activated` fires exactly once when baseline is complete AND at least one value step (invite or sample data) is complete.
- An activation banner appears at the top of the checklist after the event fires.
- Completing the baseline step alone does NOT trigger activation.
- Completing additional steps after activation does NOT re-fire the event.

### US-6: Member sees limited onboarding

**As** a tenant member, **I want** to land directly at the dashboard after accepting an invitation so I am not shown an owner-only checklist.

Acceptance criteria:
- Members and admins are redirected to `/dashboard` on login; `/onboarding` is inaccessible to them.
- No launcher chip is shown for non-owner roles.
- If a member manually navigates to `/onboarding`, they are redirected to `/dashboard`.

---

## Success metrics

- Activation rate: percentage of new tenants reaching `tenant.activated` within 7 days (target: > 60%).
- Median onboarding completion time: first login to activation (target: < 30 minutes).
- Checklist dismissal-without-completion rate (target: < 30%).
- First-week retention baseline for activated tenants (track; no MVP target).
- Zero cross-tenant progress record leaks confirmed via RLS audit.

## Risks

| Risk | Mitigation |
|------|------------|
| Too many setup steps cause early abandonment | Only baseline is mandatory; all other steps are optional and skippable |
| Sample data collides with real tenant data | Idempotent seeding with clearly-labeled starter records; re-run safe |
| Activation criteria mismatch for template adopters | Activation rule centralized in `onboarding-service.ts` and documented as an explicit override point |
| Coupling to invitation service internals | Consume invitation service through its public interface only; no internal imports |
| Onboarding state out of sync with actual workspace state | Step completions write through service layer; no client-side state used as source of truth |
| Unclear progress indicators reduce completion rates | Progress bar + step status icons; completion fraction in launcher chip |

---

## Traceability

### Audit events

| Event | Trigger | Metadata |
|-------|---------|----------|
| `tenant_onboarding.started` | First checklist record created on initial tenant access | `{ tenantId, ownerId }` |
| `tenant_onboarding.step_completed` | A checklist step is marked complete | `{ tenantId, ownerId, stepId }` |
| `tenant_onboarding.dismissed` | Owner confirms checklist dismissal | `{ tenantId, ownerId, completedSteps }` |
| `tenant_onboarding.sample_data_seeded` | Starter data is seeded successfully | `{ tenantId, ownerId, seededModules }` |
| `tenant.activated` | Activation criteria met for the first time | `{ tenantId, activatedAt, completedSteps }` |

> **Note**: Invitation events (`tenant_member.invited`) remain owned by tenant-team-management. The onboarding feature listens for a successful invitation creation to mark its own step complete.

### Sentry

- Area: `onboarding`
- Instrumented actions: `completeBaselineStepAction`, `dismissChecklistAction`, `seedSampleDataAction`, `completeInviteStepAction`
- Captured errors: DB failures (progress save, step update), seeding failures, activation evaluation failures
- PII exclusions: workspace name (form input), email addresses, invitation tokens
- Allowed metadata: `inputShape` keys, `errorCode`, `tenantId`, `userId`, `stepId`

### Seed data

| Entity | State | Details |
|--------|-------|---------|
| Tenant + onboarding progress | `not_started` | Deterministic new-tenant UUID; no steps completed; maps to `seed-new@enterprise.dev` |
| Tenant + onboarding progress | `in_progress` | Baseline complete; invite step pending; maps to existing admin seed tenant |
| Tenant + onboarding progress | `activated` | All steps complete; `tenant.activated` already emitted; maps to `admin@enterprise.dev` tenant |

> Use deterministic UUIDs for all seed records so Playwright tests can reference them without dynamic lookup. Add to `supabase/seed.sql`.

### E2E flows

| Scenario | Actor | Expected outcome |
|----------|-------|------------------|
| Owner completes baseline setup | Owner | Step marked complete, progress bar increments, audit event emitted |
| Owner completes full activation path | Owner | `tenant.activated` emitted, activation banner shown |
| Owner dismisses and resumes checklist | Owner | Launcher chip shows correct fraction; click restores checklist with same state |
| Owner skips optional steps | Owner | Steps remain pending; no blocking error; progress continues |
| Owner invites teammate via checklist | Owner | Invite created via existing service; step marked complete |
| Owner loads sample data | Owner | Seed runs idempotently; step marked complete |
| Member accesses `/onboarding` directly | Member | Redirect to `/dashboard` |
| Guest accesses `/onboarding` directly | Guest | Redirect to `/dashboard` or access denied |
| Baseline validation — empty workspace name | Owner | Inline validation error; submission blocked |

### External adapters

| Provider | Interface | Local mode | Production mode | Env var |
|----------|-----------|------------|-----------------|---------|
| Email (invitations) | `InvitationEmailPort` (reused from tenant-team-management) | Console adapter — logs invite URL | Resend adapter | `RESEND_API_KEY` |

> No new external adapters are introduced. Onboarding delegates entirely to the invitation email adapter already defined in tenant-team-management.

### Production readiness

- [ ] All audit events verified in `audit_log` table — requires running DB + manual smoke (CI-gated)
- [x] Sentry area `onboarding` registered and Server Actions instrumented — Phase 4
- [x] Unit tests pass for `packages/core/src/services/onboarding-service.ts` — Phase 3 (10+ tests, 200/200)
- [x] E2E tests written for all defined flows (`ui/e2e/onboarding/onboarding.spec.ts`) — Phase 6; full run is CI-gated
- [x] RLS policies verified — no cross-tenant `tenant_onboarding_progress` leaks — Phase 2 (4 policies: select/insert/update owner-only, delete service-role)
- [x] Seed data committed — `supabase/seed.sql` includes 3 onboarding progress rows (not_started, in_progress, activated) — Phase 6
- [x] `tenant.activated` fires at most once per tenant (idempotency verified in service tests) — Phase 3 (`evaluateActivation` guard)
- [x] Activation rule documented as an override point in `onboarding-service.ts` — Phase 3
- [x] `/onboarding` route registered in `ui/lib/routes.ts` (ROUTES object) — Phase 4

---

## Decisions log

| Decision | Outcome | Rationale |
|----------|---------|-----------|
| Mandatory vs optional steps | Baseline (name + locale) is MANDATORY; invite teammate and load sample data are OPTIONAL | Forcing collaboration or seed steps raises abandonment; a usable workspace requires identity and locale at minimum |
| Dismissible and resumable | YES to both; dismissed state persists in DB; launcher chip in sidebar shows live progress | Respects owner autonomy, reduces friction, and supports return-later workflows |
| Activation definition | `tenant.activated` fires when mandatory baseline is complete AND ≥1 value step (invite OR first record) is done | Config alone is not activation signal; pairing with collaboration or first record signals genuine engagement |

---

*Last updated: 2026-06-05*
