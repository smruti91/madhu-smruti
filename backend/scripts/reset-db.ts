import "dotenv/config";
import { neon } from "@neondatabase/serverless";

/**
 * Development utility: drop every MADHU SMRUTI table and enum so migrations
 * can be re-applied from scratch. DANGEROUS - deletes all data.
 *
 * Usage: npm run db:reset
 */
async function reset(): Promise<void> {
  if (!process.env.DATABASE_URL) {
    console.error("❌ DATABASE_URL is not set");
    process.exit(1);
  }

  if (process.env.NODE_ENV === "production") {
    console.error("❌ Refusing to reset a production database");
    process.exit(1);
  }

  const sql = neon(process.env.DATABASE_URL);

  await sql`DROP TABLE IF EXISTS submission_history CASCADE`;
  await sql`DROP TABLE IF EXISTS submission_images CASCADE`;
  await sql`DROP TABLE IF EXISTS writeup_contents CASCADE`;
  await sql`DROP TABLE IF EXISTS submissions CASCADE`;
  await sql`DROP TABLE IF EXISTS contributors CASCADE`;
  await sql`DROP TABLE IF EXISTS admins CASCADE`;
  await sql`DROP TYPE IF EXISTS submission_status CASCADE`;
  await sql`DROP TYPE IF EXISTS submission_language CASCADE`;
  await sql`DROP TYPE IF EXISTS submission_type CASCADE`;

  console.log("✅ All MADHU SMRUTI tables and enums dropped");
}

reset()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error("❌ Reset failed:", err);
    process.exit(1);
  });
