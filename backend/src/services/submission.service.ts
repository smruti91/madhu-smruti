import { like, sql } from "drizzle-orm";
import { getDb } from "../config/db";
import {
  contributors,
  submissions,
  submissionHistory,
  submissionImages,
  writeupContents,
} from "../db/schema";

type SubmissionType = "writeup" | "painting";
type SubmissionLanguage = "english" | "hindi" | "odia";

interface ContributorInput {
  name: string;
  phone: string;
  designation?: string;
}

export interface CreateSubmissionInput {
  contributor: ContributorInput;
  title: string;
  language: SubmissionLanguage;
  submissionType: SubmissionType;
  writeup?: {
    editorJson: unknown;
    htmlContent: string;
  };
  painting?: {
    imageUrl: string;
    imagekitFileId?: string;
    caption?: string;
  };
}

type SubmissionStatus =
  | "draft"
  | "submitted"
  | "under_review"
  | "approved"
  | "rejected";

export interface SubmissionCreated {
  id: string;
  referenceNumber: string;
  status: SubmissionStatus;
  title: string;
  submissionType: SubmissionType;
  language: SubmissionLanguage;
  createdAt: string;
}

const MAX_REFERENCE_ATTEMPTS = 5;

/**
 * Human-readable sequential reference number, e.g. MDRAFM-W-2026-0001.
 * Retries on unique-constraint conflicts caused by concurrent submissions.
 */
async function nextReferenceNumber(submissionType: SubmissionType): Promise<string> {
  const year = new Date().getFullYear();
  const kind = submissionType === "writeup" ? "W" : "P";
  const prefix = `MDRAFM-${kind}-${year}-`;

  const [row] = await getDb()
    .select({ count: sql<number>`count(*)::int` })
    .from(submissions)
    .where(like(submissions.referenceNumber, `${prefix}%`));

  let n = (row?.count ?? 0) + 1;

  for (let attempt = 0; attempt < MAX_REFERENCE_ATTEMPTS; attempt += 1) {
    const candidate = `${prefix}${String(n).padStart(4, "0")}`;

    const [existing] = await getDb()
      .select({ id: submissions.id })
      .from(submissions)
      .where(like(submissions.referenceNumber, candidate));

    if (!existing) return candidate;

    n += 1;
  }

  throw new Error("Unable to allocate a reference number");
}

/**
 * Create a submission with its contributor and type-specific content,
 * plus an initial history entry. All in one request.
 */
export async function createSubmission(
  input: CreateSubmissionInput
): Promise<SubmissionCreated> {
  const db = getDb();
  const referenceNumber = await nextReferenceNumber(input.submissionType);

  const [contributor] = await db
    .insert(contributors)
    .values({
      name: input.contributor.name,
      phone: input.contributor.phone,
      designation: input.contributor.designation ?? null,
    })
    .returning();

  const [submission] = await db
    .insert(submissions)
    .values({
      referenceNumber,
      contributorId: contributor.id,
      submissionType: input.submissionType,
      title: input.title,
      language: input.language,
      status: "draft",
    })
    .returning();

  if (input.submissionType === "writeup" && input.writeup) {
    await db.insert(writeupContents).values({
      submissionId: submission.id,
      editorJson: input.writeup.editorJson as never,
      htmlContent: input.writeup.htmlContent,
    });
  }

  if (input.submissionType === "painting" && input.painting) {
    await db.insert(submissionImages).values({
      submissionId: submission.id,
      imageUrl: input.painting.imageUrl,
      imagekitFileId: input.painting.imagekitFileId ?? null,
      caption: input.painting.caption ?? null,
      displayOrder: 0,
    });
  }

  await db.insert(submissionHistory).values({
    submissionId: submission.id,
    action: "created",
    remarks: `Submission created (${input.submissionType})`,
    changedBy: "contributor",
  });

  return {
    id: submission.id,
    referenceNumber: submission.referenceNumber,
    status: submission.status,
    title: submission.title,
    submissionType: submission.submissionType,
    language: submission.language,
    createdAt: submission.createdAt.toISOString(),
  };
}
