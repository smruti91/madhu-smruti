import type { NextFunction, Request, Response } from "express";
import type { submissions } from "../../db/schema";
import { assertEditCredential, getSubmissionOrThrow } from "./service";

type SubmissionRow = typeof submissions.$inferSelect;

declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace Express {
    interface Request {
      submission?: SubmissionRow;
    }
  }
}

/** Express 5 types allow string[] params; route params here are always single. */
function idParam(value: string | string[]): string {
  return Array.isArray(value) ? value[0] : value;
}

/**
 * Loads the submission for :id and enforces private edit-token access.
 * A valid phone number alone is never sufficient.
 */
export async function requireEditAccess(
  req: Request,
  _res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const submission = await getSubmissionOrThrow(idParam(req.params.id));
    assertEditCredential(submission, {
      headers: req.headers,
      query: req.query as Record<string, unknown>,
    });
    req.submission = submission;
    next();
  } catch (err) {
    next(err);
  }
}
