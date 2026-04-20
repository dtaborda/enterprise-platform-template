// Platform-level types - generic for any enterprise app

// ============================================================================
// Core Entity Types
// ============================================================================

/** UUID-based entity */
export interface Entity {
  id: string;
  createdAt: Date;
  updatedAt: Date;
}

/** Soft-deletable entity */
export interface SoftDeletable extends Entity {
  deletedAt: Date | null;
}

// ============================================================================
// Tenant Types
// ============================================================================

/** Multi-tenant isolation - tenant ID carried through the system */
export interface TenantScoped {
  tenantId: string;
}

/** Tenant-agnostic (platform-level) entities */
export type TenantAgnostic = never;

// ============================================================================
// User & Auth Types
// ============================================================================

/** User roles in the platform */
export const USER_ROLE = {
  OWNER: "owner",
  ADMIN: "admin",
  MEMBER: "member",
  GUEST: "guest",
} as const;

export type UserRole = (typeof USER_ROLE)[keyof typeof USER_ROLE];

/** Platform user with roles */
export interface PlatformUser extends Entity {
  email: string;
  name: string | null;
  avatarUrl: string | null;
  role: UserRole;
  tenantId: string;
}

/** Auth session */
export interface AuthSession {
  userId: string;
  tenantId: string;
  role: UserRole;
  expiresAt: Date;
}

// ============================================================================
// Audit Types
// ============================================================================

/** Audit action types */
export const AUDIT_ACTION = {
  CREATE: "create",
  READ: "read",
  UPDATE: "update",
  DELETE: "delete",
  LOGIN: "login",
  LOGOUT: "logout",
  CUSTOM: "custom",
} as const;

export type AuditAction = (typeof AUDIT_ACTION)[keyof typeof AUDIT_ACTION];

/** Audit entry */
export interface AuditEntry extends Entity {
  tenantId: string;
  userId: string;
  action: AuditAction;
  resource: string;
  resourceId: string | null;
  metadata: Record<string, unknown> | null;
  ipAddress: string | null;
  userAgent: string | null;
}

// ============================================================================
// API Response Types
// ============================================================================

/** Generic action result for Server Actions */
export interface ActionResult<T = unknown> {
  success: boolean;
  data?: T;
  error?: ActionError;
}

export interface ActionError {
  code: string;
  message: string;
  details?: Record<string, unknown>;
}

/** Pagination */
export interface PageInfo {
  hasNextPage: boolean;
  hasPreviousPage: boolean;
  startCursor: string | null;
  endCursor: string | null;
}

export interface PaginatedResult<T> {
  items: T[];
  pageInfo: PageInfo;
}

// ============================================================================
// Error Codes
// ============================================================================

/** Platform-specific error codes */
export const ERROR_CODES = {
  // Auth errors (4xx)
  UNAUTHORIZED: "UNAUTHORIZED",
  FORBIDDEN: "FORBIDDEN",
  INVALID_CREDENTIALS: "INVALID_CREDENTIALS",
  SESSION_EXPIRED: "SESSION_EXPIRED",

  // Tenant errors
  TENANT_NOT_FOUND: "TENANT_NOT_FOUND",
  TENANT_INACTIVE: "TENANT_INACTIVE",
  TENANT_ACCESS_DENIED: "TENANT_ACCESS_DENIED",

  // Validation errors (4xx)
  VALIDATION_ERROR: "VALIDATION_ERROR",
  NOT_FOUND: "NOT_FOUND",
  CONFLICT: "CONFLICT",

  // Server errors (5xx)
  INTERNAL_ERROR: "INTERNAL_ERROR",
  SERVICE_UNAVAILABLE: "SERVICE_UNAVAILABLE",
} as const;

export type ErrorCode = (typeof ERROR_CODES)[keyof typeof ERROR_CODES];
