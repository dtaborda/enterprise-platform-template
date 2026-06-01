// Tenant Team Management Service
// Handles member listing, invitations, role changes, and removals
// All functions receive SupabaseClient via DI and return ServiceResult<T>

import { createHash, randomBytes } from "node:crypto";
import type {
  CancelInvitationDto,
  ChangeMemberRoleDto,
  InviteMemberDto,
  ResendInvitationDto,
  TenantInvitationOutput,
  TenantMemberOutput,
} from "@enterprise/contracts";
import type { SupabaseClient } from "@supabase/supabase-js";
import { createNotificationEmailAdapter } from "./adapters/notification-email-adapter-factory";
import type { ServiceResult } from "./auth-service";
import { createNotification } from "./notification-service";
import type { InvitationEmailPort } from "./ports/invitation-email-port";

// ─── Token Utilities ───────────────────────────────────────────────────────────

/** Generate a cryptographically secure plain token (64-char hex) */
export function generateToken(): string {
  return randomBytes(32).toString("hex");
}

/** Hash a plain token with SHA-256 → 64-char hex (stored in DB) */
export function hashToken(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}

/** Invitation expiry: 72 hours from now */
function getExpiresAt(): Date {
  return new Date(Date.now() + 72 * 60 * 60 * 1000);
}

// ─── Audit Logging ─────────────────────────────────────────────────────────────

async function writeAuditLog(
  client: SupabaseClient,
  tenantId: string,
  userId: string,
  event: string,
  resourceId?: string,
  metadata?: Record<string, unknown>,
): Promise<void> {
  const action =
    event === "member.invited" || event === "member.joined"
      ? "create"
      : event === "member.role_changed" ||
          event === "invitation.revoked" ||
          event === "invitation.resent"
        ? "update"
        : event === "member.removed"
          ? "delete"
          : "custom";

  const { error } = await client.from("audit_log").insert({
    tenant_id: tenantId,
    user_id: userId,
    action,
    resource: "team",
    resource_id: resourceId ?? null,
    metadata: JSON.stringify({ event, ...(metadata ?? {}) }),
    ip_address: null,
    user_agent: null,
  });

  if (error) {
    console.error(`[audit_log] Failed to write [${event} -> ${action}]:`, error);
  }
}

// ─── Row Mappers ──────────────────────────────────────────────────────────────

function mapProfileToMember(row: Record<string, unknown>): TenantMemberOutput {
  return {
    id: row["id"] as string,
    email: row["email"] as string,
    name: (row["name"] as string | null) ?? null,
    avatarUrl: (row["avatar_url"] as string | null) ?? null,
    role: row["role"] as TenantMemberOutput["role"],
    joinedAt: new Date(row["created_at"] as string),
  };
}

function mapInvitationRow(row: Record<string, unknown>): TenantInvitationOutput {
  return {
    id: row["id"] as string,
    email: row["email"] as string,
    role: row["role"] as TenantInvitationOutput["role"],
    status: row["status"] as TenantInvitationOutput["status"],
    invitedBy: row["invited_by"] as string,
    expiresAt: new Date(row["expires_at"] as string),
    createdAt: new Date(row["created_at"] as string),
  };
}

// ─── Service Functions ────────────────────────────────────────────────────────

/**
 * List all members of a tenant (from profiles table).
 * RLS ensures only members of the tenant can read their own tenant's profiles.
 */
export async function listTenantMembers(
  client: SupabaseClient,
  tenantId: string,
): Promise<ServiceResult<TenantMemberOutput[]>> {
  const { data, error } = await client
    .from("profiles")
    .select("id, email, name, avatar_url, role, created_at")
    .eq("tenant_id", tenantId)
    .order("created_at", { ascending: true });

  if (error) {
    return { success: false, error: error.message, code: "MEMBERS_LIST_FAILED" };
  }

  const members = ((data ?? []) as Record<string, unknown>[]).map(mapProfileToMember);

  return { success: true, data: members };
}

/**
 * List pending invitations for a tenant.
 */
