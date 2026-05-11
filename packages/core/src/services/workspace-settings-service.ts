// Workspace Settings Service
// Handles workspace profile, regional, security, and logo management
// All functions receive SupabaseClient via DI and return ServiceResult<T>

import type {
  UpdateWorkspaceProfileDto,
  UpdateWorkspaceRegionalDto,
  UpdateWorkspaceSecurityDto,
  UpdateWorkspaceSlugDto,
} from "@enterprise/contracts";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { ServiceResult } from "./auth-service";

// ─── Types ────────────────────────────────────────────────────────────────────

export interface WorkspaceSettings {
  id: string;
  name: string;
  slug: string;
  logoPath: string | null;
  logoUrl: string | null; // derived from logoPath via storage.getPublicUrl
  timezone: string;
  locale: string;
  allowAdminInvites: boolean;
  updatedAt: string;
}

// ─── Audit Logging ────────────────────────────────────────────────────────────

async function writeAuditLog(
  client: SupabaseClient,
  tenantId: string,
  userId: string,
  event: string,
  resourceId?: string,
  metadata?: Record<string, unknown>,
): Promise<void> {
  const action = event.includes("removed") ? "delete" : "update";

  const { error } = await client.from("audit_log").insert({
    tenant_id: tenantId,
    user_id: userId,
    action,
    resource: "workspace-settings",
    resource_id: resourceId ?? null,
    metadata: JSON.stringify({ event, ...(metadata ?? {}) }),
    ip_address: null,
    user_agent: null,
  });

  if (error) {
    console.error(`[audit_log] Failed to write [${event} -> ${action}]:`, error);
  }
}

// ─── Role Helpers ─────────────────────────────────────────────────────────────

function isOwner(role: string): boolean {
  return role === "owner";
}

function isOwnerOrAdmin(role: string): boolean {
  return role === "owner" || role === "admin";
}

// ─── Service Functions ────────────────────────────────────────────────────────

/**
 * Get workspace settings for the current tenant.
 * Uses authenticated client (RLS: tenants_select allows tenant members to read own row).
 */
export async function getWorkspaceSettings(
  client: SupabaseClient,
  tenantId: string,
): Promise<ServiceResult<WorkspaceSettings>> {
  const { data, error } = await client
    .from("tenants")
    .select("id, name, slug, logo_path, timezone, locale, allow_admin_invites, updated_at")
    .eq("id", tenantId)
    .single();

  if (error || !data) {
    return {
      success: false,
      error: error?.message ?? "Workspace not found",
      code: "WORKSPACE_NOT_FOUND",
    };
  }

  const row = data as Record<string, unknown>;
  const logoPath = row["logo_path"] as string | null;

  // Derive public URL if logo exists
  let logoUrl: string | null = null;
  if (logoPath) {
    const { data: urlData } = client.storage.from("workspace-logos").getPublicUrl(logoPath);
    logoUrl = urlData?.publicUrl ?? null;
  }

  return {
    success: true,
    data: {
      id: row["id"] as string,
      name: row["name"] as string,
      slug: row["slug"] as string,
      logoPath,
      logoUrl,
      timezone: row["timezone"] as string,
      locale: row["locale"] as string,
      allowAdminInvites: row["allow_admin_invites"] as boolean,
      updatedAt: row["updated_at"] as string,
    },
  };
}

/**
 * Update workspace name. Owner or Admin.
 * Uses adminClient for DB mutation (tenants_update is serviceRole-only).
 */
export async function updateWorkspaceProfile(
  adminClient: SupabaseClient,
  tenantId: string,
  userId: string,
  userRole: string,
  input: UpdateWorkspaceProfileDto,
): Promise<ServiceResult<{ name: string }>> {
  if (!isOwnerOrAdmin(userRole)) {
    return { success: false, error: "Insufficient permissions", code: "FORBIDDEN" };
  }

  const { data, error } = await adminClient
    .from("tenants")
    .update({
      name: input.name,
      updated_at: new Date().toISOString(),
    })
    .eq("id", tenantId)
    .select("name")
    .single();

  if (error || !data) {
    return {
      success: false,
      error: error?.message ?? "Failed to update profile",
      code: "UPDATE_FAILED",
    };
  }

  void writeAuditLog(adminClient, tenantId, userId, "workspace.name_updated", tenantId, {
    newName: input.name,
    updatedBy: userId,
  });

  return {
    success: true,
    data: { name: (data as Record<string, unknown>)["name"] as string },
  };
}

