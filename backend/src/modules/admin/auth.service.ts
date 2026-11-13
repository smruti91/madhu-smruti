import bcrypt from "bcryptjs";
import { eq } from "drizzle-orm";
import { getDb } from "../../config/db";
import { admins } from "../../db/schema";
import { HttpError } from "../../utils/errors";
import { signAdminSession } from "../auth/service";
import type { AdminLoginInput } from "./validator";

/**
 * Verifies credentials and returns the admin together with a signed
 * session token for the HTTP-only cookie.
 */
export async function loginAdmin(input: AdminLoginInput) {
  const db = getDb();

  const email = input.email.toLowerCase().trim();
  const [admin] = await db.select().from(admins).where(eq(admins.email, email));

  // Same error and timing profile whether or not the account exists
  const passwordHash = admin?.passwordHash ?? "";
  const valid = await bcrypt.compare(input.password, passwordHash);

  if (!admin || !valid) {
    throw HttpError.unauthorized("Invalid email or password");
  }

  return {
    admin: { id: admin.id, name: admin.name, email: admin.email },
    sessionToken: signAdminSession({ sub: admin.id, email: admin.email, name: admin.name }),
  };
}