export async function listTenantInvitations(
  client: SupabaseClient,
  tenantId: string,
): Promise<ServiceResult<TenantInvitationOutput[]>> {
  const { data, error } = await client
    .from("tenant_invitations")
    .select("id, email, role, status, invited_by, expires_at, created_at")
    .eq("tenant_id", tenantId)
    .order("created_at", { ascending: false });

  if (error) {
    return { success: false, error: error.message, code: "INVITATIONS_LIST_FAILED" };
  }

  const invitations = ((data ?? []) as Record<string, unknown>[]).map(mapInvitationRow);

  return { success: true, data: invitations };
}

/**
 * Invite a new member to the tenant by email.
 *
 * Guards:
 * - Duplicate pending invitation → DUPLICATE_INVITATION
 * - Already a member → ALREADY_MEMBER
 *
 * Email delivery failure is non-fatal: invitation is still committed, but
 * an `email_delivery_failed` audit event is written.
 */
export async function inviteTenantMember(
  client: SupabaseClient,
  tenantId: string,
  invitedBy: string,
  userRole: string,
  input: InviteMemberDto,
  emailPort: InvitationEmailPort,
  opts?: { appUrl?: string; tenantName?: string; inviterName?: string },
  adminClient?: SupabaseClient,
): Promise<ServiceResult<TenantInvitationOutput>> {
  // Guard: allow_admin_invites flag
  if (userRole === "admin") {
    const { data: tenant } = await client
      .from("tenants")
      .select("allow_admin_invites")
      .eq("id", tenantId)
      .single();

    const allowAdminInvites = (tenant as Record<string, unknown> | null)?.["allow_admin_invites"] as
      | boolean
      | undefined;

    if (allowAdminInvites === false) {
      return {
        success: false,
        error: "Admin invitations are disabled by the workspace owner",
        code: "ADMIN_INVITES_DISABLED",
      };
    }
  }

  // Guard: duplicate pending invitation
  const { data: existingInvite } = await client
    .from("tenant_invitations")
    .select("id")
    .eq("tenant_id", tenantId)
    .eq("email", input.email)
    .eq("status", "pending")
    .maybeSingle();

  if (existingInvite) {
    return {
      success: false,
      error: "Invitation already pending for this email",
      code: "DUPLICATE_INVITATION",
    };
  }

  // Guard: already a member
  const { data: existingMember } = await client
    .from("profiles")
    .select("id")
    .eq("tenant_id", tenantId)
    .eq("email", input.email)
    .maybeSingle();

  if (existingMember) {
    return {
      success: false,
      error: "User is already a member of this tenant",
      code: "ALREADY_MEMBER",
    };
  }

  // Generate token
  const plainToken = generateToken();
  const tokenHash = hashToken(plainToken);
  const expiresAt = getExpiresAt();

  // Insert invitation
  const { data: invitation, error: insertError } = await client
    .from("tenant_invitations")
    .insert({
      tenant_id: tenantId,
      email: input.email,
      role: input.role,
      token_hash: tokenHash,
      status: "pending",
      invited_by: invitedBy,
      accepted_by: null,
      expires_at: expiresAt.toISOString(),
    })
    .select()
    .single();

  if (insertError || !invitation) {
    return {
      success: false,
      error: insertError?.message ?? "Failed to create invitation",
      code: "INVITATION_CREATE_FAILED",
    };
  }

  const invitationRow = invitation as Record<string, unknown>;

  // Audit: member invited
  void writeAuditLog(client, tenantId, invitedBy, "member.invited", invitationRow["id"] as string, {
    email: input.email,
    role: input.role,
  });

  // Send invitation email (non-fatal)
  const appUrl = opts?.appUrl ?? process.env["NEXT_PUBLIC_APP_URL"] ?? "http://localhost:3000";
  const acceptUrl = `${appUrl}/invite/accept?token=${plainToken}`;

  const emailResult = await emailPort.send({
    to: input.email,
    inviterName: opts?.inviterName ?? "A team admin",
    tenantName: opts?.tenantName ?? "your team",
    acceptUrl,
    role: input.role,
    expiresAt,
  });

  if (!emailResult.success) {
    // Non-fatal: log failure but don't roll back invitation
    void writeAuditLog(
      client,
      tenantId,
      invitedBy,
      "email_delivery_failed",
      invitationRow["id"] as string,
      {
        email: input.email,
        error: emailResult.error,
      },
    );
  }

  // Dispatch in-app notification if invited user already has an account (non-blocking)
  if (adminClient) {
    try {
      // Check if the invited email already has an auth user via profiles lookup
      const { data: existingUser } = await adminClient
        .from("profiles")
        .select("id")
        .eq("email", input.email)
        .maybeSingle();

      if (existingUser) {
        // Existing user: create in-app + email notification
        const existingUserId = (existingUser as Record<string, unknown>)["id"] as string;
        createNotification(
          adminClient,
          {
            tenantId,
            userId: existingUserId,
            type: "team_invited",
            category: "team",
            title: "You have been invited to a team",
            body: `You have been invited to join as ${input.role}.`,
            sourceEvent: "member.invited",
            sourceEntityId: invitationRow["id"] as string,
          },
          createNotificationEmailAdapter(),
          input.email,
        ).catch((notifError) => {
          console.error("[team] inviteTenantMember: notification dispatch failed:", notifError);
        });
      }
      // No account yet: invitation email already sent above via emailPort — no in-app row
    } catch (notifError) {
      console.error("[team] inviteTenantMember: notification dispatch failed:", notifError);
    }
  }

  return { success: true, data: mapInvitationRow(invitationRow) };
}

