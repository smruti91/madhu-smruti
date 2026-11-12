import { apiClient } from "./client";
import type { ApiSuccess } from "../types/api";
import type { CreateSubmissionPayload, SubmissionCreated } from "../types/submission";

/**
 * Submissions API module.
 */
export async function createSubmission(
  payload: CreateSubmissionPayload
): Promise<SubmissionCreated> {
  const response = await apiClient.post<ApiSuccess<SubmissionCreated>>(
    "/submissions",
    payload
  );
  return response.data.data;
}
