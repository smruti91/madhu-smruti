import crypto from "crypto";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { env } from "../../config/env";
import { HttpError } from "../../utils/errors";

/**
 * Authentication & token utilities.
 *
 * - Admin sessions: short-lived JWTs stored in HTTP-only cookies.
 * - Submission edit tokens: 256-bit random tokens; only SHA-256 hashes are stored.
 * - Edit sessions: short-lived JWTs issued by /resume for secure editing.
 * - CSRF: double-submit cookie pattern for cookie-based admin auth.
 */

const DEV_FALLBACK_SECRET = "madhu-smruti-dev-only-insecure-jwt-secret-change-me";

function getAuthSecret(): string {
  if (env.ADMIN_JWT_SECRET) return env.ADMIN_JWT_SECRET;

  if (env.NODE_ENV === "production") {
    throw HttpError.serviceUnavailable(
      "Authentication is unavailable - ADMIN_JWT_SECRET is not configured"
    );
  }

  return DEV_FALLBACK_SECRET;
}

// ---------------------------------------------------------------------------
// Password hashing
// ---------------------------------------------------------------------------

export function hashPassword(plain: string): Promise<string> {
  return bcrypt.hash(plain, 12);
}

export function verifyPassword(plain: string, hash: string): Promise<boolean> {
  return bcrypt.compare(plain, hash);
}

// ---------------------------------------------------------------------------
// Submission edit tokens (private access credentials)
// ---------------------------------------------------------------------------

/** Generates a 256-bit URL-safe token. The raw token is shown exactly once. */
export function generateEditToken(): string {
  return crypto.randomBytes(32).toString("base64url");
}

/** SHA-256 hex digest - the only form of an edit token ever persisted. */
export function hashEditToken(token: string): string {
  return crypto.createHash("sha256").update(token).digest("hex");
}

/** Timing-safe comparison of a raw token against a stored hash. */
export function matchesEditTokenHash(token: string, storedHash: string): boolean {
  const candidate = Buffer.from(hashEditToken(token), "hex");
  const stored = Buffer.from(storedHash, "hex");
  return candidate.length === stored.length && crypto.timingSafeEqual(candidate, stored);
}

// ---------------------------------------------------------------------------
// Edit sessions (short-lived, issued by POST /submissions/:id/resume)
// ---------------------------------------------------------------------------

export interface EditSessionPayload {
  sub: string; // submission id
  purpose: "edit";
}

const EDIT_SESSION_TTL_SECONDS = 15 * 60;

export function signEditSession(submissionId: string): string {
  return jwt.sign(
    { sub: submissionId, purpose: "edit" } satisfies EditSessionPayload,
    getAuthSecret(),
    {
      expiresIn: EDIT_SESSION_TTL_SECONDS,
    }
  );
}

export function verifyEditSession(token: string): string | null {
  try {
    const payload = jwt.verify(token, getAuthSecret()) as EditSessionPayload;
    return payload.purpose === "edit" && typeof payload.sub === "string" ? payload.sub : null;
  } catch {
    return null;
  }
}

/** Heuristic: JWTs are the only tokens we issue that contain dots. */
export function looksLikeJwt(token: string): boolean {
  return token.split(".").length === 3;
}

// ---------------------------------------------------------------------------
// Admin sessions (HTTP-only cookies)
// ---------------------------------------------------------------------------

export interface AdminSessionPayload {
  sub: string;
  email: string;
  name: string;
}

const ADMIN_SESSION_TTL_SECONDS = 8 * 60 * 60;

export function signAdminSession(admin: AdminSessionPayload): string {
  return jwt.sign(
    { email: admin.email, name: admin.name } satisfies Pick<
      AdminSessionPayload,
      "email" | "name"
    >,
    getAuthSecret(),
    {
      subject: admin.sub,
      expiresIn: ADMIN_SESSION_TTL_SECONDS,
    }
  );
}

export function verifyAdminSession(token: string): AdminSessionPayload | null {
  try {
    const payload = jwt.verify(token, getAuthSecret()) as jwt.JwtPayload;
    if (!payload.sub) return null;
    return {
      sub: payload.sub,
      email: typeof payload.email === "string" ? payload.email : "",
      name: typeof payload.name === "string" ? payload.name : "Admin",
    };
  } catch {
    return null;
  }
}

// ---------------------------------------------------------------------------
// CSRF (double-submit cookie pattern)
// ---------------------------------------------------------------------------

export function generateCsrfToken(): string {
  return crypto.randomBytes(32).toString("hex");
}

export function csrfTokensMatch(headerToken: string | undefined, cookieToken: unknown): boolean {
  if (typeof headerToken !== "string" || typeof cookieToken !== "string") return false;
  const a = Buffer.from(headerToken);
  const b = Buffer.from(cookieToken);
  return a.length === b.length && crypto.timingSafeEqual(a, b);
}

// ---------------------------------------------------------------------------
// ImageKit client-side upload authorization (POST /uploads/sign)
// ---------------------------------------------------------------------------

export interface ImageKitAuthParams {
  token: string;
  expire: number;
  signature: string;
}

export function generateImageKitAuthParams(privateKey: string): ImageKitAuthParams {
  const token = crypto.randomBytes(16).toString("hex");
  const expire = Math.floor(Date.now() / 1000) + 60;
  const signature = crypto
    .createHash("sha1")
    .update(`${token}${expire}${privateKey}`)
    .digest("hex");
  return { token, expire, signature };
}
