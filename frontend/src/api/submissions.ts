import { apiClient } from "./client";
import type { ApiSuccess } from "../types/api";
import type {
  CreateSubmissionPayload,
  SearchSubmissionsResponse,
  SubmissionCreated,
  SubmissionDetail,
  SubmissionSearchResult,
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

/** Converts a draft into a final, review-ready submission. */
export async function finalizeSubmission(
  submissionId: string,
  editToken: string
): Promise<SubmissionDetail> {
  const response = await apiClient.post<ApiSuccess<SubmissionDetail>>(
    `/submissions/${submissionId}/finalize`,
    {},
    { headers: { "X-Edit-Token": editToken } }
  );
  return response.data.data;
}

/** Public search by phone number - no authentication required. */
export async function searchSubmissionsByPhone(
  phone: string
): Promise<SubmissionSearchResult[]> {
  const response = await apiClient.get<ApiSuccess<SearchSubmissionsResponse>>(
    "/submissions/search",
    { params: { phone } }
  );
  return response.data.data.submissions;
}

/**
 * Verifies a pasted Draft Access Token on the cross-device edit screen.
 * Returns only the submission id/summary - the raw token is not echoed back.
 */
export async function verifyDraftToken(
  token: string
): Promise<{ submissionId: string; submission: SubmissionDetail }> {
  const response = await apiClient.post<
    ApiSuccess<{ submissionId: string; submission: SubmissionDetail }>
  >("/submissions/verify-token", { token });
  return response.data.data;
}

/** Public read-only article view - no token needed, view only. */
export async function getTrackedSubmission(
  submissionId: string,
  phone: string
): Promise<SubmissionDetail> {
  const response = await apiClient.get<ApiSuccess<SubmissionDetail>>(
    `/submissions/track/${submissionId}`,
    { params: { phone } }
  );
  return response.data.data;
}
