import ImageKit from "@imagekit/nodejs";
import { env } from "./env";

/**
 * ImageKit client for image storage.
 * Images are uploaded server-side and only the returned URL and fileId
 * are ever persisted in PostgreSQL.
 */
let client: ImageKit | null = null;

if (env.IMAGEKIT_PRIVATE_KEY) {
  client = new ImageKit({
    privateKey: env.IMAGEKIT_PRIVATE_KEY,
  });
} else {
  console.warn("⚠️  IMAGEKIT_PRIVATE_KEY is not set - image features are disabled");
}

/**
 * Returns the ImageKit client or throws a clear error when not configured.
 */
export function getImageKit(): ImageKit {
  if (!client) {
    throw Object.assign(
      new Error("Image uploads are unavailable - IMAGEKIT_PRIVATE_KEY is not configured"),
      { status: 503 }
    );
  }
  return client;
}

export { client as imageKitClient };
