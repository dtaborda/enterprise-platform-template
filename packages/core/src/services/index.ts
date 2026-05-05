// Platform service layer - base services for multi-tenant operations
// These are meant to be extended by domain-specific services

import type { NewAuditLogEntry } from "@enterprise/db";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { ServiceResult } from "./auth-service";

interface TenantRow {
  id: string;
  name: string;
  slug: string;
  status: "active" | "inactive" | "suspended";
  settings: string | null;
  created_at: string;
  updated_at: string;
}

export interface TenantRecord extends Omit<TenantRow, "settings"> {
  settings: Record<string, unknown> | null;
}

export interface ProfileRecord {
  id: string;
  tenant_id: string;
  email: string;
  name: string | null;
  avatar_url: string | null;
  role: "owner" | "admin" | "member" | "guest";
  created_at: string;
  updated_at: string;
}

interface AuditLogRow {
  id: string;
  tenant_id: string;
  user_id: string;
  action: string;
  resource: string;
  resource_id: string | null;
  metadata: string | null;
  ip_address: string | null;
  user_agent: string | null;
  created_at: string;
}

export interface AuditLogRecord extends Omit<AuditLogRow, "metadata"> {
  metadata: Record<string, unknown> | null;
}

export interface UserRoleRecord {
  id: string;
  user_id: string;
  tenant_id: string;
  role: "owner" | "admin" | "member" | "guest";
  granted_by: string;
  granted_at: string;
}

function parseJsonRecord(value: string | null): Record<string, unknown> | null {
  if (!value) {
    return null;
  }

  try {
    const parsed = JSON.parse(value) as unknown;
    return typeof parsed === "object" && parsed !== null
      ? (parsed as Record<string, unknown>)
      : null;
  } catch {
    return null;
  }
}

function mapTenantRecord(row: TenantRow): TenantRecord {
  return {
    ...row,
    settings: parseJsonRecord(row.settings),
  };
}

function mapAuditLogRecord(row: AuditLogRow): AuditLogRecord {
  return {
    ...row,
    metadata: parseJsonRecord(row.metadata),
  };
}

/** Auth context - extracted from Supabase auth */
export interface AuthContext {
  userId: string;
  tenantId: string;
  role: "owner" | "admin" | "member" | "guest";
  email: string;
}

/** Platform service context */
export interface PlatformServiceContext {
  auth: AuthContext;
  db: SupabaseClient;
}

export function createPlatformServiceContext(
  db: SupabaseClient,
  auth: AuthContext,
): PlatformServiceContext {
  return { db, auth };
}

/** ============================================================================
 * Tenant Service
 * ============================================================================ */

/** Tenant service for tenant management operations */
export class TenantService {
  constructor(private ctx: PlatformServiceContext) {}

  /** Get current tenant */
  async getCurrent(): Promise<ServiceResult<TenantRecord>> {
    const { data, error } = await this.ctx.db
      .from("tenants")
      .select("*")
      .eq("id", this.ctx.auth.tenantId)
      .single();

    if (error) {
      return { success: false, error: error.message, code: "TENANT_GET_FAILED" };
    }

    if (!data) {
      return { success: false, error: "Tenant not found", code: "TENANT_NOT_FOUND" };
    }

    return { success: true, data: mapTenantRecord(data as TenantRow) };
  }

  /** Update tenant settings */
  async update(settings: Record<string, unknown>): Promise<ServiceResult<TenantRecord>> {
    const { data, error } = await this.ctx.db
      .from("tenants")
      .update({ settings: JSON.stringify(settings) })
      .eq("id", this.ctx.auth.tenantId)
      .select()
      .single();

    if (error) {
      return { success: false, error: error.message, code: "TENANT_UPDATE_FAILED" };
    }

    if (!data) {
      return { success: false, error: "Tenant not found", code: "TENANT_NOT_FOUND" };
    }

    return { success: true, data: mapTenantRecord(data as TenantRow) };
  }

  /** Check if tenant is active */
  async isActive(): Promise<ServiceResult<boolean>> {
    const tenantResult = await this.getCurrent();

    if (!tenantResult.success) {
      return tenantResult;
    }

    return {
      success: true,
      data: tenantResult.data.status === "active",
    };
  }
}

/** ============================================================================
 * Profile Service
 * ============================================================================ */

/** Profile service for user profile operations */
export class ProfileService {
  constructor(private ctx: PlatformServiceContext) {}

  /** Get current user profile */
  async getCurrent(): Promise<ServiceResult<ProfileRecord>> {
    const { data, error } = await this.ctx.db
      .from("profiles")
      .select("*")
      .eq("id", this.ctx.auth.userId)
      .single();

    if (error) {
      return { success: false, error: error.message, code: "PROFILE_GET_FAILED" };
    }

    if (!data) {
      return { success: false, error: "Profile not found", code: "PROFILE_NOT_FOUND" };
    }

    return { success: true, data: data as ProfileRecord };
  }

  /** Get profile by ID */
  async getById(userId: string): Promise<ServiceResult<ProfileRecord | null>> {
    const { data, error } = await this.ctx.db
      .from("profiles")
      .select("*")
      .eq("id", userId)
      .single();

    if (error && error.code !== "PGRST116") {
      return { success: false, error: error.message, code: "PROFILE_GET_BY_ID_FAILED" };
    }

    return { success: true, data: (data ?? null) as ProfileRecord | null };
  }

