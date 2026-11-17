import { eq } from "drizzle-orm";
import { getDb } from "../../config/db";
import { writeupContents } from "../../db/schema";
import { sanitizeWriteupHtml } from "../../utils/sanitize";

export interface WriteupContentInput {
  editorJson: unknown;
  htmlContent: string;
}

/**
 * Writeup content service - Tiptap document (JSONB) + rendered HTML snapshot.
 * One-to-one with submissions.
 *
 * The HTML snapshot is sanitized server-side before storage: contributors see
 * their own editor output, but anything arriving over the network is treated
 * as untrusted, so preview and administrative review always render safe HTML.
 */
export async function upsertWriteupContent(submissionId: string, input: WriteupContentInput) {
  const db = getDb();
  const safeHtml = sanitizeWriteupHtml(input.htmlContent);

  const [content] = await db
    .insert(writeupContents)
    .values({
      submissionId,
      editorJson: input.editorJson as never,
      htmlContent: safeHtml,
    })
    .onConflictDoUpdate({
      target: writeupContents.submissionId,
      set: {
        editorJson: input.editorJson as never,
        htmlContent: safeHtml,
        updatedAt: new Date(),
      },
    })
    .returning();

  return content;
}

export async function getWriteupContent(submissionId: string) {
  const db = getDb();
  const [content] = await db
    .select()
    .from(writeupContents)
    .where(eq(writeupContents.submissionId, submissionId));
  return content ?? null;
}
