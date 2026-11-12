import type { Response } from "express";

/**
 * Standard JSON response helpers so every endpoint returns a consistent shape:
 *   { success: boolean, message?: string, data?: T }
 */
export function sendSuccess<T>(res: Response, data: T, message?: string, status = 200): void {
  res.status(status).json({
    success: true,
    ...(message !== undefined ? { message } : {}),
    data,
  });
}

export function sendError(res: Response, message: string, status = 400): void {
  res.status(status).json({
    success: false,
    message,
  });
}
