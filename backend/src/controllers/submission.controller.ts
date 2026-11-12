import type { Request, Response } from "express";
import { createSubmission, type CreateSubmissionInput } from "../services/submission.service";
import { sendSuccess } from "../utils/apiResponse";

/**
 * POST /api/v1/submissions
 * Creates a submission (writeup or painting) with contributor details.
 */
export async function createSubmissionHandler(
  req: Request,
  res: Response
): Promise<void> {
  const result = await createSubmission(req.body as CreateSubmissionInput);
  sendSuccess(res, result, "Submission created successfully", 201);
}
