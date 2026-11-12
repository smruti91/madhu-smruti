import { pgTable, timestamp, uuid, varchar } from "drizzle-orm/pg-core";

/**
 * People who submit writeups or paintings.
 */
export const contributors = pgTable("contributors", {
  id: uuid("id").defaultRandom().primaryKey(),
  name: varchar("name", { length: 120 }).notNull(),
  phone: varchar("phone", { length: 20 }).notNull(),
  designation: varchar("designation", { length: 120 }),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .defaultNow()
    .notNull()
    .$onUpdate(() => new Date()),
});
