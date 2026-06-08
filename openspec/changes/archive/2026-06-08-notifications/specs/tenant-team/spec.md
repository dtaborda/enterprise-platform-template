# Delta for Tenant-Team

## ADDED Requirements

### Requirement: Team Notification Dispatch

After each successful team mutation, tenant-team-service MUST call `createNotification()` to notify the affected user(s).

Calls MUST be wrapped in `try/catch`. A notification dispatch failure MUST NOT cause the team mutation to fail.

The `team_invited` case MUST resolve the invited user's `userId` from `auth.users` by email before dispatching:
- If the user exists → create in-app notification AND send email
- If the user does not exist → send email only (no in-app row; userId is unknown)

#### Scenario: team_invited — existing user

- GIVEN `inviteTenantMember` succeeds for a registered user
- WHEN `auth.users` is queried by the invited email and a user is found
- THEN `createNotification` is called with `type: "team_invited"` for that userId
- AND both in-app and email are dispatched (critical — bypasses preferences)
- AND `metadata` includes `JSON.stringify({ inviterId, role })`
- AND `title` is `"You were invited to join {tenantName}"`

#### Scenario: team_invited — new user (no account yet)

- GIVEN `inviteTenantMember` succeeds for an email with no account
- WHEN `auth.users` is queried by email and no user is found
- THEN the email adapter sends an invitation email directly (no in-app row created)
- AND no `notifications` row is inserted

#### Scenario: team_invitation_accepted notifies inviter

- GIVEN `acceptTenantInvitation` succeeds
- WHEN the invitation row is resolved to the original inviter
- THEN `createNotification` is called with `type: "team_invitation_accepted"` for the inviter's userId
- AND `metadata` includes `JSON.stringify({ acceptedByName, role })`

#### Scenario: team_role_changed notifies affected member

- GIVEN `changeTenantMemberRole` succeeds
- WHEN the role update is persisted
- THEN `createNotification` is called with `type: "team_role_changed"` for the affected member's userId
- AND `metadata` includes `JSON.stringify({ previousRole, newRole, changedBy })`

#### Scenario: team_removed — email-only

- GIVEN `removeTenantMember` succeeds
- WHEN the member is removed from the tenant
- THEN the email adapter sends a removal notice to the removed member's email
- AND no in-app notification row is created (member loses tenant access)
- AND the email is sent regardless of preferences (critical)

#### Scenario: Notification failure is non-blocking

- GIVEN `createNotification` throws an error
- WHEN called after `changeTenantMemberRole`
- THEN the role change is NOT rolled back
- AND the error is logged to Sentry
- AND `tenant-team-service` returns success to its caller
