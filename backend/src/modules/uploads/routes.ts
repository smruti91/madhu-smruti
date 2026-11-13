import { Router } from "express";
import multer from "multer";
import { signUploadHandler, uploadImageHandler } from "./controller";
import { editLimiter } from "../../middleware/rateLimit";

const router = Router();

// Images are held in memory only long enough to stream them to ImageKit
const imageUpload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024 }, // 5 MB
  fileFilter: (_req, file, cb) => {
    const allowed = ["image/jpeg", "image/png", "image/webp"];
    if (allowed.includes(file.mimetype)) {
      cb(null, true);
      return;
    }
    cb(new Error("Only JPEG, PNG or WebP images are allowed"));
  },
});

// POST /api/uploads/image (multipart/form-data, field name: "image")
router.post("/image", imageUpload.single("image"), uploadImageHandler);

// POST /api/uploads/sign - client-side upload authorization
router.post("/sign", editLimiter, signUploadHandler);

export default router;
