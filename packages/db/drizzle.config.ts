import { defineConfig } from "drizzle-kit";

const { DATABASE_URL } = process.env;

export default defineConfig({
  schema: "./src/schema/*.ts",
  out: "../../supabase/migrations",
  dialect: "postgresql",
  dbCredentials: {
    // Fallback must match supabase/config.toml → [db].port
    url: DATABASE_URL ?? "postgresql://postgres:postgres@127.0.0.1:55332/postgres",
  },
  strict: true,
  verbose: true,
});
