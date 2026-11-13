import { eq } from "drizzle-orm";
import { getDb } from "../../config/db";
import { writeupContents } from "../../db/schema";

export interface WriteupContentInput {
  editorJson: unknown;
  htmlContent: string;
}

/**
 * Writeup content service - Tiptap document (JSONB) + rendered HTML snapshot.
 * One-to-one with submissions.
 */
export async function upsertWriteupContent(submissionId: string, input: WriteupContentInput) {
  const db = getDb();

  const [content] = await db
    .insert(writeupContents)
    .values({
      submissionId,
      editorJson: input.editorJson as never,
      htmlContent: input.htmlContent,
    })
    .onConflictDoUpdate({
      target: writeupContents.submissionId,
      set: {
        editorJson: input.editorJson as never,
        htmlContent: input.htmlContent,
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
