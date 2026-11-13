import type { NextFunction, Request, Response } from "express";
import type { ZodTypeAny } from "zod";
import { HttpError } from "../utils/errors";

declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace Express {
    interface Request {
      /** Parsed and transformed query data attached by validateQuery(). */
      validatedQuery?: unknown;
    }
  }
}

/**
 * Zod validation middleware for the request body.
 * Parsed (and transformed) data replaces req.body.
 */
export function validateBody(schema: ZodTypeAny) {
  return (req: Request, _res: Response, next: NextFunction): void => {
    const result = schema.safeParse(req.body);

    if (!result.success) {
      next(
        HttpError.badRequest("Validation failed", result.error.flatten().fieldErrors)
      );
      return;
    }

    req.body = result.data;
    next();
  };
}

/**
 * Zod validation middleware for the query string.
 *
 * Express 5 exposes req.query as a getter, so the validated result is
 * attached as req.validatedQuery instead of replacing req.query.
 */
export function validateQuery(schema: ZodTypeAny) {
  return (req: Request, _res: Response, next: NextFunction): void => {
    const result = schema.safeParse(req.query);

    if (!result.success) {
      next(
        HttpError.badRequest("Invalid query parameters", result.error.flatten().fieldErrors)
      );
      return;
    }

    req.validatedQuery = result.data;
    next();
  };
}
