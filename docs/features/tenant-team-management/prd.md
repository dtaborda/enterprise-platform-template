---
title: "Tenant team management PRD"
description: "Defines product requirements for managing tenant members, roles, and invitations."
owner: "Engineering"
lastUpdated: "2026-05-07"
---

# Tenant team management PRD

## Purpose

Define implementation-ready product requirements for tenant-scoped team management in a multi-tenant SaaS template.

## Scope

- Included: member lifecycle, role assignment, invitations, governance, UX flows, permissions, and traceability.
- Excluded: Row-Level Security (RLS) implementation details (see RFC), owner transfer (follow-up), SCIM, SSO enterprise, custom role builders.

---

## Problem

Teams need a clear way to add, remove, and manage members per tenant without exposing cross-tenant data or overloading global admins. Today there is no UI or workflow for inviting users, changing roles, or removing members from a tenant.

## Users and stakeholders

| Role | Need |
|------|------|
| Tenant owner | Full control of membership, roles, and sensitive operations |
| Tenant admin | Day-to-day team operations: invite, role change, remove |
| Member | View team list, see own role, accept invitations |
| Guest | Limited visibility, cannot manage team |
| Platform engineering | Consistent access model across features |

## Goals

- Provide reliable tenant-scoped member management with clear role boundaries.
- Reduce manual support requests for role and access changes.
- Keep role semantics consistent across the platform.
- Ensure zero cross-tenant data leaks in all team operations.

---

## Permission matrix

| Action | Owner | Admin | Member | Guest |
|--------|-------|-------|--------|-------|
| View team members list | Yes | Yes | Yes | No |
| View pending invitations | Yes | Yes | No | No |
| Invite member | Yes | Yes | No | No |
| Revoke invitation | Yes | Yes (own invites) | No | No |
| Accept invitation | N/A | N/A | N/A | N/A |
| Change member role | Yes (any except owner) | Yes (member/guest only) | No | No |
| Remove member | Yes (any except self) | Yes (member/guest only) | No | No |

> **Important**: No one can create another owner in MVP. Admins cannot modify or remove owners. Owner transfer is a follow-up feature.

---

## MVP scope

### Member lifecycle

- List all tenant members with name, email, avatar, role, status, and joined date.
- Invite a new member by email with a role assignment (`admin`, `member`, `guest`).
- Accept an invitation via a unique link, joining the tenant with the assigned role.
- Revoke a pending invitation before acceptance.
- Change an existing member's role within permission boundaries.
- Remove a member from the tenant (preserving historical audit attribution).

### Invitation lifecycle

| State | Description |
|-------|-------------|
| `pending` | Invitation sent, awaiting acceptance |
| `accepted` | User accepted and joined the tenant |
| `revoked` | Owner/admin manually revoked before acceptance |
| `expired` | Expiration time passed without acceptance |

Rules:
- Default expiration: 7 days from creation.
- One pending invitation per email per tenant (duplicate sends are rejected).
- Expired invitations cannot be accepted.
- Revoked invitations cannot be accepted.
- Removed users keep historical attribution in audit logs.

### Out of scope (MVP)

- Owner transfer.
- Cross-tenant user directories.
- SCIM or external identity provisioning.
- Custom role builders and permission matrices.
- Resend invitation (follow-up).
- Bulk invite (follow-up).

---

## UX specification

### Route

`/dashboard/team`

### Page layout

```
┌─────────────────────────────────────────────────────┐
│ Header: "Team" + description + [Invite member] CTA  │
├─────────────────────────────────────────────────────┤
│ Summary cards row:                                   │
│   [Total members]  [Pending invitations]  [Admins]  │
├─────────────────────────────────────────────────────┤
│ Tab: Members | Invitations                           │
├─────────────────────────────────────────────────────┤
│ Members table (default tab):                         │
│   Avatar | Name | Email | Role | Joined | Actions   │
│   ...                                                │
├─────────────────────────────────────────────────────┤
│ Invitations table (second tab):                      │
│   Email | Role | Invited by | Expires | Status |Act │
│   ...                                                │
└─────────────────────────────────────────────────────┘
```

### Components and interactions

