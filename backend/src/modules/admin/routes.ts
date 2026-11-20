import { Router } from "express";
import {
  dashboardHandler,
  downloadImageHandler,
  exportHandler,
  getSubmissionHandler,
  listSubmissionsHandler,
  loginHandler,
  logoutHandler,
  meHandler,
  updateStatusHandler,
} from "./controller";
import { csrfProtection, requireAdmin } from "../auth/middleware";
import { authLimiter } from "../../middleware/rateLimit";
import { validateBody, validateQuery } from "../../middleware/validate";
import {
  adminExportQuerySchema,
  adminListQuerySchema,
  adminLoginSchema,
  adminStatusSchema,
} from "./validator";

const router = Router();

// POST /api/admin/login - rate-limited credential check, sets HTTP-only cookie
router.post("/login", authLimiter, validateBody(adminLoginSchema), loginHandler);

// GET /api/admin/me - session check for the dashboard route guard
router.get("/me", requireAdmin, meHandler);

// POST /api/admin/logout
router.post("/logout", requireAdmin, csrfProtection, logoutHandler);

// GET /api/admin/dashboard
router.get("/dashboard", requireAdmin, dashboardHandler);

// GET /api/admin/submissions - paginated, filterable (server-side pagination)
router.get(
  "/submissions",
  requireAdmin,
  validateQuery(adminListQuerySchema),
  listSubmissionsHandler
);

// GET /api/admin/submissions/:id/images/:imageId/download - original image
router.get(
  "/submissions/:id/images/:imageId/download",
  requireAdmin,
  downloadImageHandler
);

// GET /api/admin/submissions/:id
router.get("/submissions/:id", requireAdmin, getSubmissionHandler);

// PATCH /api/admin/submissions/:id/status - approve/reject/review/reopen
router.patch(
  "/submissions/:id/status",
  requireAdmin,
  csrfProtection,
  validateBody(adminStatusSchema),
  updateStatusHandler
);

// GET /api/admin/export - CSV download with the active filters
router.get("/export", requireAdmin, validateQuery(adminExportQuerySchema), exportHandler);

export default router;
