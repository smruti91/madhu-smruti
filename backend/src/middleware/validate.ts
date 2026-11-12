import type { NextFunction, Request, Response } from "express";
import type { ZodTypeAny } from "zod";

interface ValidatedRequest {
  body?: unknown;
  query?: unknown;
  params?: unknown;
}

/**
 * Generic Zod validation middleware.
 *
 * Usage:
 *   router.post("/", validate(createMemorySchema), controller.create);
 *
 * The schema should be shaped like: z.object({ body: ..., query: ..., params: ... })
 * (each part optional).
 */
export function validate(schema: ZodTypeAny) {
  return (req: Request, res: Response, next: NextFunction): void => {
    const candidate: ValidatedRequest = {
      body: req.body,
      query: req.query,
      params: req.params,
    };

    const result = schema.safeParse(candidate);

    if (!result.success) {
      res.status(400).json({
        success: false,
        message: "Validation failed",
        errors: result.error.flatten().fieldErrors,
      });
      return;
    }

    next();
  };
}
