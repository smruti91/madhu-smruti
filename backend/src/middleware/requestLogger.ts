import type { NextFunction, Request, Response } from "express";

/**
 * Minimal request logger for development.
 */
export function requestLogger(req: Request, res: Response, next: NextFunction): void {
  const start = Date.now();

  res.on("finish", () => {
    if (process.env.NODE_ENV !== "test") {
       
      console.log(`${req.method} ${req.originalUrl} ${res.statusCode} - ${Date.now() - start}ms`);
    }
  });

  next();
}
