import { and, desc, eq, gte, like, lte, or, sql } from "drizzle-orm";
import { getDb } from "../../config/db";
import {
  contributors,
  submissions,
  submissionHistory,
  submissionImages,
} from "../../db/schema";
import { normalizeIndianMobile } from "../../utils/phone";

export type SubmissionStatus = (typeof submissions.status.enumValues)[number];

import { HttpError } from "../../utils/errors";
import {
  generateEditToken,
  hashEditToken,
  matchesEditTokenHash,
  signEditSession,
  verifyEditSession,
} from "../auth/service";
import type { CreateSubmissionInput, UpdateSubmissionInput } from "./validator";
import type { AdminExportQuery, AdminListQuery } from "../admin/validator";
import { upsertWriteupContent, getWriteupContent } from "../writeups/service";
import { listImages, replaceImages } from "../paintings/service";
import { contributorPublicFields } from "../contributors/service";

type Submission = typeof submissions.$inferSelect;
type Contributor = typeof contributors.$inferSelect;

const MAX_REFERENCE_ATTEMPTS = 5;
const EDIT_SESSION_TTL_SECONDS = 15 * 60;

// ---------------------------------------------------------------------------
// Reference numbers
// ---------------------------------------------------------------------------

async function nextReferenceNumber(submissionType: "writeup" | "painting"): Promise<string> {
  const db = getDb();
  const year = new Date().getFullYear();
  const kind = submissionType === "writeup" ? "W" : "P";
  const prefix = `MDRAFM-${kind}-${year}-`;

  const [row] = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(submissions)
    .where(like(submissions.referenceNumber, `${prefix}%`));

  let n = (row?.count ?? 0) + 1;

  for (let attempt = 0; attempt < MAX_REFERENCE_ATTEMPTS; attempt += 1) {
    const candidate = `${prefix}${String(n).padStart(4, "0")}`;

    const [existing] = await db
      .select({ id: submissions.id })
      .from(submissions)
      .where(eq(submissions.referenceNumber, candidate));

    if (!existing) return candidate;

    n += 1;
  }

  throw new HttpError(500, "Unable to allocate a reference number");
}

// ---------------------------------------------------------------------------
// Access control - private submission credentials
// ---------------------------------------------------------------------------

/**
 * Loads a submission or throws 404.
 */
export async function getSubmissionOrThrow(submissionId: string): Promise<Submission> {
  const db = getDb();
  const [submission] = await db
    .select()
    .from(submissions)
    .where(eq(submissions.id, submissionId));
  if (!submission) throw HttpError.notFound("Submission not found");
  return submission;
}

/**
 * Ownership enforcement: the request must carry the private edit token
 * (raw, matched against the stored hash) or a short-lived edit session
 * token issued by /resume. A phone number alone is NEVER sufficient.
 */
export function assertEditCredential(submission: Submission, req: {
  headers: Record<string, unknown>;
  query: Record<string, unknown>;
}): void {
  const headerToken = req.headers["x-edit-token"];
  const queryToken = req.query["token"];
  const rawToken =
    typeof headerToken === "string" && headerToken.length > 0
      ? headerToken
      : typeof queryToken === "string"
        ? queryToken
        : null;

  if (!rawToken) {
    throw HttpError.unauthorized(
      "A private edit token is required to access this submission"
    );
  }

  // Short-lived edit session issued by /resume
  if (looksLikeSessionToken(rawToken)) {
    const sessionSubmissionId = verifyEditSession(rawToken);
    if (sessionSubmissionId === submission.id) return;
    throw HttpError.unauthorized("Editing session is invalid or expired");
  }

  // Raw edit token matched against the stored SHA-256 hash
  if (
    submission.editTokenHash &&
    matchesEditTokenHash(rawToken, submission.editTokenHash)
  ) {
    return;
  }

  throw HttpError.unauthorized("Invalid private edit token for this submission");
}

function looksLikeSessionToken(token: string): boolean {
  return token.split(".").length === 3 && token.startsWith("ey");
}

// ---------------------------------------------------------------------------
// DTOs
// ---------------------------------------------------------------------------

export function submissionSummary(submission: Submission, contributor: Contributor) {
  return {
    id: submission.id,
    referenceNumber: submission.referenceNumber,
    submissionType: submission.submissionType,
    title: submission.title,
    subtitle: submission.subtitle,
    category: submission.category,
    description: submission.description,
    language: submission.language,
    status: submission.status,
    createdAt: submission.createdAt.toISOString(),
    updatedAt: submission.updatedAt.toISOString(),
    submittedAt: submission.submittedAt?.toISOString() ?? null,
    contributor: contributorPublicFields(contributor),
  };
}

