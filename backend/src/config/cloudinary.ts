import { v2 as cloudinary } from "cloudinary";
import { env } from "./env";

/**
 * Cloudinary client for image storage.
 * Configuration is applied when credentials are present; upload features
 * will be implemented later.
 */
if (env.CLOUDINARY_CLOUD_NAME && env.CLOUDINARY_API_KEY && env.CLOUDINARY_API_SECRET) {
  cloudinary.config({
    cloud_name: env.CLOUDINARY_CLOUD_NAME,
    api_key: env.CLOUDINARY_API_KEY,
    api_secret: env.CLOUDINARY_API_SECRET,
  });
} else {
   
  console.warn("⚠️  Cloudinary credentials are not set - image features are disabled");
}

export { cloudinary };
