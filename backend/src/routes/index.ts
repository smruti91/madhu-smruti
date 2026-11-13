import { Router } from "express";
import contributorsRoutes from "../modules/contributors/routes";
import submissionsRoutes from "../modules/submissions/routes";
import uploadsRoutes from "../modules/uploads/routes";
import adminRoutes from "../modules/admin/routes";
import healthRoutes from "../modules/health/routes";

const router = Router();

router.use("/health", healthRoutes);
router.use("/contributors", contributorsRoutes);
router.use("/submissions", submissionsRoutes);
router.use("/uploads", uploadsRoutes);
router.use("/admin", adminRoutes);

export default router;
