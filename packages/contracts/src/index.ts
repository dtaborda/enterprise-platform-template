// @enterprise/contracts - Generic DTOs, types, and Zod schemas
// Reusable across any enterprise application built on this platform

// Re-export Zod for convenience
export { z } from "zod";
export * from "./dto/billing";
export * from "./dto/notifications";
// DTOs
export * from "./dto/platform";
export * from "./dto/resources";
export * from "./dto/tenant-team";
export * from "./dto/workspace-admin";
export type {
  BrandConfig,
  BrandLegal,
  BrandLogo,
  BrandLogoVariant,
  BrandMetadata,
  BrandSocial,
} from "./schemas/brand";
// Brand system — schemas and types
export {
  brandConfigSchema,
  brandLegalSchema,
  brandLogoSchema,
  brandLogoVariantSchema,
  brandMetadataSchema,
  brandSocialSchema,
} from "./schemas/brand";
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
export type {
  ThemeConfig,
  ThemeFoundations,
  ThemeLayout,
  ThemeMetadata,
  ThemeMode,
} from "./schemas/theme";
// Theme system — schemas and types
export {
  colorsSchema,
  primitiveColorSchema,
  semanticColorSchema,
  themeFoundationsSchema,
  themeLayoutSchema,
  themeMetadataSchema,
  themeSchema,
  typographySchema,
} from "./schemas/theme";
// Types
export * from "./types/form";
export * from "./types/platform";
export * from "./types/resources";
export * from "./types/theme";
