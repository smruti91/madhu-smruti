import { Router } from "express";
import multer from "multer";
import { env } from "../../config/env";
import {
  deleteImageHandler,
  signUploadHandler,
  uploadContributorPhotoHandler,
  uploadImageHandler,
  uploadLimitsHandler,
} from "./controller";
import { editLimiter } from "../../middleware/rateLimit";

const router = Router();

const ALLOWED_MIME_TYPES = ["image/jpeg", "image/jpg", "image/png", "image/webp"];

// Images are held in memory only long enough to stream them to ImageKit
const imageUpload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: env.MAX_IMAGE_BYTES },
  fileFilter: (_req, file, cb) => {
    if (ALLOWED_MIME_TYPES.includes(file.mimetype)) {
      cb(null, true);
      return;
    }
    cb(new Error("Only JPEG, PNG or WebP images are allowed"));
  },
});

// Contributor photos use the same limits with a dedicated field name.
const photoUpload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: env.MAX_IMAGE_BYTES },
  fileFilter: (_req, file, cb) => {
    if (ALLOWED_MIME_TYPES.includes(file.mimetype)) {
      cb(null, true);
      return;
    }
    cb(new Error("Only JPEG, JPG, PNG or WebP images are allowed"));
  },
});

// GET /api/uploads/limits - public upload configuration
router.get("/limits", uploadLimitsHandler);

// POST /api/uploads/image (multipart/form-data, field name: "image")
router.post("/image", imageUpload.single("image"), uploadImageHandler);

// POST /api/uploads/contributor-photo (multipart/form-data, field: "photo")
router.post(
  "/contributor-photo",
  editLimiter,
  photoUpload.single("photo"),
  uploadContributorPhotoHandler
);

// DELETE /api/uploads/image/:fileId - remove an unreferenced contributor photo
router.delete("/image/:fileId", editLimiter, deleteImageHandler);

// POST /api/uploads/sign - client-side upload authorization
router.post("/sign", editLimiter, signUploadHandler);

export default router;
