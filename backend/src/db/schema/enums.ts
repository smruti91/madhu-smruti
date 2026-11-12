import { pgEnum } from "drizzle-orm/pg-core";

/**
 * Enumerated domain values for the MADHU SMRUTI database.
 */
export const submissionTypeEnum = pgEnum("submission_type", [
  "writeup",
  "painting",
]);

export const submissionLanguageEnum = pgEnum("submission_language", [
  "english",
  "hindi",
  "odia",
]);

export const submissionStatusEnum = pgEnum("submission_status", [
  "draft",
  "submitted",
  "under_review",
  "approved",
  "rejected",
]);
