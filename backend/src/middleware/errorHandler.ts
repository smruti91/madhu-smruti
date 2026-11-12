import type { NextFunction, Request, Response } from "express";

/**
 * Express error handling middleware. Must be registered last.
 */
export function notFoundHandler(req: Request, res: Response): void {
  res.status(404).json({
    success: false,
    message: `Route not found: ${req.method} ${req.originalUrl}`,
  });
}

export function errorHandler(
  err: Error,
  _req: Request,
  res: Response,
  _next: NextFunction
): void {
   
  console.error("❌ Unhandled error:", err);

  const maybeStatus = (err as unknown as { status?: unknown }).status;
  const status =
    typeof maybeStatus === "number" && maybeStatus >= 400 && maybeStatus < 600
      ? maybeStatus
      : 500;

  res.status(status).json({
    success: false,
    message:
      status >= 500 && process.env.NODE_ENV === "production"
        ? "Internal server error"
        : err.message,
  });
}
