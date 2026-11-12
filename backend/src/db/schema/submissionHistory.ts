import { index, pgTable, text, timestamp, uuid, varchar } from "drizzle-orm/pg-core";
import { submissions } from "./submissions";

/**
 * Append-only audit trail of every action taken on a submission
 * (created, submitted, status changed, rejected, ...).
 *
 * changed_by is informational ("contributor", admin name or admin id).
 */
export const submissionHistory = pgTable(
  "submission_history",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    submissionId: uuid("submission_id")
      .notNull()
      .references(() => submissions.id, { onDelete: "cascade" }),
    action: varchar("action", { length: 60 }).notNull(),
    remarks: text("remarks"),
    changedBy: varchar("changed_by", { length: 120 }),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    index("submission_history_submission_id_idx").on(table.submissionId),
    index("submission_history_created_at_idx").on(table.createdAt),
  ]
);