export async function buildSubmissionDetail(submission: Submission, contributor: Contributor) {
  const writeupContent =
    submission.submissionType === "writeup"
      ? await getWriteupContent(submission.id)
      : null;

  const images =
    submission.submissionType === "painting" ? await listImages(submission.id) : null;

  const db = getDb();
  const history = await db
    .select()
    .from(submissionHistory)
    .where(eq(submissionHistory.submissionId, submission.id))
    .orderBy(desc(submissionHistory.createdAt));

  return {
    ...submissionSummary(submission, contributor),
    writeup: writeupContent
      ? {
          editorJson: writeupContent.editorJson,
          htmlContent: writeupContent.htmlContent,
          updatedAt: writeupContent.updatedAt.toISOString(),
        }
      : null,
    images: images?.map((image) => ({
      id: image.id,
      imageUrl: image.imageUrl,
      imagekitFileId: image.imagekitFileId,
      caption: image.caption,
      displayOrder: image.displayOrder,
      createdAt: image.createdAt.toISOString(),
    })) ?? null,
    history: history.map((entry) => ({
      id: entry.id,
      action: entry.action,
      remarks: entry.remarks,
      changedBy: entry.changedBy,
      createdAt: entry.createdAt.toISOString(),
    })),
  };
}

async function getContributorOrThrow(contributorId: string): Promise<Contributor> {
  const db = getDb();
  const [contributor] = await db
    .select()
    .from(contributors)
    .where(eq(contributors.id, contributorId));
  if (!contributor) throw HttpError.badRequest("Contributor not found");
  return contributor;
}

async function recordHistory(
  submissionId: string,
  action: string,
  remarks: string,
  changedBy: string
): Promise<void> {
  const db = getDb();
  await db.insert(submissionHistory).values({
    submissionId,
    action,
    remarks,
    changedBy,
  });
}

// ---------------------------------------------------------------------------
// Operations
// ---------------------------------------------------------------------------

/**
 * Creates a draft submission and returns it together with the raw edit token.
 * The raw token is never stored and shown exactly once - only its SHA-256
 * hash is persisted.
 */
export async function createSubmission(input: CreateSubmissionInput) {
  await getContributorOrThrow(input.contributorId);

  const db = getDb();
  const referenceNumber = await nextReferenceNumber(input.submissionType);
  const editToken = generateEditToken();

  const [submission] = await db
    .insert(submissions)
    .values({
      referenceNumber,
      contributorId: input.contributorId,
      submissionType: input.submissionType,
      title: input.title,
      subtitle: input.subtitle ?? null,
      category: input.category ?? null,
      description: input.description ?? null,
      language: input.language,
      status: "draft",
      editTokenHash: hashEditToken(editToken),
    })
    .returning();

  if (input.writeup) {
    await upsertWriteupContent(submission.id, input.writeup);
  }
  if (input.painting) {
    await replaceImages(submission.id, input.painting.images);
  }

  await recordHistory(submission.id, "created", `Submission created (${input.submissionType})`, "contributor");

  const contributor = await getContributorOrThrow(input.contributorId);

  return {
    submission: submissionSummary(submission, contributor),
    editToken,
  };
}

/**
 * Updates an authorized draft. Final submissions cannot be edited without
 * admin permission (admins reopen them to draft via the status endpoint).
 */
