// @enterprise/contracts - Generic DTOs, types, and Zod schemas
// Reusable across any enterprise application built on this platform

// Re-export Zod for convenience
export { z } from "zod";
// DTOs
export * from "./dto/platform";

export type {
  InvitationMetadata,
  PaginationParams,
  RegistrationMetadata,
  Tenant,
  TenantStatus,
} from "./schemas/platform";
// Schemas
export {
  actionErrorSchema,
  actionResultSchema,
  auditActionSchema,
  auditEntrySchema,
  authSessionSchema,
  emailField,
  entitySchema,
  invitationMetadataSchema,
  nameField,
  pageInfoSchema,
  paginatedSchema,
  paginationParamsSchema,
  platformUserSchema,
  registrationMetadataSchema,
  slugField,
  softDeletableSchema,
  tenantSchema,
  tenantStatusSchema,
  timestampSchema,
  userRoleSchema,
  uuidSchema,
} from "./schemas/platform";
// Types
export * from "./types/platform";
