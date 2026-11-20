import { Router } from "express";
import {
  createSubmissionHandler,
  finalizeSubmissionHandler,
  getSubmissionHandler,
  getTrackedSubmissionHandler,
  resumeEditingHandler,
  searchSubmissionsHandler,
  updateSubmissionHandler,
} from "./controller";
import { requireEditAccess } from "./middleware";
import { validateBody } from "../../middleware/validate";
import { editLimiter, publicLimiter } from "../../middleware/rateLimit";
import { createSubmissionSchema, updateSubmissionSchema } from "./validator";

const router = Router();

// POST /api/submissions - create draft (edit token returned once)
router.post("/", validateBody(createSubmissionSchema), createSubmissionHandler);

// GET /api/submissions/search - public search by phone number
router.get("/search", publicLimiter, searchSubmissionsHandler);

// GET /api/submissions/track/:id - public read-only view by phone number
router.get("/track/:id", publicLimiter, getTrackedSubmissionHandler);

// GET /api/submissions/:id - private access with edit token only
router.get("/:id", editLimiter, requireEditAccess, getSubmissionHandler);

// PUT /api/submissions/:id - update authorized draft
router.put(
  "/:id",
  editLimiter,
  requireEditAccess,
  validateBody(updateSubmissionSchema),
  updateSubmissionHandler
);

// POST /api/submissions/:id/finalize - draft -> submitted (transactional)
router.post("/:id/finalize", editLimiter, requireEditAccess, finalizeSubmissionHandler);

// POST /api/submissions/:id/resume - verify token, issue short-lived session
router.post("/:id/resume", editLimiter, requireEditAccess, resumeEditingHandler);

export default router;
