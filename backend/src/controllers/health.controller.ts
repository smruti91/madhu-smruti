import type { Request, Response } from "express";
import { getHealthStatus } from "../services/health.service";
import { sendSuccess } from "../utils/apiResponse";

/**
 * GET /api/v1/health
 */
export function getHealth(_req: Request, res: Response): void {
  sendSuccess(res, getHealthStatus());
}
