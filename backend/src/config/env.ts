import { z } from "zod";

/**
 * Environment variables validated at startup.
 * The server refuses to boot with an invalid configuration.
 */
const emptyToUndefined = (value: unknown) => (value === "" || value === null ? undefined : value);

// Environment variables validated at startup.
const envSchema = z.object({
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
  PORT: z.coerce.number().int().positive().default(5000),
  CORS_ORIGIN: z.string().default("http://localhost:5173"),

  // Neon PostgreSQL - optional until the database is provisioned
  DATABASE_URL: z.preprocess(emptyToUndefined, z.string().min(1).optional()),

  // Cloudinary - optional until image upload features are implemented
  CLOUDINARY_CLOUD_NAME: z.preprocess(emptyToUndefined, z.string().optional()),
  CLOUDINARY_API_KEY: z.preprocess(emptyToUndefined, z.string().optional()),
  CLOUDINARY_API_SECRET: z.preprocess(emptyToUndefined, z.string().optional()),
});

const parsed = envSchema.safeParse(process.env);

if (!parsed.success) {
   
  console.error("❌ Invalid environment variables:", parsed.error.flatten().fieldErrors);
  process.exit(1);
}

export const env = parsed.data;
