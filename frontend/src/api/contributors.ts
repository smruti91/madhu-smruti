import { apiClient } from "./client";
import type { ApiSuccess } from "../types/api";
import type { ContributorInput, ContributorRegistered } from "../types/submission";

/**
 * Contributors API module.
 */
export async function registerContributor(
  input: ContributorInput
): Promise<ContributorRegistered> {
  const response = await apiClient.post<ApiSuccess<ContributorRegistered>>(
    "/contributors",
    input
  );
  return response.data.data;
}
