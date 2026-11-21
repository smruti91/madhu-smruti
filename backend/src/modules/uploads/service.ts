import { randomUUID } from "crypto";
import { eq } from "drizzle-orm";
import { env } from "../../config/env";
import { getDb } from "../../config/db";
import { contributors, submissionImages } from "../../db/schema";
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
const CONTRIBUTOR_PHOTO_FOLDER = "madhu-smruti/contributors";

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

/**
 * Uploads an optional contributor photograph into its own ImageKit folder.
 * A random filename is generated so files can never overwrite each other.
 */
export async function uploadContributorPhoto(
  buffer: Buffer,
  originalName: string
): Promise<UploadResult> {
  const imagekit = getImageKit();
  const file = await import("@imagekit/nodejs").then((mod) => mod.toFile(buffer, originalName));
  const extension = originalName.split(".").pop()?.toLowerCase().replace(/[^a-z0-9]/g, "") || "jpg";
  const fileName = `contributor-${randomUUID()}.${extension}`;

  let result;
  try {
    result = await imagekit.files.upload({
      file,
      fileName,
      folder: CONTRIBUTOR_PHOTO_FOLDER,
      useUniqueFileName: true,
    });
  } catch (err) {
    throw HttpError.badGateway(
      `Contributor photo upload failed: ${err instanceof Error ? err.message : "unknown error"}`
    );
  }

  if (!result?.url || !result.fileId) {
    throw HttpError.badGateway("ImageKit upload returned an unexpected response");
  }

  return {
    imageUrl: result.url,
    imagekitFileId: result.fileId,
    bytes: buffer.byteLength,
    format: extension,
  };
}

/**
 * Deletes an ImageKit file only when it is a contributor photo in our folder
 * and no database record still references it. This prevents orphan cleanup
 * from removing images owned by other submissions or contributors.
 */
export async function deleteImageIfUnreferenced(
  fileId: string,
  contributorId?: string
): Promise<void> {
  if (!fileId || fileId.length > 255) {
    throw HttpError.badRequest("A valid file id is required");
  }

  const db = getDb();

  const owners = await db
    .select({ id: contributors.id })
    .from(contributors)
    .where(eq(contributors.photoFileId, fileId));

  if (owners.length > 0) {
    // The owning contributor may replace or remove their own photo. The
    // reference is cleared here so the file can then be deleted safely.
    if (
      owners.length !== 1 ||
      !contributorId ||
      owners[0].id !== contributorId
    ) {
      throw HttpError.conflict("This image is still in use and cannot be deleted");
    }
    await db
      .update(contributors)
      .set({ photoUrl: null, photoFileId: null })
      .where(eq(contributors.id, contributorId));
  }

  const [submissionOwner] = await db
    .select({ id: submissionImages.id })
    .from(submissionImages)
    .where(eq(submissionImages.imagekitFileId, fileId))
    .limit(1);
  if (submissionOwner) {
    throw HttpError.conflict("This image is still in use and cannot be deleted");
  }

  const imagekit = getImageKit();
  let metadata;
  try {
    metadata = await imagekit.files.get(fileId);
  } catch {
    throw HttpError.notFound("Image not found in ImageKit");
  }

  if (!metadata?.filePath?.startsWith(`/${CONTRIBUTOR_PHOTO_FOLDER}/`)) {
    throw HttpError.forbidden("This image is not a contributor photo");
  }

  try {
    await imagekit.files.delete(fileId);
  } catch (err) {
    throw HttpError.badGateway(
      `Could not delete image: ${err instanceof Error ? err.message : "unknown error"}`
    );
  }
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
