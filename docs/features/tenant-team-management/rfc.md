---
title: "Tenant team management RFC"
description: "Defines the technical plan for tenant-scoped member, role, and invitation management."
owner: "Engineering"
lastUpdated: "2026-05-07"
---

# Tenant team management RFC

## Purpose

Define an implementation-ready technical approach for secure tenant-scoped team management aligned with the service layer, contracts, and traceability conventions.

## Scope

- Included: data model, RLS policies, contracts, service APIs, Server Actions, UI routes, role metadata synchronization, email adapter, seed data, and testing strategy.
- Excluded: SCIM, SSO enterprise, owner transfer (follow-up), custom role builders.

---

## Summary

Implement team management as a tenant-bounded module using:
- Drizzle schema for `tenant_invitations` table with RLS policies
- Zod contracts in `@enterprise/contracts` for all inputs and outputs
- Function-based services in `@enterprise/core/src/services/tenant-team-service.ts`
- Thin Server Actions in `ui/features/tenant-team-management/actions.ts`
- Port/adapter pattern for invitation email delivery
- Sentry instrumentation for all Server Actions
- Audit logging for all mutations

## Technical objectives

- Role and membership mutations never bypass tenant boundaries (RLS + service layer guards).
- Role changes synchronize both `profiles.role` and `auth.users.raw_app_meta_data.role`.
- Local development works without external email provider credentials.
- All mutations are auditable and traceable in Sentry.

---

## Data model

### `tenant_invitations` table

Location: `packages/db/src/schema/platform.ts`

| Column | Type | Constraints |
|--------|------|-------------|
| `id` | `uuid` | PK, `defaultRandom()` |
| `tenant_id` | `uuid` | NOT NULL, FK to `tenants.id`, ON DELETE CASCADE |
| `email` | `text` | NOT NULL, normalized lowercase |
| `role` | `user_role` enum | NOT NULL |
| `token_hash` | `text` | NOT NULL, UNIQUE |
| `status` | `invitation_status` enum | NOT NULL, default `pending` |
| `invited_by` | `uuid` | NOT NULL, FK to `profiles.id` |
| `accepted_by` | `uuid` | NULLABLE, FK to `profiles.id` |
| `expires_at` | `timestamptz` | NOT NULL |
| `accepted_at` | `timestamptz` | NULLABLE |
| `revoked_at` | `timestamptz` | NULLABLE |
| `created_at` | `timestamptz` | NOT NULL, `defaultNow()` |
| `updated_at` | `timestamptz` | NOT NULL, `defaultNow()` |

### New enum

```typescript
export const invitationStatusEnum = pgEnum("invitation_status", [
  "pending",
  "accepted",
  "revoked",
  "expired",
]);
```

### Indexes

| Index | Columns | Purpose |
|-------|---------|---------|
| `invitations_tenant_idx` | `tenant_id` | Tenant-scoped queries |
| `invitations_email_tenant_idx` | `email`, `tenant_id` | Duplicate invitation check |
| `invitations_token_hash_idx` | `token_hash` | Token lookup on acceptance |
| `invitations_status_idx` | `status` | Filter by status |

### Constraints

- UNIQUE on `(tenant_id, email)` WHERE `status = 'pending'` — enforced in service layer (partial unique index if supported, otherwise service-level check).
- `token_hash` is UNIQUE globally.
- `email` is stored normalized to lowercase before insert.

### Type exports

```typescript
export type TenantInvitation = typeof tenantInvitations.$inferSelect;
export type NewTenantInvitation = typeof tenantInvitations.$inferInsert;
```

---

## RLS policies

### `tenant_invitations`

| Policy | Operation | Role | Condition |
|--------|-----------|------|-----------|
| `invitations_select` | SELECT | `authenticated` | `tenant_id` matches JWT claim AND role IN (`owner`, `admin`) |
| `invitations_insert` | INSERT | `authenticated` | `tenant_id` matches JWT claim AND role IN (`owner`, `admin`) AND `invited_by = auth.uid()` |
| `invitations_update` | UPDATE | `authenticated` | `tenant_id` matches JWT claim AND role IN (`owner`, `admin`) |
| `invitations_delete` | DELETE | — | No direct deletes — status transitions only |