| Component | Behavior |
|-----------|----------|
| **Invite dialog** | Modal with email input + role selector (`admin`, `member`, `guest`). No `owner` option. Validates email format client-side. Shows duplicate error if pending invite exists. |
| **Members table** | Sortable by name and role. Each row has an actions menu (dropdown). Owner/admin see role change and remove options. Members see no actions. |
| **Invitations table** | Visible only to owner/admin. Shows email, assigned role, invited by, expiration date, status badge. Actions: revoke (if pending). |
| **Role change** | Dropdown or select in action menu. Confirmation dialog when promoting to admin. Blocked for owner rows. |
| **Remove member** | Confirmation dialog: "Remove {name} from this workspace? This action cannot be undone." Cannot remove self. Cannot remove owners (for admins). |
| **Summary cards** | Total members count, pending invitations count, admins+owners count. |
| **Invite acceptance page** | `/invite/accept?token=...` — validates token, shows tenant name, confirms acceptance or shows error (expired/revoked/invalid). |

### UI states

| State | Behavior |
|-------|----------|
| **Loading** | Skeleton rows in tables, skeleton cards in summary |
| **Empty members** | Only owner exists — show "Invite your first team member" prompt |
| **Empty invitations** | "No pending invitations" message in invitations tab |
| **Duplicate invite error** | Inline form error: "An invitation for this email is already pending" |
| **Expired invite** | Acceptance page shows: "This invitation has expired. Ask your team admin for a new one." |
| **Revoked invite** | Acceptance page shows: "This invitation has been revoked." |
| **Invalid token** | Acceptance page shows: "Invalid invitation link." |
| **Permission denied** | Role change/remove actions hidden for unauthorized roles. If somehow triggered, Server Action returns error. |
| **Success states** | Toast notification after invite sent, role changed, member removed, invitation revoked |

### Role-specific visibility

| Element | Owner | Admin | Member | Guest |
|---------|-------|-------|--------|-------|
| Members table | Full + actions | Full + actions (limited) | View only | Hidden (no access to page) |
| Invitations tab | Visible | Visible | Hidden | Hidden |
| Invite button | Visible | Visible | Hidden | Hidden |
| Role change action | All except owners | Member/guest only | Hidden | Hidden |
| Remove action | All except self | Member/guest only | Hidden | Hidden |

---

## User stories and acceptance criteria

### US-1: Owner invites a member

**As** a tenant owner, **I want** to invite someone by email so they can join my workspace.

Acceptance criteria:
- Invite dialog opens with email field and role selector.
- Selecting `admin`, `member`, or `guest` and submitting creates a pending invitation.
- A second invite to the same email while one is pending shows a duplicate error.
- The invitation appears in the invitations tab immediately.
- An invitation email is sent (or logged locally in dev mode).

### US-2: User accepts invitation

**As** an invited user, **I want** to accept my invitation so I join the correct tenant with the right role.

Acceptance criteria:
- Clicking the invite link opens `/invite/accept?token=...`.
- If the token is valid and not expired, the user sees tenant name and a confirm button.
- After confirming, the user is added to the tenant with the assigned role.
- If the user does not have an account, they are redirected to sign up first, then back to accept.
- The invitation status changes to `accepted`.

### US-3: Admin changes a member's role

**As** a tenant admin, **I want** to change a member's role so I can adjust permissions.

Acceptance criteria:
- Admin sees role change option for `member` and `guest` rows only.
- Selecting a new role and confirming updates the member's role.
- The role change is reflected immediately in the members table.
- Promoting to `admin` shows a confirmation dialog.
- Admins cannot change owner roles.

### US-4: Owner removes a member

**As** a tenant owner, **I want** to remove a member so they lose access to the workspace.

Acceptance criteria:
- Remove action shows a confirmation dialog.
- Confirming removes the member from the tenant.
- The member disappears from the members table.
- The removed user can no longer access tenant data.
- Owner cannot remove themselves.
- Audit log preserves historical attribution.

### US-5: Owner revokes a pending invitation

**As** a tenant owner, **I want** to revoke an invitation so the link becomes invalid.

Acceptance criteria:
- Revoke action is available on pending invitations only.
- Confirming changes the invitation status to `revoked`.
- The invite link no longer works.
- The invitation row updates to show `revoked` status.

### US-6: Member views team list

**As** a tenant member, **I want** to see who is in my workspace so I know my team.

Acceptance criteria:
- Member sees the members table with name, email, role, and joined date.
- Member does not see the invitations tab.
- Member does not see action menus on any row.
- Member does not see the invite button.

---

## Success metrics

