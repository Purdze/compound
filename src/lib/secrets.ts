import "server-only";
import { randomBytes } from "node:crypto";
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { env } from "@/lib/env";

type Secrets = { encryptionKey: string; sessionSecret: string };

const FILE = "secrets.json";

const generate = () => randomBytes(32).toString("base64");

/**
 * Reads `<dir>/secrets.json`, creating it (mode 0600) on first run. Values in
 * `overrides` win. A corrupt file is an error rather than a reason to regenerate:
 * a new encryption key would make every stored Trading 212 key unreadable.
 */
export function loadSecrets(dir: string, overrides: Partial<Secrets> = {}): Secrets {
  const path = join(dir, FILE);
  let stored: Secrets;
  try {
    stored = JSON.parse(readFileSync(path, "utf8")) as Secrets;
  } catch (err) {
    if ((err as NodeJS.ErrnoException).code !== "ENOENT") {
      throw new Error(`${path} exists but can't be read. Restore it from a backup rather than deleting it.`);
    }
    stored = { encryptionKey: generate(), sessionSecret: generate() };
    mkdirSync(dir, { recursive: true });
    writeFileSync(path, JSON.stringify(stored, null, 2), { mode: 0o600, flag: "wx" });
  }
  if (!stored.encryptionKey || !stored.sessionSecret) throw new Error(`${path} is missing a value.`);
  return {
    encryptionKey: overrides.encryptionKey ?? stored.encryptionKey,
    sessionSecret: overrides.sessionSecret ?? stored.sessionSecret,
  };
}

let cached: Secrets | undefined;

export function secrets(): Secrets {
  if (cached) return cached;
  const e = env();
  cached = loadSecrets(e.DATA_DIR, { encryptionKey: e.ENCRYPTION_KEY, sessionSecret: e.SESSION_SECRET });
  return cached;
}
