// Generic DTOs for platform-level operations - reusable across any enterprise app

import { z } from "zod";

/** ============================================================================
 * Tenant DTOs
 * ============================================================================ */

/** Create tenant input */
export const createTenantDto = z.object({
  name: z.string().min(1).max(255),
  slug: z.string().min(1).max(100),
});

export type CreateTenantDto = z.infer<typeof createTenantDto>;

/** Update tenant input */
export const updateTenantDto = z.object({
  name: z.string().min(1).max(255).optional(),
  settings: z.record(z.string(), z.unknown()).optional(),
});

export type UpdateTenantDto = z.infer<typeof updateTenantDto>;

/** ============================================================================
 * User DTOs
 * ============================================================================ */

/** Create user (invite) input */
export const createUserDto = z.object({
  email: z.string().email(),
  name: z.string().min(1).max(255).optional(),
  role: z.enum(["owner", "admin", "member", "guest"]),
});

export type CreateUserDto = z.infer<typeof createUserDto>;

/** Update user input */
export const updateUserDto = z.object({
  name: z.string().min(1).max(255).optional(),
  avatarUrl: z.string().url().optional(),
  role: z.enum(["owner", "admin", "member", "guest"]).optional(),
});

export type UpdateUserDto = z.infer<typeof updateUserDto>;

/** ============================================================================
 * Auth DTOs
 * ============================================================================ */

/** Login credentials */
export const loginDto = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

export type LoginDto = z.infer<typeof loginDto>;

/** Sign-up input */
export const signUpDto = z.object({
  name: z.string().min(1).max(255).optional(),
  email: z.string().email(),
  password: z.string().min(8),
});

export type SignUpDto = z.infer<typeof signUpDto>;

/** Password change */
export const changePasswordDto = z.object({
  currentPassword: z.string().min(1),
  newPassword: z.string().min(8),
});

export type ChangePasswordDto = z.infer<typeof changePasswordDto>;

/** Password reset request */
export const resetPasswordDto = z.object({
  email: z.string().email(),
});

export type ResetPasswordDto = z.infer<typeof resetPasswordDto>;

/** Password reset completion */
export const updatePasswordDto = z
  .object({
    password: z.string().min(8),
    confirmPassword: z.string().min(8),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "Passwords do not match",
    path: ["confirmPassword"],
  });

export type UpdatePasswordDto = z.infer<typeof updatePasswordDto>;

/** ============================================================================
 * Audit DTOs
 * ============================================================================ */

/** Create audit entry */
export const createAuditDto = z.object({
  action: z.enum(["create", "read", "update", "delete", "login", "logout", "custom"]),
  resource: z.string().min(1),
  resourceId: z.string().uuid().optional(),
  metadata: z.record(z.string(), z.unknown()).optional(),
});

export type CreateAuditDto = z.infer<typeof createAuditDto>;

/** Audit query params */
export const auditQueryDto = z.object({
  userId: z.string().uuid().optional(),
  action: z.enum(["create", "read", "update", "delete", "login", "logout", "custom"]).optional(),
  resource: z.string().optional(),
  startDate: z.date().optional(),
  endDate: z.date().optional(),
  limit: z.number().int().min(1).max(100).default(50),
  cursor: z.string().optional(),
});

export type AuditQueryDto = z.infer<typeof auditQueryDto>;
