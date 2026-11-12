import "dotenv/config";
import bcrypt from "bcryptjs";
import { neon } from "@neondatabase/serverless";
import { drizzle } from "drizzle-orm/neon-http";
import { admins } from "./schema";

/**
 * Seed the first admin account from environment variables.
 *
 * Usage:
 *   ADMIN_NAME="..." ADMIN_EMAIL="..." ADMIN_PASSWORD="..." npm run db:seed
 *
 * Never hard-code credentials in this file or commit them anywhere.
 */
async function seed(): Promise<void> {
  const name = process.env.ADMIN_NAME;
  const email = process.env.ADMIN_EMAIL?.toLowerCase().trim();
  const password = process.env.ADMIN_PASSWORD;

  if (!process.env.DATABASE_URL) {
    console.error("❌ DATABASE_URL is not set - cannot seed the database");
    process.exit(1);
  }

  if (!name || !email || !password) {
    console.error(
      "❌ Missing required environment variables: ADMIN_NAME, ADMIN_EMAIL, ADMIN_PASSWORD"
    );
    process.exit(1);
  }

  if (password.length < 8) {
    console.error("❌ ADMIN_PASSWORD must be at least 8 characters");
    process.exit(1);
  }

  const db = drizzle(neon(process.env.DATABASE_URL));

  const passwordHash = await bcrypt.hash(password, 12);

  const inserted = await db
    .insert(admins)
    .values({ name, email, passwordHash })
    .onConflictDoNothing({ target: admins.email })
    .returning({ id: admins.id });

  if (inserted.length > 0) {
    console.log(`✅ Admin account created: ${name} <${email}> (id: ${inserted[0].id})`);
  } else {
    console.log(`ℹ️  Admin with email ${email} already exists - nothing changed`);
  }
}

seed()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error("❌ Seed failed:", err);
    process.exit(1);
  });
