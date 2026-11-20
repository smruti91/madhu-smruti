import { index, pgTable, text, timestamp, uniqueIndex, uuid, varchar } from "drizzle-orm/pg-core";
import { contributors } from "./contributors";
import {
  submissionLanguageEnum,
  submissionStatusEnum,
  submissionTypeEnum,
} from "./enums";

/**
 * Core submission record for a writeup or a painting.
 *
 * reference_number is a human-readable unique identifier, e.g. "MDRAFM-W-2026-0001"
 * (W = writeup, P = painting).
 *
 * edit_token_hash stores a bcrypt/SHA hash of the secret edit link token so
 * contributors can edit their own submission before review. The raw token is
 * never stored.
 */
export const submissions = pgTable(
  "submissions",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    referenceNumber: varchar("reference_number", { length: 32 }).notNull(),
    contributorId: uuid("contributor_id")
      .notNull()
      .references(() => contributors.id, { onDelete: "cascade" }),
    submissionType: submissionTypeEnum("submission_type").notNull(),
    title: varchar("title", { length: 200 }).notNull(),
    subtitle: varchar("subtitle", { length: 200 }),
    category: varchar("category", { length: 80 }),
    description: text("description"),
    language: submissionLanguageEnum("language").notNull(),
    status: submissionStatusEnum("status").default("draft").notNull(),
    editTokenHash: varchar("edit_token_hash", { length: 128 }),
    submittedAt: timestamp("submitted_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .defaultNow()
      .notNull()
      .$onUpdate(() => new Date()),
  },
  (table) => [
    uniqueIndex("submissions_reference_number_unique").on(table.referenceNumber),
    // A token always maps to exactly one draft (NULLs are allowed for rows
    // that have no token, e.g. admin-created records).
    uniqueIndex("submissions_edit_token_hash_unique").on(table.editTokenHash),
    index("submissions_contributor_id_idx").on(table.contributorId),
    index("submissions_status_idx").on(table.status),
    index("submissions_type_idx").on(table.submissionType),
    index("submissions_created_at_idx").on(table.createdAt),
  ]
);
