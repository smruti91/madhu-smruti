import { relations } from "drizzle-orm";
import { contributors } from "./contributors";
import { submissions } from "./submissions";
import { submissionHistory } from "./submissionHistory";
import { submissionImages } from "./submissionImages";
import { writeupContents } from "./writeupContents";

/**
 * Drizzle relational API definitions - enable typed joins with db.query.*.
 */
export const contributorsRelations = relations(contributors, ({ many }) => ({
  submissions: many(submissions),
}));

export const submissionsRelations = relations(submissions, ({ one, many }) => ({
  contributor: one(contributors, {
    fields: [submissions.contributorId],
    references: [contributors.id],
  }),
  writeupContent: one(writeupContents, {
    fields: [submissions.id],
    references: [writeupContents.submissionId],
  }),
  images: many(submissionImages),
  history: many(submissionHistory),
}));

export const writeupContentsRelations = relations(writeupContents, ({ one }) => ({
  submission: one(submissions, {
    fields: [writeupContents.submissionId],
    references: [submissions.id],
  }),
}));

export const submissionImagesRelations = relations(submissionImages, ({ one }) => ({
  submission: one(submissions, {
    fields: [submissionImages.submissionId],
    references: [submissions.id],
  }),
}));

export const submissionHistoryRelations = relations(submissionHistory, ({ one }) => ({
  submission: one(submissions, {
    fields: [submissionHistory.submissionId],
    references: [submissions.id],
  }),
}));
