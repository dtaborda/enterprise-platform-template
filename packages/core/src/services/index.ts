// Platform service layer - base services for multi-tenant operations
// These are meant to be extended by domain-specific services

import type { SupabaseClient } from "@supabase/supabase-js";
import {
  auditLog,
  profiles,
  tenants,
  userRoles,
  type NewAuditLogEntry,
  type NewProfile,
} from "@enterprise/db/schema/platform";

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

/** ============================================================================
 * Tenant Service
 * ============================================================================ */

/** Tenant service for tenant management operations */
export class TenantService {
  constructor(private ctx: PlatformServiceContext) {}

  /** Get current tenant */
  async getCurrent() {
    const { data, error } = await this.ctx.db
      .from("tenants")
      .select("*")
      .eq("id", this.ctx.auth.tenantId)
      .single();

    if (error) throw new Error(error.message);
    return data;
  }

  /** Update tenant settings */
  async update(settings: Record<string, unknown>) {
    const { data, error } = await this.ctx.db
      .from("tenants")
      .update({ settings: JSON.stringify(settings) })
      .eq("id", this.ctx.auth.tenantId)
      .select()
      .single();

    if (error) throw new Error(error.message);
    return data;
  }

  /** Check if tenant is active */
  async isActive(): Promise<boolean> {
    const tenant = await this.getCurrent();
    return tenant.status === "active";
  }
}

/** ============================================================================
 * Profile Service
 * ============================================================================ */

/** Profile service for user profile operations */
export class ProfileService {
  constructor(private ctx: PlatformServiceContext) {}

  /** Get current user profile */
  async getCurrent() {
    const { data, error } = await this.ctx.db
      .from("profiles")
      .select("*")
      .eq("id", this.ctx.auth.userId)
      .single();

    if (error) throw new Error(error.message);
    return data;
  }

  /** Get profile by ID */
  async getById(userId: string) {
    const { data, error } = await this.ctx.db
      .from("profiles")
      .select("*")
      .eq("id", userId)
      .single();

    if (error) return null;
    return data;
  }

  /** Get all profiles in tenant */
  async listInTenant(limit = 50, offset = 0) {
    const { data, error } = await this.ctx.db
      .from("profiles")
      .select("*")
      .eq("tenant_id", this.ctx.auth.tenantId)
      .range(offset, offset + limit - 1);

    if (error) throw new Error(error.message);
    return data ?? [];
  }

  /** Update own profile */
  async updateSelf(updates: { name?: string; avatarUrl?: string }) {
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

    if (error) throw new Error(error.message);
    return data;
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
  ) {
    const entry: NewAuditLogEntry = {
      tenant_id: this.ctx.auth.tenantId,
      user_id: this.ctx.auth.userId,
      action: action as NewAuditLogEntry["action"],
      resource,
      resource_id: resourceId ?? null,
      metadata: metadata ? JSON.stringify(metadata) : null,
      ip_address: null,
      user_agent: null,
    };

    const { error } = await this.ctx.db.from("audit_log").insert(entry);

    if (error) {
      console.error("Failed to log audit entry:", error);
      // Don't throw - audit failure shouldn't break the main operation
    }
  }

  /** Get audit log for tenant */
  async query(filters: { userId?: string; action?: string; resource?: string; limit?: number }) {
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

    if (error) throw new Error(error.message);
    return data ?? [];
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
  requireRole(requiredRole: "owner" | "admin" | "member" | "guest") {
    if (!this.hasRole(requiredRole)) {
      throw new Error(`Required role: ${requiredRole}`);
    }
  }

  /** Get user's role in tenant */
  async getUserRole(userId: string) {
    const { data, error } = await this.ctx.db
      .from("user_roles")
      .select("*")
      .eq("user_id", userId)
      .eq("tenant_id", this.ctx.auth.tenantId)
      .single();

    if (error) return null;
    return data;
  }

  /** Update user role (admin only) */
  async updateUserRole(userId: string, role: "owner" | "admin" | "member" | "guest") {
    this.requireRole("admin");

    const { data, error } = await this.ctx.db
      .from("profiles")
      .update({ role, updated_at: new Date() })
      .eq("id", userId)
      .eq("tenant_id", this.ctx.auth.tenantId)
      .select()
      .single();

    if (error) throw new Error(error.message);
    return data;
  }
}
