import express from "express";
import cors from "cors";
import { env } from "./config/env";
import "./config/db";
import "./config/imagekit";
import apiRoutes from "./routes";
import { requestLogger } from "./middleware/requestLogger";
import { errorHandler, notFoundHandler } from "./middleware/errorHandler";

const app = express();

// Core middleware
app.use(
  cors({
    origin: env.CORS_ORIGIN.split(",").map((origin) => origin.trim()),
  })
);
app.use(express.json({ limit: "2mb" }));
app.use(express.urlencoded({ extended: true }));

if (env.NODE_ENV === "development") {
  app.use(requestLogger);
}

// Root info endpoint
app.get("/", (_req, res) => {
  res.json({
    name: "MADHU SMRUTI API",
    odia: "ମଧୁ ସ୍ମୃତି",
    organization: "MDRAFM",
    version: "0.1.0",
    docs: "/api/v1/health",
  });
});

// All API routes live under /api/v1
app.use("/api/v1", apiRoutes);

// 404 + error handling (must be registered last)
app.use(notFoundHandler);
app.use(errorHandler);

export default app;
