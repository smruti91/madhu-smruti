import { apiClient } from "./client";
import type { ApiSuccess } from "../types/api";
import type {
  CreateSubmissionPayload,
  SubmissionCreated,
  SubmissionDetail,
  UpdateSubmissionPayload,
} from "../types/submission";

/**
 * Submissions API module. Private access uses the raw edit token via the
 * X-Edit-Token header or the ?token= query parameter.
 */

export async function createSubmission(
  payload: CreateSubmissionPayload
): Promise<SubmissionCreated> {
  const response = await apiClient.post<
    ApiSuccess<{ submission: Omit<SubmissionCreated, "editToken">; editToken: string }>
  >("/submissions", payload);
  // Wire format is { submission, editToken } - flatten for the app types.
  return { ...response.data.data.submission, editToken: response.data.data.editToken };
}

export async function getSubmission(
  submissionId: string,
  editToken: string
): Promise<SubmissionDetail> {
  const response = await apiClient.get<ApiSuccess<SubmissionDetail>>(
    `/submissions/${submissionId}`,
    { headers: { "X-Edit-Token": editToken } }
  );
  return response.data.data;
}

export async function updateSubmission(
  submissionId: string,
  editToken: string,
  payload: UpdateSubmissionPayload
): Promise<SubmissionDetail> {
  const response = await apiClient.put<ApiSuccess<SubmissionDetail>>(
    `/submissions/${submissionId}`,
    payload,
    { headers: { "X-Edit-Token": editToken } }
  );
  return response.data.data;
}
