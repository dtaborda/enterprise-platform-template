-- Migration 0: Extensions
-- Must run BEFORE schema migration so gen_random_uuid() is available.

CREATE EXTENSION IF NOT EXISTS "uuid-ossp" SCHEMA "extensions";
CREATE EXTENSION IF NOT EXISTS "pgcrypto" SCHEMA "extensions";
