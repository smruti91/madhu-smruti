import type { Request, Response } from "express";
import { sendSuccess } from "../utils/apiResponse";
import { uploadImage, type UploadResult } from "../services/upload.service";

export interface UploadedImage {
  imageUrl: string;
  cloudinaryPublicId: string;
  bytes: number;
  format: string;
}

/**
 * POST /api/v1/uploads/image
 * Uploads an image buffer to Cloudinary and returns its URL + public id.
 * Image binary data is never stored in PostgreSQL.
 */
export async function uploadImageHandler(
  req: Request,
  res: Response
): Promise<void> {
  if (!req.file) {
    res.status(400).json({ success: false, message: "No image file provided" });
    return;
  }

  const { buffer, originalname } = req.file;
  const uploaded: UploadResult = await uploadImage(buffer, originalname);

  sendSuccess(res, uploaded satisfies UploadedImage, "Image uploaded successfully", 201);
}