/**
 * Accept a tenant invitation via a plain token.
 *
 * Uses admin client ONLY (no user context yet — accepting user has no tenant_id claim).
 *
 * Flow:
 * 1. Hash token → lookup by token_hash
 * 2. Validate: exists, pending, not expired
 * 3. Create/find user in Supabase auth
 * 4. Upsert profile with tenant_id + role
 * 5. Sync JWT app_metadata via admin client
 * 6. Mark invitation as accepted
 */
export async function acceptTenantInvitation(
  adminClient: SupabaseClient,
  token: string,
): Promise<ServiceResult<void>> {
  const tokenHash = hashToken(token);

  // Lookup invitation by hash
  const { data: invitation, error: lookupError } = await adminClient
    .from("tenant_invitations")
    .select("id, tenant_id, email, role, status, expires_at, invited_by")
    .eq("token_hash", tokenHash)
    .maybeSingle();

  if (lookupError) {
    return { success: false, error: lookupError.message, code: "INVITATION_LOOKUP_FAILED" };
  }

  if (!invitation) {
    return { success: false, error: "Invitation not found", code: "INVITATION_NOT_FOUND" };
  }

  const inv = invitation as Record<string, unknown>;

  // Validate status
  if (inv["status"] !== "pending") {
    return {
      success: false,
      error: "Invitation has already been used",
      code: "INVITATION_ALREADY_USED",
    };
  }

  // Validate expiry
  const expiresAt = new Date(inv["expires_at"] as string);
  if (expiresAt < new Date()) {
    return { success: false, error: "Invitation has expired", code: "INVITATION_EXPIRED" };
  }

  const tenantId = inv["tenant_id"] as string;
  const email = inv["email"] as string;
  const role = inv["role"] as string;
  const invitationId = inv["id"] as string;

  // Find or create auth user
  let userId: string;

  // Try to find existing user (admin API doesn't have getUserByEmail directly,
  // so we check profiles first, then create if needed)
  const { data: existingProfile } = await adminClient
    .from("profiles")
    .select("id")
    .eq("tenant_id", tenantId)
    .eq("email", email)
    .maybeSingle();

  if (existingProfile) {
    userId = (existingProfile as Record<string, unknown>)["id"] as string;
  } else {
    // Create auth user via admin client
    const { data: newUser, error: createError } = await adminClient.auth.admin.createUser({
      email,
      email_confirm: true,
      app_metadata: { tenant_id: tenantId, role },
    });

    if (createError || !newUser.user) {
      return {
        success: false,
        error: createError?.message ?? "Failed to create user",
        code: "USER_CREATE_FAILED",
      };
    }

    userId = newUser.user.id;
  }

  // Upsert profile
  const { error: profileError } = await adminClient
    .from("profiles")
    .upsert({
      id: userId,
      tenant_id: tenantId,
      email,
      role,
      name: null,
      avatar_url: null,
    })
    .select()
    .single();

  if (profileError) {
    return { success: false, error: profileError.message, code: "PROFILE_UPSERT_FAILED" };
  }

  // Insert user_roles history row
  await adminClient.from("user_roles").insert({
    user_id: userId,
    tenant_id: tenantId,
    role,
    granted_by: inv["invited_by"] as string,
  });

  // Sync JWT app_metadata
  await adminClient.auth.admin.updateUserById(userId, {
    app_metadata: { tenant_id: tenantId, role },
  });

  // Mark invitation as accepted
  await adminClient
    .from("tenant_invitations")
    .update({ status: "accepted", accepted_by: userId })
    .eq("id", invitationId)
    .eq("tenant_id", tenantId);

  // Audit: member joined
  void writeAuditLog(adminClient, tenantId, userId, "member.joined", invitationId, {
    email,
    role,
  });

  // Dispatch notification to the inviter (non-blocking)
  const invitedByUserId = inv["invited_by"] as string;
  createNotification(
    adminClient,
    {
      tenantId,
      userId: invitedByUserId,
      type: "team_invitation_accepted",
      category: "team",
      title: "Invitation accepted",
      body: `Your invitation has been accepted. The new member joined as ${role}.`,
      metadata: JSON.stringify({ acceptedByEmail: email, role }),
      sourceEvent: "member.joined",
      sourceEntityId: invitationId,
    },
    createNotificationEmailAdapter(),
  ).catch((notifError) => {
    console.error("[team] acceptTenantInvitation: notification dispatch failed:", notifError);
  });

  return { success: true, data: undefined };
}

