// @enterprise/contracts - Generic DTOs, types, and Zod schemas
// Reusable across any enterprise application built on this platform

// Re-export Zod for convenience
export { z } from "zod";
// DTOs
export * from "./dto/platform";
export * from "./dto/resources";
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
// Resources domain — schemas, DTOs, and types
export * from "./schemas/resources";
// Types
export * from "./types/platform";
export * from "./types/resources";
