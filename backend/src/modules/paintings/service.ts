import { asc, eq } from "drizzle-orm";
import { getDb } from "../../config/db";
import { submissionImages } from "../../db/schema";

export interface PaintingImageInput {
  imageUrl: string;
  imagekitFileId?: string;
  caption?: string;
}

/**
 * Painting service - images stored by reference (ImageKit URL + fileId),
 * never as binary data in PostgreSQL.
 */
export async function upsertPrimaryImage(submissionId: string, input: PaintingImageInput) {
  const db = getDb();

  const [existing] = await db
    .select()
    .from(submissionImages)
    .where(eq(submissionImages.submissionId, submissionId))
    .orderBy(asc(submissionImages.displayOrder));

  if (existing) {
    const [updated] = await db
      .update(submissionImages)
      .set({
        imageUrl: input.imageUrl,
        imagekitFileId: input.imagekitFileId ?? existing.imagekitFileId,
        caption: input.caption ?? existing.caption,
      })
      .where(eq(submissionImages.id, existing.id))
      .returning();
    return updated;
  }

  const [created] = await db
    .insert(submissionImages)
    .values({
      submissionId,
      imageUrl: input.imageUrl,
      imagekitFileId: input.imagekitFileId ?? null,
      caption: input.caption ?? null,
      displayOrder: 0,
    })
    .returning();

  return created;
}

export async function listImages(submissionId: string) {
  const db = getDb();
  return db
    .select()
    .from(submissionImages)
    .where(eq(submissionImages.submissionId, submissionId))
    .orderBy(asc(submissionImages.displayOrder));
}