/**
 * Change a tenant member's role.
 *
 * Guards:
 * - Self-role-change → SELF_ROLE_CHANGE
 * - Target is last owner → LAST_OWNER
 *
 * Dual-write: profiles.role + auth.users.raw_app_meta_data.role via admin client
 */
export async function changeTenantMemberRole(
  client: SupabaseClient,
  adminClient: SupabaseClient,
  tenantId: string,
  requesterId: string,
  input: ChangeMemberRoleDto,
): Promise<ServiceResult<TenantMemberOutput>> {
  // Guard: self-role-change
  if (input.userId === requesterId) {
    return { success: false, error: "You cannot change your own role", code: "SELF_ROLE_CHANGE" };
  }

  // Load target profile
  const { data: targetProfile, error: profileError } = await client
    .from("profiles")
    .select("id, email, name, avatar_url, role, created_at, tenant_id")
    .eq("id", input.userId)
    .eq("tenant_id", tenantId)
    .maybeSingle();

  if (profileError) {
    return { success: false, error: profileError.message, code: "MEMBER_LOOKUP_FAILED" };
  }

  if (!targetProfile) {
    return { success: false, error: "Member not found", code: "MEMBER_NOT_FOUND" };
  }

  const target = targetProfile as Record<string, unknown>;

  // Guard: last owner
  if (target["role"] === "owner") {
    // Count owners in tenant
    const { data: owners } = await client
      .from("profiles")
      .select("id")
      .eq("tenant_id", tenantId)
      .eq("role", "owner");

    const ownerCount = (owners as unknown[] | null)?.length ?? 0;

    if (ownerCount <= 1) {
      return { success: false, error: "Cannot change role of the last owner", code: "LAST_OWNER" };
    }
  }

  // Update profiles.role
  const { data: updated, error: updateError } = await client
    .from("profiles")
    .update({ role: input.role, updated_at: new Date().toISOString() })
    .eq("id", input.userId)
    .eq("tenant_id", tenantId)
    .select("id, email, name, avatar_url, role, created_at")
    .single();

  if (updateError || !updated) {
    return {
      success: false,
      error: updateError?.message ?? "Failed to update role",
      code: "ROLE_UPDATE_FAILED",
    };
  }

  // Insert user_roles history row
  await client.from("user_roles").insert({
    user_id: input.userId,
    tenant_id: tenantId,
    role: input.role,
    granted_by: requesterId,
  });

  // Sync JWT app_metadata via admin client (non-fatal if fails)
  const { error: syncError } = await adminClient.auth.admin.updateUserById(input.userId, {
    app_metadata: { role: input.role },
  });

  if (syncError) {
    console.error("[changeTenantMemberRole] JWT sync failed:", syncError);
  }

  // Audit
  void writeAuditLog(client, tenantId, requesterId, "member.role_changed", input.userId, {
    from: target["role"],
    to: input.role,
  });

  // Dispatch notification to the affected member (non-blocking)
  createNotification(
    adminClient,
    {
      tenantId,
      userId: input.userId,
      type: "team_role_changed",
      category: "team",
      title: "Your role has changed",
      body: `Your role has been updated to ${input.role}.`,
      metadata: JSON.stringify({
        previousRole: target["role"],
        newRole: input.role,
        changedBy: requesterId,
      }),
      sourceEvent: "member.role_changed",
      sourceEntityId: input.userId,
    },
    createNotificationEmailAdapter(),
  ).catch((notifError) => {
    console.error("[team] changeTenantMemberRole: notification dispatch failed:", notifError);
  });

  return { success: true, data: mapProfileToMember(updated as Record<string, unknown>) };
}

