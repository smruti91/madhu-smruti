import { Router } from "express";
import { createContributorHandler } from "./controller";
import { validateBody } from "../../middleware/validate";
import { createContributorSchema } from "./validator";

const router = Router();

// POST /api/contributors
router.post("/", validateBody(createContributorSchema), createContributorHandler);

export default router;
