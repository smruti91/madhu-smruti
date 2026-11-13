import { sql } from "drizzle-orm";
import { env } from "../../config/env";
import { getDb } from "../../config/db";

export interface HealthStatus {
  status: "ok";
  service: string;
  version: string;
  environment: string;
  database: "connected" | "not_configured" | "error";
  imagekit: "configured" | "not_configured";
  uptimeSeconds: number;
  timestamp: string;
}

/**
 * Health check with a real database round-trip.
 */
export async function getHealthStatus(): Promise<HealthStatus> {
  let database: HealthStatus["database"] = "not_configured";

  if (env.DATABASE_URL) {
    try {
      const db = getDb();
      await db.execute(sql`select 1`);
      database = "connected";
    } catch {
      database = "error";
    }
  }

  return {
    status: "ok",
    service: "madhu-smruti-api",
    version: "0.1.0",
    environment: env.NODE_ENV,
    database,
    imagekit: env.IMAGEKIT_PRIVATE_KEY ? "configured" : "not_configured",
    uptimeSeconds: Math.round(process.uptime()),
    timestamp: new Date().toISOString(),
  };
}
