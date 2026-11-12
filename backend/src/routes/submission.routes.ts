import { Router } from "express";
import { createSubmissionHandler } from "../controllers/submission.controller";
import { validate } from "../middleware/validate";
import { createSubmissionSchema } from "../validators/submission.validator";

const router = Router();

// POST /api/v1/submissions
router.post("/", validate(createSubmissionSchema), createSubmissionHandler);

export default router;
