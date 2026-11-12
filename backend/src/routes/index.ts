import { Router } from "express";
import healthRoutes from "./health.routes";
import submissionRoutes from "./submission.routes";
import uploadRoutes from "./upload.routes";

const router = Router();

router.use("/health", healthRoutes);
router.use("/submissions", submissionRoutes);
router.use("/uploads", uploadRoutes);

// Future feature modules will be mounted here, e.g.:
// router.use("/memories", memoryRoutes);
// router.use("/gallery", galleryRoutes);

export default router;
