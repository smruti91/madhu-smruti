import { v2 as cloudinary } from "cloudinary";
import { env } from "../config/env";

export interface UploadResult {
  imageUrl: string;
  cloudinaryPublicId: string;
  bytes: number;
  format: string;
}

const CLOUDINARY_FOLDER = "madhu-smruti/submissions";

/**
 * Upload an image buffer to Cloudinary.
 * Returns URL + public id; binaries are never persisted in the database.
 */
export async function uploadImage(
  buffer: Buffer,
  originalName: string
): Promise<UploadResult> {
  if (!env.CLOUDINARY_CLOUD_NAME || !env.CLOUDINARY_API_KEY || !env.CLOUDINARY_API_SECRET) {
    throw Object.assign(
      new Error(
        "Image uploads are unavailable - Cloudinary credentials are not configured"
      ),
      { status: 503 }
    );
  }

  return new Promise<UploadResult>((resolve, reject) => {
    const stream = cloudinary.uploader.upload_stream(
      {
        folder: CLOUDINARY_FOLDER,
        resource_type: "image",
        public_id: undefined, // let Cloudinary generate a unique id
        use_filename: false,
        unique_filename: true,
      },
      (error, result) => {
        if (error || !result) {
          reject(
            Object.assign(
              new Error(
                `Cloudinary upload failed: ${error?.message ?? "unknown error"} (${originalName})`
              ),
              { status: 502 }
            )
          );
          return;
        }

        resolve({
          imageUrl: result.secure_url,
          cloudinaryPublicId: result.public_id,
          bytes: result.bytes,
          format: result.format,
        });
      }
    );

    stream.end(buffer);
  });
}