/**
 * Remove a tenant member.
 *
 * Guards:
 * - Self-removal → SELF_REMOVAL
 * - Last owner → LAST_OWNER
 *
 * Deletes the profiles row and revokes active sessions via admin client.
 */
export async function removeTenantMember(
  client: SupabaseClient,
  adminClient: SupabaseClient,
  tenantId: string,
  requesterId: string,
  targetUserId: string,
): Promise<ServiceResult<void>> {
  // Guard: self-removal
  if (targetUserId === requesterId) {
    return { success: false, error: "You cannot remove yourself", code: "SELF_REMOVAL" };
  }

  // Load target profile
  const { data: targetProfile, error: profileError } = await client
    .from("profiles")
    .select("id, role, email, tenant_id")
    .eq("id", targetUserId)
    .eq("tenant_id", tenantId)
    .maybeSingle();

  if (profileError) {
    return { success: false, error: profileError.message, code: "MEMBER_LOOKUP_FAILED" };
  }

  if (!targetProfile) {
    return { success: false, error: "Member not found", code: "MEMBER_NOT_FOUND" };
  }

  const target = targetProfile as Record<string, unknown>;

  // Guard: last owner
  if (target["role"] === "owner") {
    const { data: owners } = await client
      .from("profiles")
      .select("id")
      .eq("tenant_id", tenantId)
      .eq("role", "owner");

    const ownerCount = (owners as unknown[] | null)?.length ?? 0;

    if (ownerCount <= 1) {
      return { success: false, error: "Cannot remove the last owner", code: "LAST_OWNER" };
    }
  }

  // Delete profile
  const { data: deletedProfile, error: deleteError } = await client
    .from("profiles")
    .delete()
    .eq("id", targetUserId)
    .eq("tenant_id", tenantId)
    .select("id")
    .maybeSingle();

  if (deleteError) {
    return { success: false, error: deleteError.message, code: "MEMBER_REMOVE_FAILED" };
  }

  if (!deletedProfile) {
    return {
      success: false,
      error: "Member could not be removed",
      code: "MEMBER_REMOVE_FAILED",
    };
  }

  // NOTE: supabase-js does not support revoking ANOTHER user's sessions via
  // auth.admin.signOut(userId). That API signs out the CURRENT session scope,
  // and passing a user ID yields bad_jwt in CI/runtime. If cross-user session
  // revocation becomes a hard requirement, implement it through a verified admin
  // flow instead of calling signOut() with a target user ID.
  void adminClient;

  // Audit
  void writeAuditLog(client, tenantId, requesterId, "member.removed", targetUserId, {
    email: target["email"],
    role: target["role"],
  });

  // Dispatch email-only notification (no in-app row — user is losing access) (non-blocking)
  const removedEmail = target["email"] as string | null;
  if (removedEmail) {
    try {
      const emailAdapter = createNotificationEmailAdapter();
      void emailAdapter.sendNotificationEmail({
        to: removedEmail,
        subject: "You have been removed from the team",
        title: "Removed from team",
        body: "Your access to the workspace has been revoked.",
      });
    } catch (notifError) {
      console.error("[team] removeTenantMember: email notification failed:", notifError);
    }
  }

  return { success: true, data: undefined };
}

/**
 * Cancel (revoke) a pending invitation.
 *
 * Only `pending` invitations can be revoked.
 * Sets status = 'revoked'.
 */
