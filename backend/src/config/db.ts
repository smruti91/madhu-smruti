import { Pool, neonConfig } from "@neondatabase/serverless";
import WebSocket from "ws";
import { drizzle, type NeonDatabase } from "drizzle-orm/neon-serverless";
import { env } from "./env";
import * as schema from "../db/schema";

/**
 * Drizzle ORM client over the Neon serverless (WebSocket) driver.
 *
 * Chosen over the plain TCP drivers because:
 * - It supports real SQL transactions (the neon-http driver does not), which
 *   the submission workflow needs (finalize, admin status changes).
 * - It connects over WebSocket on port 443, which works everywhere Neon's
 *   direct TCP endpoint may be unavailable.
 *
 * Created lazily: stays `null` until DATABASE_URL is provided so the API can
 * boot (and health checks still respond) before the database is provisioned.
 */
neonConfig.webSocketConstructor = WebSocket;

let db: NeonDatabase<typeof schema> | null = null;

if (env.DATABASE_URL) {
  const pool = new Pool({ connectionString: env.DATABASE_URL, max: 5 });
  db = drizzle(pool, { schema });
} else {
   
  console.warn("⚠️  DATABASE_URL is not set - database features are disabled");
}

export { db };

/**
 * Returns the Drizzle client or throws a clear error when the database
 * has not been configured yet.
 */
export function getDb(): NeonDatabase<typeof schema> {
  if (!db) {
    throw new Error("Database is not configured - set DATABASE_URL in backend/.env");
  }
  return db;
}
