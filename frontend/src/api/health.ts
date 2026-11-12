import { apiClient } from "./client";
import type { ApiSuccess, HealthStatus } from "../types/api";

/**
 * Health-check API module.
 */
export async function fetchHealthStatus(): Promise<HealthStatus> {
  const response = await apiClient.get<ApiSuccess<HealthStatus>>("/health");
  return response.data.data;
}
