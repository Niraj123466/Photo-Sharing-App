import { z } from "zod";

const envSchema = z.object({
  DATABASE_URL: z.string().min(1, "DATABASE_URL is required"),
  AUTH_SECRET: z.string().min(32, "AUTH_SECRET must be at least 32 characters"),
  NEXT_PUBLIC_APP_URL: z.string().url().default("http://localhost:3000"),
  R2_ACCOUNT_ID: z.string().min(1, "R2_ACCOUNT_ID is required"),
  R2_ACCESS_KEY_ID: z.string().min(1, "R2_ACCESS_KEY_ID is required"),
  R2_SECRET_ACCESS_KEY: z.string().min(1, "R2_SECRET_ACCESS_KEY is required"),
  R2_BUCKET_NAME: z.string().min(1, "R2_BUCKET_NAME is required"),
  R2_ENDPOINT: z.string().url("R2_ENDPOINT must be a valid URL"),
  MAX_UPLOAD_SIZE: z.coerce.number().default(52428800),
  GALLERY_SESSION_DURATION: z.coerce.number().default(3600),
  SEED_ADMIN_PASSWORD: z.string().default("Admin@demo123"),
  SEED_MEMBER_PASSWORD: z.string().default("Member@demo123"),
  SEED_GALLERY_PIN: z.string().default("482917"),
});

// Validate at module load time — will throw on startup if env is misconfigured
function validateEnv() {
  // Allow skipping validation in CI/build environments
  if (process.env.SKIP_ENV_VALIDATION === "true") {
    return process.env as unknown as z.infer<typeof envSchema>;
  }

  const result = envSchema.safeParse(process.env);
  if (!result.success) {
    console.error("❌ Invalid environment variables:");
    result.error.errors.forEach((err) => {
      console.error(`  ${err.path.join(".")}: ${err.message}`);
    });
    // In production builds we throw; in tests we warn
    if (process.env.NODE_ENV === "production") {
      throw new Error("Invalid environment variables. Check logs above.");
    }
  }
  return result.data ?? (process.env as unknown as z.infer<typeof envSchema>);
}

export const env = validateEnv();
