import "dotenv/config";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { getDb } from "../src/config/db";

/**
 * One-off helper: applies a drizzle SQL migration over the WebSocket Neon
 * driver (drizzle-kit migrate needs direct TCP, which is not always
 * reachable). Usage: npx tsx scripts/apply-migration.ts <migration-file>
 */
const file = process.argv[2];
if (!file) {
  console.error("Usage: npx tsx scripts/apply-migration.ts <drizzle/xxxx_file.sql>");
  process.exit(1);
}

const sql = readFileSync(resolve(process.cwd(), file), "utf8");
const statements = sql
  .split("--> statement-breakpoint")
  .map((s) => s.trim())
  .filter(Boolean);

async function main() {
  const db = getDb();
  for (const statement of statements) {
    await db.execute(statement as never);
    console.log(`✔ ${statement.slice(0, 80)}...`);
  }
  console.log("Migration applied:", file);
}

main()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error("Migration failed:", err);
    process.exit(1);
  });
