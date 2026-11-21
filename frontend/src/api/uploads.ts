import { apiClient } from "./client";
import type { ApiSuccess } from "../types/api";
import type { UploadedImage, UploadLimits } from "../types/submission";

/**
 * Image upload API module (multipart/form-data -> ImageKit).
 *
 * Uploads are authorized and performed server-side: the browser streams the
 * file to our API, which signs the request with the ImageKit private key and
 * forwards it. The raw key never reaches the client.
 */

export async function uploadImage(
  file: File,
  onProgress?: (percent: number) => void
): Promise<UploadedImage> {
  const formData = new FormData();
  formData.append("image", file);

  const response = await apiClient.post<ApiSuccess<UploadedImage>>(
    "/uploads/image",
    formData,
    {
      headers: { "Content-Type": "multipart/form-data" },
      onUploadProgress: (event) => {
        if (!onProgress) return;
        const total = event.total ?? file.size;
        if (total > 0) {
          onProgress(Math.min(100, Math.round((event.loaded / total) * 100)));
        }
      },
    }
  );
  return response.data.data;
}

/** Uploads an optional contributor photograph to ImageKit. */
export async function uploadContributorPhoto(
  file: File,
  onProgress?: (percent: number) => void
): Promise<UploadedImage> {
  const formData = new FormData();
  formData.append("photo", file);

  const response = await apiClient.post<ApiSuccess<UploadedImage>>(
    "/uploads/contributor-photo",
    formData,
    {
      headers: { "Content-Type": "multipart/form-data" },
      onUploadProgress: (event) => {
        if (!onProgress) return;
        const total = event.total ?? file.size;
        if (total > 0) {
          onProgress(Math.min(100, Math.round((event.loaded / total) * 100)));
        }
      },
    }
  );
  return response.data.data;
}

/** Deletes an unreferenced ImageKit file by its file id. */
export async function deleteImage(
  fileId: string,
  contributorId?: string | null
): Promise<void> {
  await apiClient.delete(`/uploads/image/${encodeURIComponent(fileId)}`, {
    params: contributorId ? { contributorId } : undefined,
  });
}

/** Server-configured upload limits (max bytes, max images, allowed types). */
export async function getUploadLimits(): Promise<UploadLimits> {
  const response = await apiClient.get<ApiSuccess<UploadLimits>>("/uploads/limits");
  return response.data.data;
}