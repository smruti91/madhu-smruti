import { eq } from "drizzle-orm";
import { getDb } from "../../config/db";
import { contributors } from "../../db/schema";
import type { CreateContributorInput } from "./validator";

/**
 * Registers (or updates) a contributor.
 *
 * Phone number is treated as the natural contributor key: re-registering with
 * the same phone updates name/designation instead of creating a duplicate.
 */
export async function registerContributor(input: CreateContributorInput) {
  const db = getDb();

  const [existing] = await db
    .select()
    .from(contributors)
    .where(eq(contributors.phone, input.phone));

  if (existing) {
    const [updated] = await db
      .update(contributors)
      .set({
        name: input.name,
        designation: input.designation ?? existing.designation,
      })
      .where(eq(contributors.id, existing.id))
      .returning();
    return { contributor: updated, created: false };
  }

  const [created] = await db
    .insert(contributors)
    .values({
      name: input.name,
      phone: input.phone,
      designation: input.designation ?? null,
    })
    .returning();

  return { contributor: created, created: true };
}

export async function getContributorById(id: string) {
  const db = getDb();
  const [contributor] = await db.select().from(contributors).where(eq(contributors.id, id));
  return contributor ?? null;
}

export function contributorPublicFields(contributor: typeof contributors.$inferSelect) {
  return {
    id: contributor.id,
    name: contributor.name,
    phone: contributor.phone,
    designation: contributor.designation,
  };
}
