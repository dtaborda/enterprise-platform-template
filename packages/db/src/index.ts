// @enterprise/db - Platform schema with RLS policies
// Reusable across any enterprise application built on this platform

export type { PgTable } from "drizzle-orm/pg-core";
// Re-export drizzle utilities
export { drizzle } from "drizzle-orm/postgres-js";
// Re-export new types explicitly for consumers
export type { NewTenantInvitation, TenantInvitation } from "./schema/platform.js";
export * from "./schema/platform.js";
export * from "./schema/resources.js";
