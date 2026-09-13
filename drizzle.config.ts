import { defineConfig } from "drizzle-kit";
import { loadLocalEnvironment } from "./scripts/load-local-env";

loadLocalEnvironment();

if (!process.env.DATABASE_URL_UNPOOLED) {
  throw new Error("DATABASE_URL_UNPOOLED is required for database migrations");
}

export default defineConfig({
  dialect: "postgresql",
  schema: "./lib/server/database/schema.ts",
  out: "./drizzle",
  dbCredentials: {
    url: process.env.DATABASE_URL_UNPOOLED,
  },
});
