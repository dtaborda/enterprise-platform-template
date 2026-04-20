// @enterprise/db - Platform schema with RLS policies
// Reusable across any enterprise application built on this platform

export * from "./schema/platform.js";

// Re-export drizzle utilities
export { drizzle } from "drizzle-orm/postgres-js";
export type { PgDriver, PgTable } from "drizzle-orm/pg-core";
export type { PgTransaction } from "drizzle-orm/pg-core/transaction";
