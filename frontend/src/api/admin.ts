import { apiClient } from "./client";
import type { ApiSuccess } from "../types/api";
import type {
  AdminListParams,
  AdminListResponse,
  AdminProfile,
  AdminStatusPayload,
  AdminSubmissionDetail,
  DashboardStats,
} from "../types/admin";

export type { AdminProfile } from "../types/admin";

/**
 * Admin API client.
 *
 * Authentication uses an HTTP-only JWT cookie. State-changing requests must
 * echo the readable `admin_csrf` cookie in the `X-CSRF-Token` header
 * (double-submit CSRF protection).
 */

export function getCsrfToken(): string {
  if (typeof document === "undefined") return "";
  const cookie = document.cookie
    .split(";")
    .map((part) => part.trim())
    .find((part) => part.startsWith("admin_csrf="));
  return cookie ? decodeURIComponent(cookie.slice("admin_csrf=".length)) : "";
}

const csrfConfig = () => ({
  headers: { "X-CSRF-Token": getCsrfToken(), "Content-Type": "application/json" },
});

export async function adminLogin(email: string, password: string): Promise<AdminProfile> {
  const response = await apiClient.post<ApiSuccess<{ admin: AdminProfile }>>(
    "/admin/login",
    { email, password }
  );
  return response.data.data.admin;
}

/** Session check used to guard the dashboard and restore identity on reload. */
export async function adminMe(): Promise<AdminProfile> {
  const response = await apiClient.get<ApiSuccess<{ admin: AdminProfile }>>("/admin/me");
  return response.data.data.admin;
}

export async function adminLogout(): Promise<void> {
  await apiClient.post("/admin/logout", {}, csrfConfig());
}

export async function getDashboardStats(): Promise<DashboardStats> {
  const response = await apiClient.get<ApiSuccess<DashboardStats>>("/admin/dashboard");
  return response.data.data;
}

/** Server-side paginated list - the browser only ever holds one page. */
export async function listAdminSubmissions(
  params: AdminListParams
): Promise<AdminListResponse> {
  const response = await apiClient.get<ApiSuccess<AdminListResponse>>(
    "/admin/submissions",
    { params }
  );
  return response.data.data;
}

export async function getAdminSubmission(
  submissionId: string
): Promise<AdminSubmissionDetail> {
  const response = await apiClient.get<ApiSuccess<AdminSubmissionDetail>>(
    `/admin/submissions/${submissionId}`
  );
  return response.data.data;
}

export async function updateAdminSubmissionStatus(
  submissionId: string,
  payload: AdminStatusPayload
): Promise<AdminSubmissionDetail> {
  const response = await apiClient.patch<ApiSuccess<AdminSubmissionDetail>>(
    `/admin/submissions/${submissionId}/status`,
    payload,
    csrfConfig()
  );
  return response.data.data;
}

/** Downloads a painting image as an attachment via the authenticated proxy. */
export async function downloadSubmissionImage(
  submissionId: string,
  imageId: string,
  filename?: string
): Promise<void> {
  const response = await apiClient.get<Blob>(
    `/admin/submissions/${submissionId}/images/${imageId}/download`,
    { responseType: "blob" }
  );
  triggerBlobDownload(response.data, filename ?? `image-${imageId}`);
}

/** Exports the submissions matching the current filters as CSV. */
export async function exportSubmissionsCsv(
  params: Partial<AdminListParams> = {}
): Promise<void> {
  const { page: _page, limit: _limit, ...filters } = params;
  const response = await apiClient.get<Blob>("/admin/export", {
    params: filters,
    responseType: "blob",
  });
  triggerBlobDownload(response.data, `madhu-smruti-submissions-${dateStamp()}.csv`);
}

function dateStamp(): string {
  return new Date().toISOString().slice(0, 10);
}

function triggerBlobDownload(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = filename;
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  URL.revokeObjectURL(url);
}
