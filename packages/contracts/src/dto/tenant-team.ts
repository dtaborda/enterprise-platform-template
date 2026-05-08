// Tenant Team Management DTOs
// Schemas for invitations, role changes, and member operations

import { z } from "zod";

// Re-use the shared userRoleSchema values but exclude "owner" for assignable roles
const assignableRoleSchema = z.enum(["admin", "member", "guest"]);

// ============================================================================
// Input Schemas
// ============================================================================

/** Invite a new member to the tenant */
export const inviteMemberSchema = z.object({
  email: z.string().email(),
  role: assignableRoleSchema,
});

export type InviteMemberDto = z.infer<typeof inviteMemberSchema>;

/** Change an existing member's role (owner cannot be assigned) */
export const changeMemberRoleSchema = z.object({
  userId: z.string().uuid(),
  role: assignableRoleSchema,
});

export type ChangeMemberRoleDto = z.infer<typeof changeMemberRoleSchema>;

/** Remove a member from the tenant */
export const removeMemberSchema = z.object({
  userId: z.string().uuid(),
});

export type RemoveMemberDto = z.infer<typeof removeMemberSchema>;

/** Cancel (revoke) a pending invitation */
export const cancelInvitationSchema = z.object({
  invitationId: z.string().uuid(),
});

export type CancelInvitationDto = z.infer<typeof cancelInvitationSchema>;

/** Resend a pending invitation */
export const resendInvitationSchema = z.object({
  invitationId: z.string().uuid(),
});

export type ResendInvitationDto = z.infer<typeof resendInvitationSchema>;

/** Query params for listing members */
export const listMembersQuerySchema = z.object({
  limit: z.number().int().min(1).max(100).default(20),
  offset: z.number().int().min(0).default(0),
});

export type ListMembersQueryDto = z.infer<typeof listMembersQuerySchema>;

// ============================================================================
// Output Schemas
// ============================================================================

/** Full user role enum (includes owner, for output/display purposes) */
const memberRoleSchema = z.enum(["owner", "admin", "member", "guest"]);

/** Invitation status enum */
export const invitationStatusSchema = z.enum(["pending", "accepted", "revoked", "expired"]);

export type InvitationStatus = z.infer<typeof invitationStatusSchema>;

/** A resolved tenant member (from profiles table) */
export const tenantMemberOutputSchema = z.object({
  id: z.string().uuid(),
  email: z.string().email(),
  name: z.string().nullable(),
  avatarUrl: z.string().nullable(),
  role: memberRoleSchema,
  joinedAt: z.date(),
});

export type TenantMemberOutput = z.infer<typeof tenantMemberOutputSchema>;

/** A pending or processed invitation */
export const tenantInvitationOutputSchema = z.object({
  id: z.string().uuid(),
  email: z.string().email(),
  role: assignableRoleSchema,
  status: invitationStatusSchema,
  invitedBy: z.string().uuid(),
  expiresAt: z.date(),
  createdAt: z.date(),
});

export type TenantInvitationOutput = z.infer<typeof tenantInvitationOutputSchema>;