- Invitation acceptance rate per tenant (target: > 80%).
- Median time from invite to active membership (target: < 24 hours).
- Monthly support tickets related to team access (target: decrease by 50%).
- Zero confirmed cross-tenant visibility incidents.

## Risks

| Risk | Mitigation |
|------|------------|
| Role confusion causes privilege escalation | Permission matrix enforced in service layer + RLS |
| Invitation links shared or misused | Hashed tokens, 7-day expiration, one-time use |
| Stale JWT after role change | Role sync to `app_metadata` + document refresh behavior |
| Complex role transitions increase support | Limited role set in MVP, no custom roles |

---

## Traceability

### Audit events

| Event | Trigger | Metadata |
|-------|---------|----------|
| `tenant_member.invited` | Owner/admin creates invitation | `{ email, assignedRole, invitedBy }` |
| `tenant_invitation.revoked` | Owner/admin revokes pending invitation | `{ email, revokedBy }` |
| `tenant_invitation.accepted` | User accepts valid invitation | `{ email, acceptedBy, assignedRole }` |
| `tenant_member.role_changed` | Owner/admin changes member role | `{ targetUserId, previousRole, newRole, changedBy }` |
| `tenant_member.removed` | Owner/admin removes member | `{ targetUserId, removedBy, previousRole }` |
| `tenant_invitation.email_delivery_failed` | Email adapter fails to send | `{ email, errorCode }` |

### Sentry

- Area: `team`
- Instrumented actions: `inviteMemberAction`, `revokeTenantInvitationAction`, `acceptTenantInvitationAction`, `changeTenantMemberRoleAction`, `removeTenantMemberAction`
- Captured errors: DB failures, role sync failures, email delivery failures
- PII exclusions: email addresses, invitation tokens, form field values
- Allowed metadata: `inputShape` keys, `errorCode`, `tenantId`, `userId`, `userRole`

### Seed data

| Entity | State | Details |
|--------|-------|---------|
| Invitation | `pending` | `invite-pending@enterprise.dev`, role `member`, expires in 7 days |
| Invitation | `expired` | `invite-expired@enterprise.dev`, role `member`, expired yesterday |
| Invitation | `revoked` | `invite-revoked@enterprise.dev`, role `guest`, revoked by admin |
| Member | `active` | Existing seed users: `admin@enterprise.dev`, `member@enterprise.dev`, `guest@enterprise.dev` |

### E2E flows

| Scenario | Actor | Expected outcome |
|----------|-------|------------------|
| Owner invites member by email | Owner | Invitation appears in invitations tab, email logged |
| Admin invites guest | Admin | Invitation created successfully |
| Member cannot see invite button | Member | Invite button and invitations tab hidden |
| Owner changes member role to admin | Owner | Role updated, confirmation dialog shown |
| Admin cannot modify owner role | Admin | Role change action hidden for owner rows |
| Owner revokes pending invitation | Owner | Status changes to revoked |
| User accepts valid invitation | New user | Joins tenant with correct role |
| User tries expired invitation | New user | Error page: invitation expired |
| Guest cannot access team page | Guest | Redirected or access denied |

### External adapters

| Provider | Interface | Local mode | Production mode | Env var |
|----------|-----------|------------|-----------------|---------|
| Email (invitations) | `InvitationEmailPort` | Console adapter — logs invite URL | Resend adapter | `RESEND_API_KEY` |

### Production readiness

- [ ] All audit events verified in `audit_log` table
- [ ] Sentry area `team` registered and Server Actions instrumented
- [ ] Unit tests pass for service layer (all 7 service functions)
- [ ] E2E tests pass for all defined flows
- [ ] RLS policies verified (no cross-tenant leaks)
- [ ] Seed data committed and `supabase db reset` works cleanly
- [ ] `RESEND_API_KEY` documented in production deployment guide
- [ ] Role change syncs `app_metadata` and audit logs the change

---

## Decisions log

| Decision | Outcome | Rationale |
|----------|---------|-----------|
| Owner transfer in MVP? | No — follow-up | Simplifies permission rules significantly |
| Removed users keep audit attribution? | Yes | Compliance and traceability requirement |
| Invitation expiration default? | 7 days | Balances security and usability |
| Resend invitation in MVP? | No — follow-up | Adds email complexity without core value |
| Invitation token storage? | Hashed (SHA-256) | Security best practice, prevents DB leak exposure |

---

*Last updated: 2026-05-07*