### Invitation acceptance

Acceptance uses the **admin client** (`service_role`) because:
1. The accepting user may not yet have a profile in the target tenant.
2. RLS would block the insert into `profiles` since the user's JWT has no `tenant_id` claim for this tenant.
3. After acceptance, the admin client updates `auth.users.raw_app_meta_data` with the new `tenant_id` and `role`.

> **Warning**: The admin client is used ONLY in the acceptance service function, NEVER in request-driven user flows. The token hash validation and expiration check happen BEFORE any admin client operation.

---

## Role metadata synchronization

### The problem

RLS policies authorize against `auth.jwt()->'app_metadata'->>'role'`, not `profiles.role`. Changing only `profiles.role` leaves authorization stale until the JWT refreshes.

### The solution

Every role change in `tenant-team-service.ts` MUST:

1. Update `profiles.role` via the authenticated Supabase client.
2. Update `auth.users.raw_app_meta_data.role` via the admin client (`supabase.auth.admin.updateUserById`).
3. Log the role change to the audit log.

```
Role change flow:
  Service receives (client, adminClient, targetUserId, newRole)
    │
    ├─ 1. Verify caller has permission (owner for any, admin for member/guest)
    ├─ 2. Update profiles.role via authenticated client (RLS enforced)
    ├─ 3. Update auth.users.raw_app_meta_data.role via admin client
    ├─ 4. Log audit event: tenant_member.role_changed
    └─ 5. Return ServiceResult<ProfileRecord>
```

> **Note**: The user's JWT will reflect the new role on their next token refresh. For immediate enforcement, the UI should trigger a session refresh after a role change confirmation.

### Invitation acceptance role assignment

When a user accepts an invitation:

1. Create or update the `profiles` row with the invited role and target `tenant_id`.
2. Set `auth.users.raw_app_meta_data` with `{ tenant_id, role }` via admin client.
3. Log audit event: `tenant_invitation.accepted`.

---

## Contracts

Location: `packages/contracts/src/dto/tenant-team.ts` and `packages/contracts/src/schemas/tenant-team.ts`

### Input schemas

```typescript
// Invite member
export const inviteTenantMemberSchema = z.object({
  email: z.string().email(),
  role: z.enum(["admin", "member", "guest"]),
});

// Change member role
export const changeTenantMemberRoleSchema = z.object({
  targetUserId: z.string().uuid(),
  newRole: z.enum(["admin", "member", "guest"]),
});

// Revoke invitation
export const revokeTenantInvitationSchema = z.object({
  invitationId: z.string().uuid(),
});

// Accept invitation
export const acceptTenantInvitationSchema = z.object({
  token: z.string().min(1),
});

// Remove member
export const removeTenantMemberSchema = z.object({
  targetUserId: z.string().uuid(),
});

// Query schemas
export const tenantMembersQuerySchema = z.object({
  limit: z.number().int().min(1).max(100).default(50),
  offset: z.number().int().min(0).default(0),
});

export const tenantInvitationsQuerySchema = z.object({
  status: z.enum(["pending", "accepted", "revoked", "expired"]).optional(),
  limit: z.number().int().min(1).max(100).default(50),
  offset: z.number().int().min(0).default(0),
});
```

### Type exports

All DTOs derive types via `z.infer<typeof schema>`.

---

## Service layer

Location: `packages/core/src/services/tenant-team-service.ts`

Pattern: function-based (per `packages/core/AGENTS.md`).

### Service functions

