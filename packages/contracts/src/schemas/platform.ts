// Generic Zod schemas for platform entities - reusable across any enterprise app

import { z } from "zod";

// ============================================================================
// Core Schemas
// ============================================================================

/** UUID schema - prefer this over string for IDs */
export const uuidSchema = z.string().uuid();

/** Timestamp schema */
export const timestampSchema = z.date();

/** Entity base schema */
export const entitySchema = z.object({
  id: uuidSchema,
  createdAt: timestampSchema,
  updatedAt: timestampSchema,
});

/** Soft-deletable entity base */
export const softDeletableSchema = entitySchema.extend({
  deletedAt: timestampSchema.nullable(),
});

// ============================================================================
// User & Auth Schemas
// ============================================================================

/** User role enum */
export const userRoleSchema = z.enum(["owner", "admin", "member", "guest"]);

/** Platform user schema */
export const platformUserSchema = entitySchema.extend({
  email: z.string().email(),
  name: z.string().nullable(),
  avatarUrl: z.string().url().nullable(),
  role: userRoleSchema,
  tenantId: uuidSchema,
});

/** Auth session schema */
export const authSessionSchema = z.object({
  userId: uuidSchema,
  tenantId: uuidSchema,
  role: userRoleSchema,
  expiresAt: timestampSchema,
});

/** Registration metadata sent to Supabase auth.signUp() */
export const registrationMetadataSchema = z.object({
  name: z.string().min(1).max(255).optional(),
  role: userRoleSchema.optional(),
});

/** Invitation metadata sent to Supabase auth APIs */
export const invitationMetadataSchema = z.object({
  tenantId: uuidSchema.optional(),
  role: userRoleSchema.optional(),
  invitedBy: uuidSchema.optional(),
});

// ============================================================================
// Tenant Schemas
// ============================================================================

/** Tenant status */
export const tenantStatusSchema = z.enum(["active", "inactive", "suspended"]);

/** Tenant schema */
export const tenantSchema = entitySchema.extend({
  name: z.string().min(1).max(255),
  slug: z.string().min(1).max(100),
  status: tenantStatusSchema,
  settings: z.record(z.string(), z.unknown()).optional(),
});

// ============================================================================
// Audit Schemas
// ============================================================================

/** Audit action enum */
export const auditActionSchema = z.enum([
  "create",
  "read",
  "update",
  "delete",
  "login",
  "logout",
  "custom",
]);

/** Audit entry schema */
export const auditEntrySchema = entitySchema.extend({
  tenantId: uuidSchema,
  userId: uuidSchema,
  action: auditActionSchema,
  resource: z.string().min(1),
  resourceId: uuidSchema.nullable(),
  metadata: z.record(z.string(), z.unknown()).nullable(),
  ipAddress: z.string().ip().nullable(),
  userAgent: z.string().nullable(),
});

// ============================================================================
// Pagination Schemas
// ============================================================================

/** Page info schema */
export const pageInfoSchema = z.object({
  hasNextPage: z.boolean(),
  hasPreviousPage: z.boolean(),
  startCursor: z.string().nullable(),
  endCursor: z.string().nullable(),
});

/** Paginated result wrapper */
export function paginatedSchema<T extends z.ZodType>(itemSchema: T) {
  return z.object({
    items: z.array(itemSchema),
    pageInfo: pageInfoSchema,
  });
}

// ============================================================================
// Action Result Schemas
// ============================================================================

/** Action error schema */
export const actionErrorSchema = z.object({
  code: z.string(),
  message: z.string(),
  details: z.record(z.string(), z.unknown()).optional(),
});

/** Generic action result */
export function actionResultSchema<T extends z.ZodType>(dataSchema: T) {
  return z.object({
    success: z.boolean(),
    data: dataSchema.optional(),
    error: actionErrorSchema.optional(),
  });
}

// ============================================================================
// Common Field Schemas
// ============================================================================

/** Email field */
export const emailField = z.string().email();

/** Name field */
export const nameField = z.string().min(1).max(255);

/** Slug field - for URLs */
export const slugField = z
  .string()
  .min(1)
  .max(100)
  .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, "Invalid slug format");

/** Pagination params */
export const paginationParamsSchema = z.object({
  limit: z.number().int().min(1).max(100).default(20),
  cursor: z.string().optional(),
});

// ============================================================================
// Type Exports
// ============================================================================

export type PlatformUser = z.infer<typeof platformUserSchema>;
export type AuthSession = z.infer<typeof authSessionSchema>;
export type RegistrationMetadata = z.infer<typeof registrationMetadataSchema>;
export type InvitationMetadata = z.infer<typeof invitationMetadataSchema>;
export type Tenant = z.infer<typeof tenantSchema>;
export type AuditEntry = z.infer<typeof auditEntrySchema>;
export type ActionError = z.infer<typeof actionErrorSchema>;
export type UserRole = z.infer<typeof userRoleSchema>;
export type AuditAction = z.infer<typeof auditActionSchema>;
export type TenantStatus = z.infer<typeof tenantStatusSchema>;
export type PaginationParams = z.infer<typeof paginationParamsSchema>;
export type PageInfo = z.infer<typeof pageInfoSchema>;
