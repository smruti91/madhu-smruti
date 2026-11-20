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

  // ImageKit - optional until image upload features are implemented
  IMAGEKIT_PRIVATE_KEY: z.preprocess(emptyToUndefined, z.string().optional()),
  IMAGEKIT_PUBLIC_KEY: z.preprocess(emptyToUndefined, z.string().optional()),
  IMAGEKIT_URL_ENDPOINT: z.preprocess(emptyToUndefined, z.string().optional()),

  // Painting upload limits (configurable per deployment)
  MAX_PAINTING_IMAGES: z.coerce.number().int().positive().default(12),
  MAX_IMAGE_BYTES: z.coerce.number().int().positive().default(5 * 1024 * 1024),

  // Admin authentication (JWT session cookies).
  // REQUIRED in production - the auth module refuses to issue sessions without it.
  ADMIN_JWT_SECRET: z.preprocess(emptyToUndefined, z.string().min(32).optional()),
});

const parsed = envSchema.safeParse(process.env);

if (!parsed.success) {
   
  console.error("❌ Invalid environment variables:", parsed.error.flatten().fieldErrors);
  process.exit(1);
}

export const env = parsed.data;
