import { Router } from "express";
import multer from "multer";
import { uploadImageHandler } from "../controllers/upload.controller";

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

// POST /api/v1/uploads/image  (multipart/form-data, field name: "image")
// Images are held in memory only long enough to stream them to ImageKit
router.post("/image", imageUpload.single("image"), uploadImageHandler);

export default router;
