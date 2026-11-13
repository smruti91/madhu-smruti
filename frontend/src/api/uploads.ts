import { apiClient } from "./client";
import type { ApiSuccess } from "../types/api";
import type { UploadedImage } from "../types/submission";

/**
 * Image upload API module (multipart/form-data -> ImageKit).
 */
export async function uploadImage(file: File): Promise<UploadedImage> {
  const formData = new FormData();
  formData.append("image", file);

  const response = await apiClient.post<ApiSuccess<UploadedImage>>(
    "/uploads/image",
    formData,
    { headers: { "Content-Type": "multipart/form-data" } }
  );
  return response.data.data;
}