export async function updateSubmission(submission: Submission, input: UpdateSubmissionInput) {
  if (submission.status !== "draft") {
    throw HttpError.conflict(
      `Only draft submissions can be edited. This submission is "${submission.status}". ` +
        "Contact an administrator to reopen it."
    );
  }

  const db = getDb();

  if (input.title || input.language || input.subtitle !== undefined || input.category !== undefined || input.description !== undefined) {
    await db
      .update(submissions)
      .set({
        ...(input.title ? { title: input.title } : {}),
        ...(input.subtitle !== undefined ? { subtitle: input.subtitle || null } : {}),
        ...(input.category !== undefined ? { category: input.category || null } : {}),
        ...(input.description !== undefined ? { description: input.description || null } : {}),
        ...(input.language ? { language: input.language } : {}),
      })
      .where(eq(submissions.id, submission.id));
  }

  if (input.contributor) {
    await db
      .update(contributors)
      .set({
        ...(input.contributor.name ? { name: input.contributor.name } : {}),
        ...(input.contributor.phone ? { phone: input.contributor.phone } : {}),
        ...(input.contributor.designation !== undefined
          ? { designation: input.contributor.designation }
          : {}),
      })
      .where(eq(contributors.id, submission.contributorId));
  }

  if (input.writeup && submission.submissionType === "writeup") {
    await upsertWriteupContent(submission.id, input.writeup);
  }

  if (input.painting && submission.submissionType === "painting") {
    await replaceImages(submission.id, input.painting.images);
  }

  // Autosave requests change content but are not audit-worthy events; only
  // manual saves, finalization and admin actions appear in the history.
  if (!input.autosave) {
    await recordHistory(submission.id, "updated", "Draft updated by contributor", "contributor");
  }

  const updated = await getSubmissionOrThrow(submission.id);
  const contributor = await getContributorOrThrow(submission.contributorId);
  return buildSubmissionDetail(updated, contributor);
}

/**
 * Converts a draft into a final submission. Runs the status change and the
 * audit entry inside a single database transaction so they succeed or fail
 * together.
 */
export async function finalizeSubmission(submission: Submission) {
  if (submission.status !== "draft") {
    throw HttpError.conflict(
      `Only draft submissions can be finalized. This submission is already "${submission.status}".`
    );
  }

  const db = getDb();

  const detail = await db.transaction(async (tx) => {
    const [updated] = await tx
      .update(submissions)
      .set({ status: "submitted" as SubmissionStatus, submittedAt: new Date() })
      .where(eq(submissions.id, submission.id))
      .returning();

    await tx.insert(submissionHistory).values({
      submissionId: submission.id,
      action: "submitted",
      remarks: "Draft finalized and submitted for review",
      changedBy: "contributor",
    });

    return updated;
  });

  const contributor = await getContributorOrThrow(submission.contributorId);
  return buildSubmissionDetail(detail, contributor);
}

/**
 * Verifies the private edit token and issues a short-lived edit session.
 */
export async function resumeEditingSession(submission: Submission) {
  if (submission.status !== "draft") {
    throw HttpError.conflict(
      `Editing sessions can only be issued for drafts. This submission is "${submission.status}".`
    );
  }

  const sessionToken = signEditSession(submission.id);

  const contributor = await getContributorOrThrow(submission.contributorId);

  return {
    sessionToken,
    expiresInSeconds: EDIT_SESSION_TTL_SECONDS,
    submission: submissionSummary(submission, contributor),
  };
}

/**
 * Cross-device draft access: looks up a draft by its token hash alone.
 * The raw token is never returned and must not be echoed by the API.
 * All error paths use the same generic message so nothing about the existence
 * or status of a draft is revealed to token guessers.
 */
export async function verifyDraftTokenForEditing(rawToken: string) {
  const db = getDb();
  const tokenHash = hashEditToken(rawToken);

  const [submission] = await db
    .select()
    .from(submissions)
    .where(eq(submissions.editTokenHash, tokenHash));

  if (!submission || submission.status !== "draft") {
    throw HttpError.unauthorized("Invalid draft access token");
  }

  const contributor = await getContributorOrThrow(submission.contributorId);
  return {
    submissionId: submission.id,
    submission: submissionSummary(submission, contributor),
  };
}

// ---------------------------------------------------------------------------
// Admin operations
// ---------------------------------------------------------------------------

/**
 * Public search: find all submissions by a contributor's phone number.
 * Returns drafts and finalized submissions ordered by most recent first.
 * No authentication required - phone number is the access credential.
 */
export async function listSubmissionsByPhone(phone: string) {
  const db = getDb();
  const normalizedPhone = normalizeIndianMobile(phone);
  if (!normalizedPhone) return [];

  // Find the contributor by phone
  const [contributor] = await db
    .select()
    .from(contributors)
    .where(eq(contributors.phone, normalizedPhone));

  if (!contributor) return [];

  // Get all submissions for this contributor
  const submissionsList = await db
    .select({
      id: submissions.id,
      referenceNumber: submissions.referenceNumber,
      title: submissions.title,
      submissionType: submissions.submissionType,
      language: submissions.language,
      status: submissions.status,
      createdAt: submissions.createdAt,
      updatedAt: submissions.updatedAt,
      submittedAt: submissions.submittedAt,
    })
    .from(submissions)
    .where(eq(submissions.contributorId, contributor.id))
    .orderBy(desc(submissions.createdAt));

  return submissionsList.map((s) => ({
    ...s,
    createdAt: s.createdAt.toISOString(),
    updatedAt: s.updatedAt.toISOString(),
    submittedAt: s.submittedAt?.toISOString() ?? null,
  }));
}