| Function | Args | Returns | Notes |
|----------|------|---------|-------|
| `listTenantMembers` | `client, tenantId, query` | `ServiceResult<ProfileRecord[]>` | RLS-scoped read |
| `listTenantInvitations` | `client, tenantId, query` | `ServiceResult<TenantInvitation[]>` | Owner/admin only |
| `inviteTenantMember` | `client, tenantId, userId, input` | `ServiceResult<TenantInvitation>` | Generates token, hashes it, creates invitation, calls email adapter |
| `revokeTenantInvitation` | `client, tenantId, userId, invitationId` | `ServiceResult<null>` | Sets status to `revoked`, sets `revoked_at` |
| `acceptTenantInvitation` | `client, adminClient, token` | `ServiceResult<ProfileRecord>` | Validates token hash, checks expiry, creates profile, syncs `app_metadata` |
| `changeTenantMemberRole` | `client, adminClient, tenantId, userId, input` | `ServiceResult<ProfileRecord>` | Permission check, updates profile + `app_metadata` |
| `removeTenantMember` | `client, adminClient, tenantId, userId, targetUserId` | `ServiceResult<null>` | Permission check, removes profile, clears `app_metadata` |

### Token generation

```
1. Generate 32-byte random token via crypto.randomBytes(32)
2. Encode as URL-safe base64
3. Hash with SHA-256 before storing in DB
4. Return plain token to the caller (for email link)
5. On acceptance, hash the incoming token and compare against stored hash
```

### Dependency injection

Services receive both `SupabaseClient` (authenticated, RLS-bound) and `AdminClient` (service role, for `app_metadata` mutations). The admin client is ONLY used for:
- `auth.admin.updateUserById()` — role sync
- Profile creation during invitation acceptance (when user has no tenant context)

---

## Server Actions

Location: `ui/features/tenant-team-management/actions.ts`

All actions follow the thin wrapper pattern:

```
validate input (Zod) → get authenticated client → call service → map to ActionResult → revalidatePath
```

### Actions list

| Action | Schema | Service function | Sentry area |
|--------|--------|------------------|-------------|
| `inviteMemberAction` | `inviteTenantMemberSchema` | `inviteTenantMember` | `team` |
| `revokeTenantInvitationAction` | `revokeTenantInvitationSchema` | `revokeTenantInvitation` | `team` |
| `acceptTenantInvitationAction` | `acceptTenantInvitationSchema` | `acceptTenantInvitation` | `team` |
| `changeTenantMemberRoleAction` | `changeTenantMemberRoleSchema` | `changeTenantMemberRole` | `team` |
| `removeTenantMemberAction` | `removeTenantMemberSchema` | `removeTenantMember` | `team` |

### Sentry instrumentation

Every action wraps its body with `Sentry.withServerActionInstrumentation`. Non-validation errors call `captureActionError` with:
- `actionName`: the action function name
- `area`: `"team"`
- `tenantId`, `userId`, `userRole` from auth context
- `inputShape`: `Object.keys(parsed.data)` — NEVER values
- `errorCode`: from `ServiceResult.code`

---

## Email adapter

### Interface

Location: `packages/core/src/services/ports/invitation-email-port.ts`

```typescript
export interface InvitationEmailPort {
  sendInvitation(params: {
    to: string;
    inviterName: string;
    tenantName: string;
    inviteUrl: string;
    role: string;
    expiresAt: Date;
  }): Promise<{ success: boolean; error?: string }>;
}
```

### Implementations

| Adapter | Location | Behavior | Selection |
|---------|----------|----------|-----------|
| `ConsoleInvitationEmailAdapter` | `packages/core/src/services/adapters/console-invitation-email-adapter.ts` | Logs invite URL to `console.info` | Default when `RESEND_API_KEY` is not set |
| `ResendInvitationEmailAdapter` | `packages/core/src/services/adapters/resend-invitation-email-adapter.ts` | Sends via Resend API | When `RESEND_API_KEY` is set |

### Adapter factory

Implemented in `packages/core/src/services/adapters/invitation-email-adapter-factory.ts`:

```typescript
export function createInvitationEmailAdapter(): InvitationEmailPort {
  if (cachedAdapter) return cachedAdapter;

  const resendKey = process.env["RESEND_API_KEY"];

  cachedAdapter = resendKey
    ? new ResendInvitationEmailAdapter(resendKey, getEmailFrom())
    : new ConsoleInvitationEmailAdapter();

  return cachedAdapter;
}
```

