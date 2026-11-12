import { neon } from "@neondatabase/serverless";
import { drizzle, type NeonHttpDatabase } from "drizzle-orm/neon-http";
import { env } from "./env";
import * as schema from "../db/schema";

/**
 * Drizzle ORM client connected to Neon PostgreSQL over HTTP.
 * Created lazily: stays `null` until DATABASE_URL is provided so the API
 * can boot (and health checks still work) before the database is provisioned.
 */
let db: NeonHttpDatabase<typeof schema> | null = null;

if (env.DATABASE_URL) {
  db = drizzle(neon(env.DATABASE_URL), { schema });
} else {
   
  console.warn("⚠️  DATABASE_URL is not set - database features are disabled");
}

export { db };

/**
 * Returns the Drizzle client or throws a clear error when the database
 * has not been configured yet.
 */
export function getDb(): NeonHttpDatabase<typeof schema> {
  if (!db) {
    throw new Error("Database is not configured - set DATABASE_URL in backend/.env");
  }
  return db;
}
