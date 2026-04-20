// @enterprise/contracts - Generic DTOs, types, and Zod schemas
// Reusable across any enterprise application built on this platform

// Types
export * from "./types/platform";

// Schemas
export {
  uuidSchema,
  timestampSchema,
  entitySchema,
  softDeletableSchema,
  userRoleSchema,
  platformUserSchema,
  authSessionSchema,
  registrationMetadataSchema,
  invitationMetadataSchema,
  tenantStatusSchema,
  tenantSchema,
  auditActionSchema,
  auditEntrySchema,
  pageInfoSchema,
  paginatedSchema,
  actionErrorSchema,
  actionResultSchema,
  emailField,
  nameField,
  slugField,
  paginationParamsSchema,
} from "./schemas/platform";

export type {
  Tenant,
  TenantStatus,
  PaginationParams,
  RegistrationMetadata,
  InvitationMetadata,
} from "./schemas/platform";

// DTOs
export * from "./dto/platform";

// Re-export Zod for convenience
export { z } from "zod";
