import { Router } from "express";
import healthRoutes from "./health.routes";

const router = Router();

router.use("/health", healthRoutes);

// Future feature modules will be mounted here, e.g.:
// router.use("/memories", memoryRoutes);
// router.use("/gallery", galleryRoutes);

export default router;