/**
 * Builds the shared WHERE clause for admin list/export queries. All values are
 * bound as SQL parameters by Drizzle — no string interpolation into SQL.
 */
function buildAdminFilters(query: AdminListQuery | AdminExportQuery) {
  const filters = [
    query.status ? eq(submissions.status, query.status) : undefined,
    query.submissionType ? eq(submissions.submissionType, query.submissionType) : undefined,
    query.language ? eq(submissions.language, query.language) : undefined,
    query.search
      ? or(
          like(submissions.title, `%${query.search}%`),
          like(submissions.referenceNumber, `%${query.search}%`),
          like(contributors.name, `%${query.search}%`)
        )
      : undefined,
    query.contributorName
      ? like(contributors.name, `%${query.contributorName}%`)
      : undefined,
    query.phone ? like(contributors.phone, `%${query.phone}%`) : undefined,
    query.designation
      ? like(contributors.designation, `%${query.designation}%`)
      : undefined,
    query.fromDate
      ? gte(submissions.createdAt, new Date(`${query.fromDate}T00:00:00.000Z`))
      : undefined,
    query.toDate
      ? lte(submissions.createdAt, new Date(`${query.toDate}T23:59:59.999Z`))
      : undefined,
  ].filter(Boolean);

  return filters.length > 0 ? and(...filters) : undefined;
}

/**
 * Public read-only view used by the "Track Article" page.
 *
 * The phone number identifies the contributor and therefore authorizes a
 * VIEW of their own articles without any token. This endpoint never returns
 * edit credentials — modifying a submission still requires the private token.
 */
export async function getTrackedSubmissionDetail(id: string, rawPhone: string) {
  const db = getDb();
  const phone = normalizeIndianMobile(rawPhone);
  if (!phone) throw HttpError.badRequest("A valid phone number is required");

  const [contributor] = await db
    .select()
    .from(contributors)
    .where(eq(contributors.phone, phone));
  if (!contributor) throw HttpError.notFound("Submission not found for this phone number");

  const [submission] = await db
    .select()
    .from(submissions)
    .where(and(eq(submissions.id, id), eq(submissions.contributorId, contributor.id)));
  // Deliberately identical error for "someone else's" and non-existent ids.
  if (!submission) throw HttpError.notFound("Submission not found for this phone number");

  return buildSubmissionDetail(submission, contributor);
}

export async function listSubmissionsForAdmin(query: AdminListQuery) {
  const db = getDb();
  const offset = (query.page - 1) * query.limit;
  const where = buildAdminFilters(query);

  const items = await db
    .select({
      id: submissions.id,
      referenceNumber: submissions.referenceNumber,
      title: submissions.title,
      submissionType: submissions.submissionType,
      language: submissions.language,
      status: submissions.status,
      createdAt: submissions.createdAt,
      updatedAt: submissions.updatedAt,
      submittedAt: submissions.submittedAt,
      contributorName: contributors.name,
      contributorPhone: contributors.phone,
      contributorDesignation: contributors.designation,
    })
    .from(submissions)
    .innerJoin(contributors, eq(submissions.contributorId, contributors.id))
    .where(where)
    .orderBy(desc(submissions.createdAt))
    .limit(query.limit)
    .offset(offset);

  const [countRow] = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(submissions)
    .innerJoin(contributors, eq(submissions.contributorId, contributors.id))
    .where(where);

  const total = countRow?.count ?? 0;

  return {
    items: items.map((item) => ({
      ...item,
      createdAt: item.createdAt.toISOString(),
      updatedAt: item.updatedAt.toISOString(),
      submittedAt: item.submittedAt?.toISOString() ?? null,
    })),
    page: query.page,
    limit: query.limit,
    total,
    totalPages: Math.max(1, Math.ceil(total / query.limit)),
  };
}

/** Looks up one painting image for the authenticated admin download route. */
export async function getImageForDownload(submissionId: string, imageId: string) {
  const db = getDb();
  const [image] = await db
    .select({
      id: submissionImages.id,
      submissionId: submissionImages.submissionId,
      imageUrl: submissionImages.imageUrl,
      imagekitFileId: submissionImages.imagekitFileId,
      caption: submissionImages.caption,
    })
    .from(submissionImages)
    .where(
      and(
        eq(submissionImages.id, imageId),
        eq(submissionImages.submissionId, submissionId)
      )
    );
  if (!image) throw HttpError.notFound("Image not found for this submission");
  return image;
}

