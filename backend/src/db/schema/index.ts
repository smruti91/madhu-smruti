/**
 * Database schema definitions (Drizzle ORM).
 *
 * Tables will be added here as business functionality is implemented, e.g.:
 *
 * import { pgTable, text, timestamp, uuid } from "drizzle-orm/pg-core";
 *
 * export const memories = pgTable("memories", {
 *   id: uuid("id").defaultRandom().primaryKey(),
 *   title: text("title").notNull(),
 *   body: text("body"), // rich text (Tiptap HTML)
 *   imageUrl: text("image_url"),
 *   createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
 * });
 */
export {};
