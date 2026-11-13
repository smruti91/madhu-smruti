import { index, integer, pgTable, text, timestamp, uniqueIndex, uuid, varchar } from "drizzle-orm/pg-core";
import { submissions } from "./submissions";

/**
 * Images attached to a submission (paintings, or photos alongside writeups).
 *
 * Only the ImageKit URL and file id are stored here - no image binary
 * data lives in PostgreSQL.
 */
export const submissionImages = pgTable(
  "submission_images",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    submissionId: uuid("submission_id")
      .notNull()
      .references(() => submissions.id, { onDelete: "cascade" }),
    imageUrl: text("image_url").notNull(),
    imagekitFileId: varchar("imagekit_file_id", { length: 255 }),
    caption: varchar("caption", { length: 300 }),
    displayOrder: integer("display_order").notNull().default(0),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    index("submission_images_submission_id_idx").on(table.submissionId),
    // A submission cannot have two images at the same display position
    uniqueIndex("submission_images_submission_order_unique").on(
      table.submissionId,
      table.displayOrder
    ),
  ]
);
