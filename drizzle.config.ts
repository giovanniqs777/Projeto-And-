import { defineConfig } from "drizzle-kit";

export default defineConfig({
  out: "./drizzle",
  schema: "./db/schema.ts",
  dialect: "postgresql",
  dbCredentials: {
    // DDL/migrations use the direct (session-mode) connection; the pooled
    // DATABASE_URL (pgbouncer, transaction mode) is used by the app at runtime.
    url: process.env.DIRECT_URL || process.env.DATABASE_URL!,
  },
});
