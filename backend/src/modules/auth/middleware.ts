import type { NextFunction, Request, Response } from "express";
import { env } from "../../config/env";
import {
  AdminSessionPayload,
  csrfTokensMatch,
  verifyAdminSession,
} from "./service";
import { HttpError } from "../../utils/errors";

declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace Express {
    interface Request {
      admin?: AdminSessionPayload;
    }
  }
}

/**
 * Verifies the HTTP-only admin session cookie.
 */
export function requireAdmin(req: Request, _res: Response, next: NextFunction): void {
  const token = req.cookies?.["admin_session"];

  if (!token) {
    next(HttpError.unauthorized("Admin authentication required"));
    return;
  }

  const admin = verifyAdminSession(token);

  if (!admin) {
    next(HttpError.unauthorized("Admin session is invalid or expired"));
    return;
  }

  req.admin = admin;
  next();
}

/**
 * Double-submit CSRF check for state-changing admin requests.
 * The session cookie is HTTP-only; the CSRF cookie is readable by the client
 * and must be echoed back in the X-CSRF-Token header.
 */
export function csrfProtection(req: Request, _res: Response, next: NextFunction): void {
  const cookieToken = req.cookies?.["admin_csrf"];
  const headerValue = req.headers["x-csrf-token"];
  const headerToken = Array.isArray(headerValue) ? headerValue[0] : headerValue;

  if (!cookieToken) {
    next(HttpError.forbidden("CSRF token missing - log in again"));
    return;
  }

  if (!csrfTokensMatch(headerToken, cookieToken)) {
    next(HttpError.forbidden("CSRF token mismatch"));
    return;
  }

  next();
}

/**
 * Cookie options shared by login/logout.
 */
export function adminCookieOptions() {
  return {
    httpOnly: true,
    secure: env.NODE_ENV === "production",
    sameSite: "strict" as const,
    path: "/",
    maxAge: 8 * 60 * 60 * 1000,
  };
}
