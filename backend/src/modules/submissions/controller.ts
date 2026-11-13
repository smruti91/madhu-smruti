import type { Request, Response } from "express";
import {
  buildSubmissionDetail,
  createSubmission,
  finalizeSubmission,
  resumeEditingSession,
  updateSubmission,
} from "./service";
import { getContributorById } from "../contributors/service";
import { HttpError } from "../../utils/errors";
import { sendSuccess } from "../../utils/apiResponse";
import type { submissions } from "../../db/schema";

type SubmissionRow = typeof submissions.$inferSelect;

/**
 * requireEditAccess guarantees req.submission; this guard satisfies the
 * type checker and provides a defensive 401 for any other path.
 */
function authorizedSubmission(req: Request): SubmissionRow {
  if (!req.submission) {
    throw HttpError.unauthorized("Private edit token required");
  }
  return req.submission;
}

/**
 * POST /api/submissions
 * Creates a draft submission. The response contains the raw private edit
 * token exactly once - it is the only credential for later access.
 */
export async function createSubmissionHandler(req: Request, res: Response): Promise<void> {
  const result = await createSubmission(req.body);

  sendSuccess(
    res,
    result,
    "Draft submission created. Store the editToken securely - it cannot be recovered.",
    201
  );
}

/**
 * GET /api/submissions/:id  (requires private edit token)
 */
export async function getSubmissionHandler(req: Request, res: Response): Promise<void> {
  const submission = authorizedSubmission(req);
  const contributor = await getContributorById(submission.contributorId);

  if (!contributor) {
    throw HttpError.notFound("Submission not found");
  }

  const detail = await buildSubmissionDetail(submission, contributor);
  sendSuccess(res, detail);
}

/**
 * PUT /api/submissions/:id  (requires private edit token; drafts only)
 */
export async function updateSubmissionHandler(req: Request, res: Response): Promise<void> {
  const detail = await updateSubmission(authorizedSubmission(req), req.body);
  sendSuccess(res, detail, "Draft updated successfully");
}

/**
 * POST /api/submissions/:id/finalize  (requires private edit token; drafts only)
 */
export async function finalizeSubmissionHandler(req: Request, res: Response): Promise<void> {
  const detail = await finalizeSubmission(authorizedSubmission(req));
  sendSuccess(res, detail, "Submission finalized successfully");
}

/**
 * POST /api/submissions/:id/resume  (requires private edit token)
 * Issues a short-lived edit session token.
 */
export async function resumeEditingHandler(req: Request, res: Response): Promise<void> {
  const result = await resumeEditingSession(authorizedSubmission(req));
  sendSuccess(res, result, "Editing session issued");
}
