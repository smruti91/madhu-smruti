import rateLimit from "express-rate-limit";

const message = {
  success: false,
  message: "Too many requests from this address, please try again later",
};

/**
 * Global limiter - generous ceiling for all traffic.
 */
export const globalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 600,
  standardHeaders: "draft-7",
  legacyHeaders: false,
  message,
});

/**
 * Strict limiter for credential-based endpoints (admin login).
 */
export const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 30,
  standardHeaders: "draft-7",
  legacyHeaders: false,
  message: {
    success: false,
    message: "Too many login attempts, please try again later",
  },
});

/**
 * Limiter for token-guarded private submission access (GET/PUT/finalize/resume).
 * Prevents brute-forcing of edit tokens.
 */
export const editLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 120,
  standardHeaders: "draft-7",
  legacyHeaders: false,
  message,
});

/**
 * Limiter for public endpoints (phone search).
 */
export const publicLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 60,
  standardHeaders: "draft-7",
  legacyHeaders: false,
  message,
});

/**
 * Strict limiter for the token-entry verification endpoint. Tokens are
 * 256-bit, but this still caps online guessing attempts per address.
 */
export const tokenVerifyLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 30,
  standardHeaders: "draft-7",
  legacyHeaders: false,
  message: {
    success: false,
    message: "Too many token attempts, please try again later",
  },
});
