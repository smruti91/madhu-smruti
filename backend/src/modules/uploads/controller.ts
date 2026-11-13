import type { Request, Response } from "express";
import { signUpload, uploadImage, type UploadResult } from "./service";
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
 * POST /api/uploads/sign
 * Generates short-lived client-side upload authorization parameters.
 */
export function signUploadHandler(_req: Request, res: Response): void {
  sendSuccess(res, signUpload(), "Upload authorization generated");
}