/**
 * Update workspace slug. Owner ONLY.
 * Pre-checks uniqueness before update. DB UNIQUE constraint is the final guard.
 */
export async function updateWorkspaceSlug(
  adminClient: SupabaseClient,
  tenantId: string,
  userId: string,
  userRole: string,
  input: UpdateWorkspaceSlugDto,
): Promise<ServiceResult<{ slug: string }>> {
  if (!isOwner(userRole)) {
    return {
      success: false,
      error: "Only owners can change the workspace slug",
      code: "FORBIDDEN",
    };
  }

  // Pre-check uniqueness (UX-friendly error message)
  const { data: existing } = await adminClient
    .from("tenants")
    .select("id")
    .eq("slug", input.slug)
    .neq("id", tenantId)
    .maybeSingle();

  if (existing) {
    return {
      success: false,
      error: "This slug is already taken by another workspace",
      code: "SLUG_CONFLICT",
    };
  }

  const { data, error } = await adminClient
    .from("tenants")
    .update({
      slug: input.slug,
      updated_at: new Date().toISOString(),
    })
    .eq("id", tenantId)
    .select("slug")
    .single();

  if (error) {
    // Catch race condition: UNIQUE constraint violation
    if (error.code === "23505") {
      return {
        success: false,
        error: "This slug is already taken by another workspace",
        code: "SLUG_CONFLICT",
      };
    }
    return { success: false, error: error.message, code: "UPDATE_FAILED" };
  }

  void writeAuditLog(adminClient, tenantId, userId, "workspace.slug_updated", tenantId, {
    newSlug: input.slug,
    updatedBy: userId,
  });

  return {
    success: true,
    data: { slug: (data as Record<string, unknown>)["slug"] as string },
  };
}

/**
 * Upload workspace logo. Owner or Admin.
 * Uses authClient for Storage (RLS-scoped upload) + adminClient for DB update.
 */
export async function uploadWorkspaceLogo(
  client: SupabaseClient,
  adminClient: SupabaseClient,
  tenantId: string,
  userId: string,
  userRole: string,
  file: File,
): Promise<ServiceResult<{ logoUrl: string }>> {
  if (!isOwnerOrAdmin(userRole)) {
    return { success: false, error: "Insufficient permissions", code: "FORBIDDEN" };
  }

  // Validate file type
  const allowedTypes = ["image/png", "image/jpeg", "image/webp"];
  if (!allowedTypes.includes(file.type)) {
    return {
      success: false,
      error: "Only PNG, JPG, and WebP images are supported",
      code: "VALIDATION_ERROR",
    };
  }

  // Validate file size (2 MB)
  const maxSize = 2 * 1024 * 1024;
  if (file.size > maxSize) {
    return {
      success: false,
      error: "Logo must be under 2 MB",
      code: "VALIDATION_ERROR",
    };
  }

  // Derive extension from MIME type
  const extMap: Record<string, string> = {
    "image/png": "png",
    "image/jpeg": "jpg",
    "image/webp": "webp",
  };
  const ext = extMap[file.type] ?? "png";
  const storagePath = `${tenantId}/logo.${ext}`;

  // Upload to Storage via auth client (RLS validates tenant + role)
  const { error: uploadError } = await client.storage
    .from("workspace-logos")
    .upload(storagePath, file, { upsert: true });

  if (uploadError) {
    return {
      success: false,
      error: uploadError.message,
      code: "UPLOAD_FAILED",
    };
  }

  // Update DB via admin client (tenants_update is serviceRole-only)
  const { error: dbError } = await adminClient
    .from("tenants")
    .update({
      logo_path: storagePath,
      updated_at: new Date().toISOString(),
    })
    .eq("id", tenantId);

  if (dbError) {
    return { success: false, error: dbError.message, code: "UPDATE_FAILED" };
  }

  // Get public URL
  const { data: urlData } = client.storage.from("workspace-logos").getPublicUrl(storagePath);

  void writeAuditLog(adminClient, tenantId, userId, "workspace.logo_updated", tenantId, {
    updatedBy: userId,
  });

  return { success: true, data: { logoUrl: urlData.publicUrl } };
}

