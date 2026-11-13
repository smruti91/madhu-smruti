import express from "express";
import cors from "cors";
import helmet from "helmet";
import cookieParser from "cookie-parser";
import { env } from "./config/env";
import "./config/db";
import "./config/imagekit";
import apiRoutes from "./routes";
import { globalLimiter } from "./middleware/rateLimit";
import { errorHandler, notFoundHandler } from "./middleware/errorHandler";

const app = express();

// Trust one proxy layer (Render/Vercel) so rate limiting sees real client IPs
app.set("trust proxy", 1);

// Security headers
app.use(helmet());

// Core middleware
app.use(
  cors({
    origin: env.CORS_ORIGIN.split(",").map((origin) => origin.trim()),
    credentials: true,
  })
);
app.use(express.json({ limit: "2mb" }));
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());
app.use(globalLimiter);

// Root info endpoint
app.get("/", (_req, res) => {
  res.json({
    name: "MADHU SMRUTI API",
    odia: "ମଧୁ ସ୍ମୃତି",
    organization: "MDRAFM",
    version: "0.1.0",
    docs: "/api/health",
  });
});

// All API routes are mounted at both /api (canonical, as specified)
// and /api/v1 (backwards compatible with the frontend client).
app.use("/api/v1", apiRoutes);
app.use("/api", apiRoutes);

// 404 + error handling (must be registered last)
app.use(notFoundHandler);
app.use(errorHandler);

export default app;