Selection is based on env var presence, NOT `NODE_ENV`. The adapter is cached per process, so each serverless cold start re-evaluates the selection.

Credentials are read in the factory, not in the adapters: `ResendInvitationEmailAdapter` receives both the API key and the sender address through its constructor, so it stays pure and testable. `getEmailFrom()` throws when `RESEND_API_KEY` is set but `EMAIL_FROM` is missing — there is no default sender.

---

## UI routes and components

### Routes

| Route | Component | Auth | Description |
|-------|-----------|------|-------------|
| `/dashboard/team` | `TeamPage` | Required, owner/admin/member | Main team management page |
| `/invite/accept` | `AcceptInvitePage` | Optional (may need signup first) | Invitation acceptance flow |

### Feature module structure

```
ui/features/tenant-team-management/
├── actions.ts                    # Server Actions (thin wrappers)
├── queries.ts                    # Server-side data fetching
├── types.ts                      # Feature-local types
├── components/
│   ├── team-page-header.tsx      # Header with title + invite CTA
│   ├── team-summary-cards.tsx    # Stats cards row
│   ├── members-table.tsx         # Members data table
│   ├── invitations-table.tsx     # Invitations data table
│   ├── invite-member-dialog.tsx  # Modal with email + role form
│   ├── change-role-select.tsx    # Role change dropdown
│   └── remove-member-dialog.tsx  # Confirmation dialog
└── hooks/
    └── (if needed)
```

### App routes

```
ui/app/(dashboard)/dashboard/team/
├── page.tsx                      # Server Component — fetches data, passes to views
└── error.tsx                     # Error boundary with Sentry

ui/app/invite/
└── accept/
    └── page.tsx                  # Invitation acceptance page
```

---

## Seed data

Location: additions to `supabase/seed.sql`

### Seed invitations

```sql
-- Pending invitation (valid, expires in 7 days)
INSERT INTO public.tenant_invitations (
  id, tenant_id, email, role, token_hash, status,
  invited_by, expires_at, created_at, updated_at
) VALUES (
  'a1b2c3d4-0001-0001-0001-000000000001',
  '<demo_tenant_id>',
  'invite-pending@enterprise.dev',
  'member',
  encode(sha256('seed-token-pending'::bytea), 'hex'),
  'pending',
  '<owner_user_id>',
  now() + interval '7 days',
  now(), now()
);

-- Expired invitation
INSERT INTO public.tenant_invitations (
  id, tenant_id, email, role, token_hash, status,
  invited_by, expires_at, created_at, updated_at
) VALUES (
  'a1b2c3d4-0001-0001-0001-000000000002',
  '<demo_tenant_id>',
  'invite-expired@enterprise.dev',
  'member',
  encode(sha256('seed-token-expired'::bytea), 'hex'),
  'expired',
  '<owner_user_id>',
  now() - interval '1 day',
  now() - interval '8 days', now()
);

-- Revoked invitation
INSERT INTO public.tenant_invitations (
  id, tenant_id, email, role, token_hash, status,
  invited_by, revoked_at, expires_at, created_at, updated_at
) VALUES (
  'a1b2c3d4-0001-0001-0001-000000000003',
  '<demo_tenant_id>',
  'invite-revoked@enterprise.dev',
  'guest',
  encode(sha256('seed-token-revoked'::bytea), 'hex'),
  'revoked',
  '<admin_user_id>',
  now() - interval '2 days',
  now() + interval '5 days',
  now() - interval '3 days', now()
);
```

> **Note**: `<demo_tenant_id>`, `<owner_user_id>`, and `<admin_user_id>` reference existing deterministic seed IDs from the current `seed.sql`.

---

## Testing strategy

### Unit tests

Location: `packages/core/src/services/__tests__/tenant-team-service.test.ts`

