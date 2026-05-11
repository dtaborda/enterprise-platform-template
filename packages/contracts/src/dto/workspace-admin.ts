import { z } from "zod";

// ============================================================================
// Workspace Profile
// ============================================================================

export const updateWorkspaceProfileSchema = z.object({
  name: z.string().min(1).max(100).trim(),
});

export type UpdateWorkspaceProfileDto = z.infer<typeof updateWorkspaceProfileSchema>;

// ============================================================================
// Workspace Slug
// ============================================================================

export const updateWorkspaceSlugSchema = z.object({
  slug: z
    .string()
    .min(3)
    .max(50)
    .regex(/^[a-z0-9][a-z0-9-]*[a-z0-9]$/, {
      message:
        "Slug must be lowercase alphanumeric, may contain hyphens, and cannot start or end with a hyphen",
    }),
});

export type UpdateWorkspaceSlugDto = z.infer<typeof updateWorkspaceSlugSchema>;

// ============================================================================
// Workspace Regional
// ============================================================================

export const updateWorkspaceRegionalSchema = z.object({
  timezone: z.string().min(1).max(100),
  locale: z.string().min(2).max(10),
});

export type UpdateWorkspaceRegionalDto = z.infer<typeof updateWorkspaceRegionalSchema>;

// ============================================================================
// Workspace Security
// ============================================================================

export const updateWorkspaceSecuritySchema = z.object({
  allowAdminInvites: z.boolean(),
});

export type UpdateWorkspaceSecurityDto = z.infer<typeof updateWorkspaceSecuritySchema>;
