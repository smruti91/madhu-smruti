import { asc, eq } from "drizzle-orm";
import { getDb } from "../../config/db";
import { submissionImages } from "../../db/schema";
import { HttpError } from "../../utils/errors";

export interface PaintingImageInput {
  imageUrl: string;
  imagekitFileId?: string;
  caption?: string;
}

/**
 * Painting service - images stored by reference (ImageKit URL + fileId),
 * never as binary data in PostgreSQL.
 *
 * A painting's image set is replaced as a whole: deleting every existing row
 * and re-inserting in the new display order inside one transaction keeps the
 * (submission_id, display_order) unique index satisfied and guarantees the
 * editor, preview and admin review always see one consistent ordering.
 */
export async function replaceImages(submissionId: string, images: PaintingImageInput[]) {
  const db = getDb();

  const urls = images.map((image) => image.imageUrl);
  if (new Set(urls).size !== urls.length) {
    throw HttpError.badRequest("Duplicate images are not allowed in a painting");
  }

  return db.transaction(async (tx) => {
    await tx.delete(submissionImages).where(eq(submissionImages.submissionId, submissionId));

    if (images.length === 0) return [];

    return tx
      .insert(submissionImages)
      .values(
        images.map((image, index) => ({
          submissionId,
          imageUrl: image.imageUrl,
          imagekitFileId: image.imagekitFileId ?? null,
          caption: image.caption ?? null,
          displayOrder: index,
        }))
      )
      .returning();
  });
}

export async function listImages(submissionId: string) {
  const db = getDb();
  return db
    .select()
    .from(submissionImages)
    .where(eq(submissionImages.submissionId, submissionId))
    .orderBy(asc(submissionImages.displayOrder));
}