/**
 * Remove workspace logo. Owner or Admin.
 * Deletes Storage object + clears logo_path in DB.
 */
export async function removeWorkspaceLogo(
  client: SupabaseClient,
  adminClient: SupabaseClient,
  tenantId: string,
  userId: string,
  userRole: string,
): Promise<ServiceResult<null>> {
  if (!isOwnerOrAdmin(userRole)) {
    return { success: false, error: "Insufficient permissions", code: "FORBIDDEN" };
  }

  // Get current logo path from DB
  const { data: tenant } = await adminClient
    .from("tenants")
    .select("logo_path")
    .eq("id", tenantId)
    .single();

  const currentPath = (tenant as Record<string, unknown> | null)?.["logo_path"] as string | null;

  if (currentPath) {
    // Delete from Storage via auth client (RLS validates tenant + role)
    await client.storage.from("workspace-logos").remove([currentPath]);
  }

  // Clear logo_path in DB
  const { error: dbError } = await adminClient
    .from("tenants")
    .update({
      logo_path: null,
      updated_at: new Date().toISOString(),
    })
    .eq("id", tenantId);

  if (dbError) {
    return { success: false, error: dbError.message, code: "UPDATE_FAILED" };
  }

  void writeAuditLog(adminClient, tenantId, userId, "workspace.logo_removed", tenantId, {
    updatedBy: userId,
  });

  return { success: true, data: null };
}

/**
 * Update workspace regional settings. Owner or Admin.
 */
export async function updateWorkspaceRegional(
  adminClient: SupabaseClient,
  tenantId: string,
  userId: string,
  userRole: string,
  input: UpdateWorkspaceRegionalDto,
): Promise<ServiceResult<{ timezone: string; locale: string }>> {
  if (!isOwnerOrAdmin(userRole)) {
    return { success: false, error: "Insufficient permissions", code: "FORBIDDEN" };
  }

  const { data, error } = await adminClient
    .from("tenants")
    .update({
      timezone: input.timezone,
      locale: input.locale,
      updated_at: new Date().toISOString(),
    })
    .eq("id", tenantId)
    .select("timezone, locale")
    .single();

  if (error || !data) {
    return {
      success: false,
      error: error?.message ?? "Failed to update regional settings",
      code: "UPDATE_FAILED",
    };
  }

  void writeAuditLog(adminClient, tenantId, userId, "workspace.regional_updated", tenantId, {
    newTimezone: input.timezone,
    newLocale: input.locale,
    updatedBy: userId,
  });

  const row = data as Record<string, unknown>;
  return {
    success: true,
    data: {
      timezone: row["timezone"] as string,
      locale: row["locale"] as string,
    },
  };
}

/**
 * Update workspace security settings. Owner ONLY.
 */
export async function updateWorkspaceSecurity(
  adminClient: SupabaseClient,
  tenantId: string,
  userId: string,
  userRole: string,
  input: UpdateWorkspaceSecurityDto,
): Promise<ServiceResult<{ allowAdminInvites: boolean }>> {
  if (!isOwner(userRole)) {
    return {
      success: false,
      error: "Only owners can change security settings",
      code: "FORBIDDEN",
    };
  }

  const { data, error } = await adminClient
    .from("tenants")
    .update({
      allow_admin_invites: input.allowAdminInvites,
      updated_at: new Date().toISOString(),
    })
    .eq("id", tenantId)
    .select("allow_admin_invites")
    .single();

  if (error || !data) {
    return {
      success: false,
      error: error?.message ?? "Failed to update security settings",
      code: "UPDATE_FAILED",
    };
  }

  void writeAuditLog(adminClient, tenantId, userId, "workspace.security_updated", tenantId, {
    allowAdminInvites: input.allowAdminInvites,
    updatedBy: userId,
  });

  return {
    success: true,
    data: {
      allowAdminInvites: (data as Record<string, unknown>)["allow_admin_invites"] as boolean,
    },
  };
}
