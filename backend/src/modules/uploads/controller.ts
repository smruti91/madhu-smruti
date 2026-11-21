import type { Request, Response } from "express";
import { env } from "../../config/env";
import {
  deleteImageIfUnreferenced,
  signUpload,
  uploadContributorPhoto,
  uploadImage,
  type UploadResult,
} from "./service";
import { sendSuccess } from "../../utils/apiResponse";

export interface UploadedImage {
  imageUrl: string;
  imagekitFileId: string;
  bytes: number;
  format: string;
}

/**
 * POST /api/uploads/image
 * Server-side upload (multipart/form-data, field: "image") to ImageKit.
 */
export async function uploadImageHandler(req: Request, res: Response): Promise<void> {
  if (!req.file) {
    res.status(400).json({ success: false, message: "No image file provided" });
    return;
  }

  const { buffer, originalname } = req.file;
  const uploaded: UploadResult = await uploadImage(buffer, originalname);

  sendSuccess(res, uploaded satisfies UploadedImage, "Image uploaded successfully", 201);
}

/**
 * POST /api/uploads/contributor-photo
 * Uploads an optional contributor photograph to its own ImageKit folder.
 */
export async function uploadContributorPhotoHandler(
  req: Request,
  res: Response
): Promise<void> {
  if (!req.file) {
    res.status(400).json({ success: false, message: "No photo file provided" });
    return;
  }

  const uploaded = await uploadContributorPhoto(req.file.buffer, req.file.originalname);
  sendSuccess(res, uploaded satisfies UploadedImage, "Contributor photo uploaded", 201);
}

/**
 * DELETE /api/uploads/image/:fileId
 * Removes an unreferenced contributor photo from ImageKit.
 */
export async function deleteImageHandler(req: Request, res: Response): Promise<void> {
  const fileId = Array.isArray(req.params.fileId)
    ? req.params.fileId[0]
    : req.params.fileId;
  const contributorId =
    typeof req.query.contributorId === "string" ? req.query.contributorId : undefined;
  await deleteImageIfUnreferenced(fileId, contributorId);
  sendSuccess(res, null, "Image deleted successfully");
}

/**
 * POST /api/uploads/sign
 * Generates short-lived client-side upload authorization parameters.
 */
export function signUploadHandler(_req: Request, res: Response): void {
  sendSuccess(res, signUpload(), "Upload authorization generated");
}

/**
 * GET /api/uploads/limits
 * Public configuration so the UI can enforce and display the same limits the
 * server validates (max size, max image count, allowed formats).
 */
export function uploadLimitsHandler(_req: Request, res: Response): void {
  sendSuccess(res, {
    maxFileSizeBytes: env.MAX_IMAGE_BYTES,
    maxPaintingImages: env.MAX_PAINTING_IMAGES,
    allowedMimeTypes: ["image/jpeg", "image/png", "image/webp"],
  });
}
