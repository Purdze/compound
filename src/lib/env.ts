import "server-only";
import { z } from "zod";
import { DEV_VERSION } from "@/lib/version";

const base64Key = z.string().refine((v) => Buffer.from(v, "base64").length === 32, {
  message: "must be 32 bytes, base64-encoded (openssl rand -base64 32). Leave it unset to have one generated.",
});

const schema = z.object({
  DATABASE_URL: z.string().min(1, "DATABASE_URL is required"),
  APP_URL: z.string().url("APP_URL must be a full URL, e.g. https://compound.home.lan").optional(),
  APP_VERSION: z.string().default(DEV_VERSION),
  DATA_DIR: z.string().default("/data"),
  ENCRYPTION_KEY: base64Key.optional(),
  SESSION_SECRET: base64Key.optional(),
  T212_BASE_URL: z.string().url().default("https://live.trading212.com/api/v0"),
});

type Env = z.infer<typeof schema>;

let cached: Env | undefined;

// Parsed lazily so `next build` works without runtime secrets present.
export function env(): Env {
  if (cached) return cached;
  const parsed = schema.safeParse(process.env);
  if (!parsed.success) {
    const problems = parsed.error.issues.map((i) => `  ${i.path.join(".")}: ${i.message}`).join("\n");
    throw new Error(`Invalid environment configuration:\n${problems}`);
  }
  cached = parsed.data;
  return cached;
}
