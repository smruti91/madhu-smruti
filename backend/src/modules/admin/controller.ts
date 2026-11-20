import type { Request, Response } from "express";
import { sendSuccess } from "../../utils/apiResponse";
import { HttpError } from "../../utils/errors";
import {
  getAdminSubmissionDetail,
  getDashboardStats,
  getImageForDownload,
  listForExport,
  listSubmissionsForAdmin,
  updateSubmissionStatus,
} from "../submissions/service";
import { adminCookieOptions } from "../auth/middleware";
import { generateCsrfToken } from "../auth/service";
import { loginAdmin } from "./auth.service";
import type {
  AdminExportQuery,
  AdminStatusInput,
  AdminLoginInput,
} from "./validator";

/** Express 5 types allow string[] params; route params here are always single. */
function idParam(value: string | string[]): string {
  return Array.isArray(value) ? value[0] : value;
}

export { adminCookieOptions };

/**
 * POST /api/admin/login
 */
export async function loginHandler(req: Request, res: Response): Promise<void> {
  const input = req.body as AdminLoginInput;
  const { admin, sessionToken } = await loginAdmin(input);

  const csrfToken = generateCsrfToken();

  // Session cookie: HTTP-only (invisible to JavaScript)
  res.cookie("admin_session", sessionToken, adminCookieOptions());
  // CSRF cookie: readable by the client, must be echoed in X-CSRF-Token header
  res.cookie("admin_csrf", csrfToken, {
    ...adminCookieOptions(),
    httpOnly: false,
  });

  sendSuccess(res, { admin }, "Logged in successfully");
}

/**
 * POST /api/admin/logout
 */
export function logoutHandler(_req: Request, res: Response): void {
  res.clearCookie("admin_session", { path: "/" });
  res.clearCookie("admin_csrf", { path: "/" });
  sendSuccess(res, null, "Logged out successfully");
}

/**
 * GET /api/admin/me
 * Lightweight session check used by the dashboard to guard routes and to
 * restore the admin identity after a page reload.
 */
export function meHandler(req: Request, res: Response): void {
  sendSuccess(res, { admin: req.admin });
}

/**
 * GET /api/admin/dashboard
 */
export async function dashboardHandler(_req: Request, res: Response): Promise<void> {
  sendSuccess(res, await getDashboardStats());
}

/**
 * GET /api/admin/submissions
 */
export async function listSubmissionsHandler(
  req: Request,
  res: Response
): Promise<void> {
  sendSuccess(res, await listSubmissionsForAdmin(req.validatedQuery as never));
}

/**
 * GET /api/admin/submissions/:id
 */
export async function getSubmissionHandler(req: Request, res: Response): Promise<void> {
  sendSuccess(res, await getAdminSubmissionDetail(idParam(req.params.id)));
}

/**
 * PATCH /api/admin/submissions/:id/status
 * Approve / reject / set under review / reopen as draft (allows editing again).
 */
export async function updateStatusHandler(req: Request, res: Response): Promise<void> {
  const input = req.body as AdminStatusInput;
  const admin = req.admin!;

  const detail = await updateSubmissionStatus(
    idParam(req.params.id),
    input,
    { name: admin.name }
  );

  sendSuccess(res, detail, `Submission status updated to "${input.status}"`);
}

/**
 * GET /api/admin/submissions/:id/images/:imageId/download
 * Streams the original painting image from ImageKit as an attachment.
 */
export async function downloadImageHandler(req: Request, res: Response): Promise<void> {
  const image = await getImageForDownload(
    idParam(req.params.id),
    idParam(req.params.imageId)
  );

  let upstream: globalThis.Response;
  try {
    upstream = await fetch(image.imageUrl);
  } catch {
    throw HttpError.badGateway("Could not reach the image provider");
  }
  if (!upstream.ok || !upstream.body) {
    throw HttpError.badGateway("The original image could not be downloaded");
  }

  const contentType = upstream.headers.get("content-type") || "application/octet-stream";
  const ext = contentType.includes("png")
    ? "png"
    : contentType.includes("webp")
      ? "webp"
      : contentType.includes("jpeg") || contentType.includes("jpg")
        ? "jpg"
        : "img";
  const baseName = (image.imagekitFileId || image.id).replace(/[^a-zA-Z0-9_-]/g, "").slice(0, 60);

  res.setHeader("Content-Type", contentType);
  res.setHeader("Content-Disposition", `attachment; filename="${baseName}.${ext}"`);
  res.setHeader("Cache-Control", "private, no-store");
  res.send(Buffer.from(await upstream.arrayBuffer()));
}

/**
 * GET /api/admin/export
 * CSV export of submissions with contributor details, honoring the same
 * filters as the list endpoint.
 */
export async function exportHandler(req: Request, res: Response): Promise<void> {
  const query = (req.validatedQuery ?? {}) as AdminExportQuery;
  const rows = await listForExport(query);

  const headers = [
    "reference_number",
    "title",
    "submission_type",
    "language",
    "status",
    "contributor_name",
    "contributor_phone",
    "contributor_designation",
    "created_at",
    "submitted_at",
  ];

  const escape = (value: string | null) =>
    `"${String(value ?? "").replace(/"/g, '""')}"`;

  const lines = [
    headers.join(","),
    ...rows.map((row) =>
      [
        row.referenceNumber,
        row.title,
        row.submissionType,
        row.language,
        row.status,
        row.contributorName,
        row.contributorPhone,
        row.contributorDesignation,
        row.createdAt,
        row.submittedAt,
      ]
        .map(escape)
        .join(",")
    ),
  ];

  res.setHeader("Content-Type", "text/csv; charset=utf-8");
  res.setHeader(
    "Content-Disposition",
    `attachment; filename="madhu-smruti-submissions-${new Date().toISOString().slice(0, 10)}.csv"`
  );
  res.send(`\uFEFF${lines.join("\r\n")}`);
}
