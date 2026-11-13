import { toFile } from "@imagekit/nodejs";
import { getImageKit } from "../config/imagekit";

export interface UploadResult {
  imageUrl: string;
  imagekitFileId: string;
  bytes: number;
  format: string;
}

const IMAGEKIT_FOLDER = "madhu-smruti/submissions";

/**
 * Upload an image buffer to ImageKit.
 * Returns URL + fileId; binaries are never persisted in the database.
 */
export async function uploadImage(
  buffer: Buffer,
  originalName: string
): Promise<UploadResult> {
  const imagekit = getImageKit();

  const file = await toFile(buffer, originalName);

  let result;
  try {
    result = await imagekit.files.upload({
      file,
      fileName: originalName,
      folder: IMAGEKIT_FOLDER,
      useUniqueFileName: true,
    });
  } catch (err) {
    throw Object.assign(
      new Error(
        `ImageKit upload failed: ${err instanceof Error ? err.message : "unknown error"} (${originalName})`
      ),
      { status: 502 }
    );
  }

  if (!result?.url || !result.fileId) {
    throw Object.assign(new Error("ImageKit upload returned an unexpected response"), {
      status: 502,
    });
  }

  return {
    imageUrl: result.url,
    imagekitFileId: result.fileId,
    bytes: buffer.byteLength,
    format: originalName.split(".").pop()?.toLowerCase() ?? "unknown",
  };
}