export async function getAdminSubmissionDetail(submissionId: string) {
  const submission = await getSubmissionOrThrow(submissionId);
  const contributor = await getContributorOrThrow(submission.contributorId);
  return buildSubmissionDetail(submission, contributor);
}

/**
 * Admin status transition. Approving/rejecting/reopening all flow through here;
 * reopening to "draft" is the admin-granted permission that allows contributors
 * to edit again. Runs the update and audit entry in one transaction.
 */
export async function updateSubmissionStatus(
  submissionId: string,
  input: { status: SubmissionStatus; remarks?: string },
  admin: { name: string }
) {
  const submission = await getSubmissionOrThrow(submissionId);

  if (submission.status === input.status) {
    throw HttpError.conflict(`Submission is already "${input.status}"`);
  }

  const db = getDb();

  const [updated] = await db.transaction(async (tx) => {
    const [row] = await tx
      .update(submissions)
      .set({ status: input.status })
      .where(eq(submissions.id, submission.id))
      .returning();

    await tx.insert(submissionHistory).values({
      submissionId: submission.id,
      action: "status_changed",
      remarks:
        input.remarks?.trim() ||
        `Status changed: ${submission.status} -> ${input.status}`,
      changedBy: admin.name,
    });

    return [row];
  });

  const contributor = await getContributorOrThrow(submission.contributorId);
  return buildSubmissionDetail(updated, contributor);
}

export async function getDashboardStats() {
  const db = getDb();

  const [statusRows, typeRows, contributorRow] = await Promise.all([
    db
      .select({ status: submissions.status, count: sql<number>`count(*)::int` })
      .from(submissions)
      .groupBy(submissions.status),
    db
      .select({
        submissionType: submissions.submissionType,
        count: sql<number>`count(*)::int`,
      })
      .from(submissions)
      .groupBy(submissions.submissionType),
    db.select({ count: sql<number>`count(*)::int` }).from(contributors),
  ]);

  const byStatus: Record<SubmissionStatus, number> = {
    draft: 0,
    submitted: 0,
    under_review: 0,
    approved: 0,
    rejected: 0,
  };
  for (const row of statusRows) byStatus[row.status] = row.count;

  const byType = { writeup: 0, painting: 0 };
  for (const row of typeRows) byType[row.submissionType] = row.count;

  const recent = await db
    .select({
      id: submissions.id,
      referenceNumber: submissions.referenceNumber,
      title: submissions.title,
      status: submissions.status,
      submissionType: submissions.submissionType,
      createdAt: submissions.createdAt,
      contributorName: contributors.name,
    })
    .from(submissions)
    .innerJoin(contributors, eq(submissions.contributorId, contributors.id))
    .orderBy(desc(submissions.createdAt))
    .limit(5);

  const totalSubmissions = Object.values(byStatus).reduce((a, b) => a + b, 0);

  return {
    totalContributors: contributorRow[0]?.count ?? 0,
    totalSubmissions,
    // Explicit counts for the editorial dashboard cards (derived from the
    // same single source of truth as byStatus).
    totalDrafts: byStatus.draft,
    totalFinalSubmissions: totalSubmissions - byStatus.draft,
    pendingReviews: byStatus.under_review,
    byStatus,
    byType,
    recent: recent.map((item) => ({
      ...item,
      createdAt: item.createdAt.toISOString(),
    })),
  };
}

export async function listForExport(query?: AdminExportQuery) {
  const db = getDb();
  const where = query ? buildAdminFilters(query) : undefined;

  const rows = await db
    .select({
      referenceNumber: submissions.referenceNumber,
      title: submissions.title,
      submissionType: submissions.submissionType,
      language: submissions.language,
      status: submissions.status,
      createdAt: submissions.createdAt,
      submittedAt: submissions.submittedAt,
      contributorName: contributors.name,
      contributorPhone: contributors.phone,
      contributorDesignation: contributors.designation,
    })
    .from(submissions)
    .innerJoin(contributors, eq(submissions.contributorId, contributors.id))
    .where(where)
    .orderBy(desc(submissions.createdAt));

  return rows.map((row) => ({
    ...row,
    createdAt: row.createdAt.toISOString(),
    submittedAt: row.submittedAt?.toISOString() ?? "",
  }));
}
