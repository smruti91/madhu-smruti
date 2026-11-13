import type { Request, Response } from "express";
import { sendSuccess } from "../../utils/apiResponse";
import {
  getAdminSubmissionDetail,
  getDashboardStats,
  listForExport,
  listSubmissionsForAdmin,
  updateSubmissionStatus,
} from "../submissions/service";
import { adminCookieOptions } from "../auth/middleware";
import { generateCsrfToken } from "../auth/service";
import { loginAdmin } from "./auth.service";
import type { AdminStatusInput, AdminLoginInput } from "./validator";

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
 * GET /api/admin/export
 * CSV export of all submissions with contributor details.
 */
export async function exportHandler(_req: Request, res: Response): Promise<void> {
  const rows = await listForExport();

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
