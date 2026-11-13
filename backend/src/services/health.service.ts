import { env } from "../config/env";

export interface HealthStatus {
  status: "ok";
  service: string;
  version: string;
  environment: string;
  database: "configured" | "not_configured";
  imagekit: "configured" | "not_configured";
  uptimeSeconds: number;
  timestamp: string;
}

/**
 * Health check business logic.
 */
export function getHealthStatus(): HealthStatus {
  return {
    status: "ok",
    service: "madhu-smruti-api",
    version: "0.1.0",
    environment: env.NODE_ENV,
    database: env.DATABASE_URL ? "configured" : "not_configured",
    imagekit: env.IMAGEKIT_PRIVATE_KEY ? "configured" : "not_configured",
    uptimeSeconds: Math.round(process.uptime()),
    timestamp: new Date().toISOString(),
  };
}