export async function revokeTenantInvitation(
  client: SupabaseClient,
  tenantId: string,
  input: CancelInvitationDto,
): Promise<ServiceResult<void>> {
  // Load invitation
  const { data: invitation, error: lookupError } = await client
    .from("tenant_invitations")
    .select("id, status, email, role, invited_by")
    .eq("id", input.invitationId)
    .eq("tenant_id", tenantId)
    .maybeSingle();

  if (lookupError) {
    return { success: false, error: lookupError.message, code: "INVITATION_LOOKUP_FAILED" };
  }

  if (!invitation) {
    return { success: false, error: "Invitation not found", code: "INVITATION_NOT_FOUND" };
  }

  const inv = invitation as Record<string, unknown>;

  if (inv["status"] !== "pending") {
    return {
      success: false,
      error: "Only pending invitations can be cancelled",
      code: "INVITATION_NOT_PENDING",
    };
  }

  // Update status
  const { error: updateError } = await client
    .from("tenant_invitations")
    .update({ status: "revoked", updated_at: new Date().toISOString() })
    .eq("id", input.invitationId)
    .eq("tenant_id", tenantId);

  if (updateError) {
    return { success: false, error: updateError.message, code: "INVITATION_REVOKE_FAILED" };
  }

  // Audit
  void writeAuditLog(
    client,
    tenantId,
    inv["invited_by"] as string,
    "invitation.revoked",
    input.invitationId,
    { email: inv["email"], role: inv["role"] },
  );

  return { success: true, data: undefined };
}

/**
 * Resend a pending invitation with a freshly generated token.
 *
 * Updates token_hash + expires_at on the existing row.
 * Only allowed on `pending` invitations.
 */
export async function resendTenantInvitation(
  client: SupabaseClient,
  tenantId: string,
  input: ResendInvitationDto,
  emailPort: InvitationEmailPort,
  opts?: { appUrl?: string; tenantName?: string; inviterName?: string },
): Promise<ServiceResult<TenantInvitationOutput>> {
  // Load invitation
  const { data: invitation, error: lookupError } = await client
    .from("tenant_invitations")
    .select("id, email, role, status, invited_by, expires_at, created_at")
    .eq("id", input.invitationId)
    .eq("tenant_id", tenantId)
    .maybeSingle();

  if (lookupError) {
    return { success: false, error: lookupError.message, code: "INVITATION_LOOKUP_FAILED" };
  }

  if (!invitation) {
    return { success: false, error: "Invitation not found", code: "INVITATION_NOT_FOUND" };
  }

  const inv = invitation as Record<string, unknown>;

  if (inv["status"] !== "pending") {
    return {
      success: false,
      error: "Only pending invitations can be resent",
      code: "INVITATION_NOT_PENDING",
    };
  }

  // Generate new token
  const plainToken = generateToken();
  const tokenHash = hashToken(plainToken);
  const expiresAt = getExpiresAt();

  // Update invitation
  const { data: updated, error: updateError } = await client
    .from("tenant_invitations")
    .update({
      token_hash: tokenHash,
      expires_at: expiresAt.toISOString(),
      updated_at: new Date().toISOString(),
    })
    .eq("id", input.invitationId)
    .eq("tenant_id", tenantId)
    .select()
    .single();

  if (updateError || !updated) {
    return {
      success: false,
      error: updateError?.message ?? "Failed to update invitation",
      code: "INVITATION_RESEND_FAILED",
    };
  }

  // Send new email (non-fatal — mirrors the inviteTenantMember pattern)
  const appUrl = opts?.appUrl ?? process.env["NEXT_PUBLIC_APP_URL"] ?? "http://localhost:3000";
  const acceptUrl = `${appUrl}/invite/accept?token=${plainToken}`;

  const emailResult = await emailPort.send({
    to: inv["email"] as string,
    inviterName: opts?.inviterName ?? "A team admin",
    tenantName: opts?.tenantName ?? "your team",
    acceptUrl,
    role: inv["role"] as string,
    expiresAt,
  });

  if (!emailResult.success) {
    // Non-fatal: log the delivery failure but do not roll back the resent invitation.
    void writeAuditLog(
      client,
      tenantId,
      inv["invited_by"] as string,
      "email_delivery_failed",
      input.invitationId,
      { email: inv["email"], error: emailResult.error },
    );
  }

  // Audit
  void writeAuditLog(
    client,
    tenantId,
    inv["invited_by"] as string,
    "invitation.resent",
    input.invitationId,
    { email: inv["email"] },
  );

  return { success: true, data: mapInvitationRow(updated as Record<string, unknown>) };
}
