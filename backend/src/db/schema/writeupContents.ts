import { jsonb, pgTable, text, timestamp, uuid } from "drizzle-orm/pg-core";
import { submissions } from "./submissions";

/**
 * Tiptap document for a writeup submission.
 *
 * editor_json keeps the structured ProseMirror/Tiptap document (JSONB) so the
 * editor can re-hydrate the exact document; html_content is the rendered
 * snapshot used for display, export and review.
 *
 * One-to-one with submissions (unique FK, cascade delete).
 */
export const writeupContents = pgTable("writeup_contents", {
  id: uuid("id").defaultRandom().primaryKey(),
  submissionId: uuid("submission_id")
    .notNull()
    .unique()
    .references(() => submissions.id, { onDelete: "cascade" }),
  editorJson: jsonb("editor_json").notNull(),
  htmlContent: text("html_content").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .defaultNow()
    .notNull()
    .$onUpdate(() => new Date()),
});
