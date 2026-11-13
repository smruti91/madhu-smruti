import { env } from "../../config/env";
import { HttpError } from "../../utils/errors";
import { generateImageKitAuthParams } from "../auth/service";
import { getImageKit } from "../../config/imagekit";

export interface UploadResult {
  imageUrl: string;
  imagekitFileId: string;
  bytes: number;
  format: string;
}

const IMAGEKIT_FOLDER = "madhu-smruti/submissions";

/**
 * Server-side upload of an image buffer to ImageKit.
 * Returns URL + fileId; binaries are never persisted in the database.
 */
export async function uploadImage(buffer: Buffer, originalName: string): Promise<UploadResult> {
  const imagekit = getImageKit();

  const file = await import("@imagekit/nodejs").then((mod) => mod.toFile(buffer, originalName));

  let result;
  try {
    result = await imagekit.files.upload({
      file,
      fileName: originalName,
      folder: IMAGEKIT_FOLDER,
      useUniqueFileName: true,
    });
  } catch (err) {
    throw HttpError.badGateway(
      `ImageKit upload failed: ${err instanceof Error ? err.message : "unknown error"} (${originalName})`
    );
  }

  if (!result?.url || !result.fileId) {
    throw HttpError.badGateway("ImageKit upload returned an unexpected response");
  }

  return {
    imageUrl: result.url,
    imagekitFileId: result.fileId,
    bytes: buffer.byteLength,
    format: originalName.split(".").pop()?.toLowerCase() ?? "unknown",
  };
}

export interface SignUploadResult {
  token: string;
  expire: number;
  signature: string;
  publicKey: string | null;
  urlEndpoint: string | null;
  folder: string;
}

/**
 * Client-side upload authorization (ImageKit equivalent of a signed upload).
 * The signature = SHA1(token + expire + privateKey) is valid for 60 seconds
 * and scoped to this single upload token.
 */
export function signUpload(): SignUploadResult {
  if (!env.IMAGEKIT_PRIVATE_KEY) {
    throw HttpError.serviceUnavailable(
      "Image uploads are unavailable - IMAGEKIT_PRIVATE_KEY is not configured"
    );
  }

  const params = generateImageKitAuthParams(env.IMAGEKIT_PRIVATE_KEY);

  return {
    ...params,
    publicKey: env.IMAGEKIT_PUBLIC_KEY ?? null,
    urlEndpoint: env.IMAGEKIT_URL_ENDPOINT ?? null,
    folder: IMAGEKIT_FOLDER,
  };
}