  /** Get all profiles in tenant */
  async listInTenant(limit = 50, offset = 0): Promise<ServiceResult<ProfileRecord[]>> {
    const { data, error } = await this.ctx.db
      .from("profiles")
      .select("*")
      .eq("tenant_id", this.ctx.auth.tenantId)
      .range(offset, offset + limit - 1);

    if (error) {
      return { success: false, error: error.message, code: "PROFILE_LIST_FAILED" };
    }

    return { success: true, data: (data ?? []) as ProfileRecord[] };
  }

  /** Update own profile */
  async updateSelf(updates: {
    name?: string;
    avatarUrl?: string;
  }): Promise<ServiceResult<ProfileRecord>> {
    const { data, error } = await this.ctx.db
      .from("profiles")
      .update({
        name: updates.name,
        avatar_url: updates.avatarUrl,
        updated_at: new Date(),
      })
      .eq("id", this.ctx.auth.userId)
      .select()
      .single();

    if (error) {
      return { success: false, error: error.message, code: "PROFILE_UPDATE_FAILED" };
    }

    if (!data) {
      return { success: false, error: "Profile not found", code: "PROFILE_NOT_FOUND" };
    }

    return { success: true, data: data as ProfileRecord };
  }
}

/** ============================================================================
 * Audit Service
 * ============================================================================ */

/** Audit service for logging operations */
export class AuditService {
  constructor(private ctx: PlatformServiceContext) {}

  /** Log an action */
  async log(
    action: string,
    resource: string,
    resourceId?: string,
    metadata?: Record<string, unknown>,
  ): Promise<ServiceResult<null>> {
    const entry: NewAuditLogEntry = {
      tenantId: this.ctx.auth.tenantId,
      userId: this.ctx.auth.userId,
      action: action as NewAuditLogEntry["action"],
      resource,
      resourceId: resourceId ?? null,
      metadata: metadata ? JSON.stringify(metadata) : null,
      ipAddress: null,
      userAgent: null,
    };

    const { error } = await this.ctx.db.from("audit_log").insert(entry);

    if (error) {
      return { success: false, error: error.message, code: "AUDIT_LOG_FAILED" };
    }

    return { success: true, data: null };
  }

  /** Get audit log for tenant */
  async query(filters: {
    userId?: string;
    action?: string;
    resource?: string;
    limit?: number;
  }): Promise<ServiceResult<AuditLogRecord[]>> {
    let query = this.ctx.db
      .from("audit_log")
      .select("*")
      .eq("tenant_id", this.ctx.auth.tenantId)
      .order("created_at", { ascending: false })
      .limit(filters.limit ?? 50);

    if (filters.userId) {
      query = query.eq("user_id", filters.userId);
    }
    if (filters.action) {
      query = query.eq("action", filters.action);
    }
    if (filters.resource) {
      query = query.eq("resource", filters.resource);
    }

    const { data, error } = await query;

    if (error) {
      return { success: false, error: error.message, code: "AUDIT_QUERY_FAILED" };
    }

    return {
      success: true,
      data: ((data ?? []) as AuditLogRow[]).map(mapAuditLogRecord),
    };
  }
}

/** ============================================================================
 * Role Service
 * ============================================================================ */

/** Role service for role management */
export class RoleService {
  constructor(private ctx: PlatformServiceContext) {}

  /** Check if user has required role */
  hasRole(requiredRole: "owner" | "admin" | "member" | "guest"): boolean {
    const roleHierarchy = { owner: 4, admin: 3, member: 2, guest: 1 };
    return roleHierarchy[this.ctx.auth.role] >= roleHierarchy[requiredRole];
  }

  /** Require a specific role or throw */
  requireRole(requiredRole: "owner" | "admin" | "member" | "guest"): ServiceResult<null> {
    if (!this.hasRole(requiredRole)) {
      return { success: false, error: `Required role: ${requiredRole}`, code: "INSUFFICIENT_ROLE" };
    }

    return { success: true, data: null };
  }

  /** Get user's role in tenant */
  async getUserRole(userId: string): Promise<ServiceResult<UserRoleRecord | null>> {
    const { data, error } = await this.ctx.db
      .from("user_roles")
      .select("*")
      .eq("user_id", userId)
      .eq("tenant_id", this.ctx.auth.tenantId)
      .single();

    if (error && error.code !== "PGRST116") {
      return { success: false, error: error.message, code: "USER_ROLE_GET_FAILED" };
    }

    return { success: true, data: (data ?? null) as UserRoleRecord | null };
  }

  /** Update user role (admin only) */
  async updateUserRole(
    userId: string,
    role: "owner" | "admin" | "member" | "guest",
  ): Promise<ServiceResult<ProfileRecord>> {
    const roleRequirement = this.requireRole("admin");

    if (!roleRequirement.success) {
      return roleRequirement;
    }

    const { data, error } = await this.ctx.db
      .from("profiles")
      .update({ role, updated_at: new Date() })
      .eq("id", userId)
      .eq("tenant_id", this.ctx.auth.tenantId)
      .select()
      .single();

    if (error) {
      return { success: false, error: error.message, code: "USER_ROLE_UPDATE_FAILED" };
    }

    if (!data) {
      return { success: false, error: "Profile not found", code: "PROFILE_NOT_FOUND" };
    }

    return { success: true, data: data as ProfileRecord };
  }
}
