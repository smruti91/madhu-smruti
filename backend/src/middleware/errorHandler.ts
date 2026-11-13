import type { NextFunction, Request, Response } from "express";
import { HttpError } from "../utils/errors";

/**
 * Express error handling middleware. Must be registered last.
 */
export function notFoundHandler(req: Request, res: Response): void {
  res.status(404).json({
    success: false,
    message: `Route not found: ${req.method} ${req.originalUrl}`,
  });
}

function resolveStatus(err: Error): number {
  const maybeStatus = (err as unknown as { status?: unknown }).status;
  if (typeof maybeStatus === "number" && maybeStatus >= 400 && maybeStatus < 600) {
    return maybeStatus;
  }

  // Body-parser errors
  const type = (err as unknown as { type?: string }).type;
  if (type === "entity.parse.failed") return 400;
  if (type === "entity.too.large") return 413;

  // Multer file-size errors
  const code = (err as unknown as { code?: string }).code;
  if (code === "LIMIT_FILE_SIZE") return 413;

  return 500;
}

export function errorHandler(err: Error, _req: Request, res: Response, _next: NextFunction): void {
  if (!(err instanceof HttpError)) {
     
    console.error("❌ Unhandled error:", err);
  }

  const status = resolveStatus(err);

  let message = err.message || "Internal server error";
  if (status >= 500 && process.env.NODE_ENV === "production") {
    message = "Internal server error";
  }
  if (status === 413) message = "Payload too large";
  if ((err as unknown as { code?: string }).code === "LIMIT_FILE_SIZE") {
    message = "Image must be 5 MB or smaller";
  }

  const details = (err as unknown as { details?: unknown }).details;

  res.status(status).json({
    success: false,
    message,
    ...(status < 500 && details !== undefined ? { details } : {}),
  });
}
