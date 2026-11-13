import { Router } from "express";
import { getHealthStatus } from "./service";
import { sendSuccess } from "../../utils/apiResponse";

const router = Router();

// GET /api/health
router.get("/", async (_req, res) => {
  sendSuccess(res, await getHealthStatus());
});

export default router;
