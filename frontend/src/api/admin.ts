import { apiClient } from "./client";
import type { ApiSuccess } from "../types/api";

export interface AdminProfile {
  id: string;
  name: string;
  email: string;
}

/**
 * Admin authentication. On success the server sets an HTTP-only session
 * cookie plus a CSRF cookie (to echo as X-CSRF-Token on mutations).
 */
export async function adminLogin(email: string, password: string): Promise<AdminProfile> {
  const response = await apiClient.post<ApiSuccess<{ admin: AdminProfile }>>(
    "/admin/login",
    { email, password }
  );
  return response.data.data.admin;
}

export async function adminLogout(): Promise<void> {
  await apiClient.post("/admin/logout");
}
