import { attachDatabasePool } from "@vercel/functions";
import { drizzle, type NodePgDatabase } from "drizzle-orm/node-postgres";
import { Pool } from "pg";
import * as schema from "./schema";

export type CatalogDatabase = NodePgDatabase<typeof schema>;

const globalDatabase = globalThis as typeof globalThis & {
  stillpointPool?: Pool;
  stillpointDatabase?: CatalogDatabase;
};

function databaseUrl(): string {
  const value = process.env.DATABASE_URL;
  if (!value) throw new Error("DATABASE_URL is required for the hosted catalog");
  return value;
}

function createPool(): Pool {
  const pool = new Pool({
    connectionString: databaseUrl(),
    max: 5,
    connectionTimeoutMillis: 10_000,
    idleTimeoutMillis: 10_000,
  });
  if (process.env.VERCEL) attachDatabasePool(pool);
  return pool;
}

export function getCatalogDatabase(): CatalogDatabase {
  globalDatabase.stillpointPool ??= createPool();
  globalDatabase.stillpointDatabase ??= drizzle(globalDatabase.stillpointPool, { schema });
  return globalDatabase.stillpointDatabase;
}
