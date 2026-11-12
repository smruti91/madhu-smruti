import { pgTable, timestamp, uuid, varchar } from "drizzle-orm/pg-core";

/**
 * Administrator accounts. Passwords are stored as bcrypt hashes only -
 * never plaintext, never reversible.
 */
export const admins = pgTable("admins", {
  id: uuid("id").defaultRandom().primaryKey(),
  name: varchar("name", { length: 120 }).notNull(),
  email: varchar("email", { length: 255 }).notNull().unique(),
  passwordHash: varchar("password_hash", { length: 255 }).notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
});