| Test | What it verifies |
|------|------------------|
| `inviteTenantMember` success | Creates invitation, hashes token, calls email adapter |
| `inviteTenantMember` duplicate | Rejects when pending invitation exists for same email |
| `inviteTenantMember` role restriction | Rejects `owner` role assignment |
| `acceptTenantInvitation` success | Validates token, creates profile, syncs `app_metadata` |
| `acceptTenantInvitation` expired | Rejects expired token |
| `acceptTenantInvitation` revoked | Rejects revoked invitation |
| `changeTenantMemberRole` success | Updates profile and `app_metadata` |
| `changeTenantMemberRole` permission | Admin cannot change owner role |
| `removeTenantMember` success | Removes profile, clears `app_metadata` |
| `removeTenantMember` self-remove | Rejects self-removal |

### Contract tests

Location: `packages/contracts/src/__tests__/tenant-team.test.ts`

Test all schemas for valid input, boundary values, and rejection of invalid input.

### E2E tests

Location: `ui/e2e/tenant-team-management/tenant-team-management.spec.ts`

| Test | Tag | Flow |
|------|-----|------|
| Owner invites member | `@critical` | Login as owner → invite → verify in table |
| Admin invites guest | | Login as admin → invite → verify |
| Member sees no admin actions | `@critical` | Login as member → verify hidden controls |
| Owner changes member to admin | | Login as owner → change role → verify |
| Admin cannot modify owner | | Login as admin → verify owner row has no actions |
| Owner revokes invitation | | Login as owner → revoke → verify status |
| Accept valid invitation | `@critical` | Navigate to invite link → accept → verify membership |
| Expired invitation shows error | | Navigate to expired link → verify error |
| Guest cannot access team page | | Login as guest → navigate → verify redirect |

---

## Sentry area registration

Add `team` to the `SentryArea` union in `ui/lib/sentry.ts`:

```typescript
export type SentryArea = "auth" | "dashboard" | "resources" | "settings" | "team" | "webhook";
```

---

## Trade-offs

| Decision | Chosen | Not chosen | Rationale |
|----------|--------|------------|-----------|
| Service pattern | Explicit function per action | Generic role mutation endpoint | Clarity, auditability, per-action permission checks |
| Token storage | SHA-256 hashed | Plain text | Security — DB leak does not expose usable tokens |
| Role sync | Dual write (profile + `app_metadata`) | Profile-only | RLS depends on JWT claims, not profile table |
| Email adapter | Port/adapter with env-var selection | Direct Resend calls | Local dev works without credentials |
| Invitation acceptance auth | Admin client (service role) | Authenticated client | Accepting user has no tenant context in JWT |

## Risks

| Risk | Mitigation |
|------|------------|
| RLS policy drift between profiles and invitations | Both tables use same `tenantClaimMatchesColumn` pattern |
| Race conditions on simultaneous role updates | Service-level optimistic concurrency via `updated_at` check |
| Stale JWT after role change | Document that UI should trigger session refresh; short JWT expiry recommended |
| Email adapter failure | Console fallback always works; audit event `email_delivery_failed` logged |

---

## Implementation phases

| Phase | Deliverable | Dependencies |
|-------|-------------|--------------|
| 1 | Contracts: Zod schemas + types in `@enterprise/contracts` | None |
| 2 | Data model: `tenant_invitations` table, enum, RLS, migration | Phase 1 |
| 3 | Services: `tenant-team-service.ts` + email adapter + unit tests | Phase 1, 2 |
| 4 | Server Actions + Sentry instrumentation | Phase 3 |
| 5 | UI: team page, invite dialog, tables, acceptance page | Phase 4 |
| 6 | Seed data + E2E tests | Phase 5 |

---

## Decisions log

| Decision | Outcome | Rationale |
|----------|---------|-----------|
| Token hashed at rest? | Yes — SHA-256 | Security best practice |
| Owner role immutable in v1? | Yes — no owner transfer | Simplifies permission model |
| Audit metadata fields? | `tenantId`, `userId`, `action`, `resource`, `resourceId`, domain-specific extras | Compliance-ready baseline |
| `profiles.role` vs `user_roles` as source? | `profiles.role` is primary; `user_roles` for history | Simpler model, history preserved in audit log |

---

*Last updated: 2026-05-07*
