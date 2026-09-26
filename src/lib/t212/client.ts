import "server-only";
import { db } from "@/lib/db";
import { env } from "@/lib/env";
import { open, seal } from "@/lib/crypto";
import { secrets } from "@/lib/secrets";

export type T212Credentials = { key: string; secret: string };

export type T212ErrorCode = "BAD_KEY" | "RATE_LIMITED" | "UNAVAILABLE" | "BAD_RESPONSE" | "KEY_UNREADABLE";

const MESSAGES: Record<T212ErrorCode, string> = {
  BAD_KEY:
    "Trading 212 rejected this key. It may have been revoked or be missing the Account data and Portfolio permissions. Generate a new read-only key and replace it in Settings.",
  RATE_LIMITED: "Trading 212 is limiting requests right now. Your data will refresh on its own in about a minute.",
  UNAVAILABLE: "Couldn't reach Trading 212. It may be down. Try again in a few minutes.",
  BAD_RESPONSE: "Trading 212 sent back data Compound couldn't read. Try again shortly.",
  KEY_UNREADABLE:
    "Your saved key can't be decrypted because the server's encryption key has changed. Remove it and add it again in Settings.",
};

/** Error safe to show to users and to log: carries a code and fixed message, never request details. */
export class T212Error extends Error {
  constructor(
    public code: T212ErrorCode,
    public status?: number,
  ) {
    super(MESSAGES[code]);
    this.name = "T212Error";
  }
}

const TIMEOUT_MS = 10_000;

/** Classifies a Trading 212 HTTP status; null means success. 0 is our marker for no response. */
export function failureForStatus(status: number): "BAD_KEY" | "RATE_LIMITED" | "UNAVAILABLE" | null {
  if (status >= 200 && status < 300) return null;
  if (status === 401 || status === 403) return "BAD_KEY";
  if (status === 429) return "RATE_LIMITED";
  return "UNAVAILABLE";
}

/**
 * Calls a Trading 212 GET endpoint. Every call is recorded in ApiKeyUsageLog
 * (endpoint + status only) and bumps the key's lastUsedAt.
 */
export async function t212Get<T>(creds: T212Credentials, path: string, userId: string): Promise<T> {
  const url = `${env().T212_BASE_URL}${path}`;
  const authorization = `Basic ${Buffer.from(`${creds.key}:${creds.secret}`).toString("base64")}`;

  let res: Response;
  try {
    res = await fetch(url, {
      headers: { Authorization: authorization, Accept: "application/json" },
      cache: "no-store",
      signal: AbortSignal.timeout(TIMEOUT_MS),
    });
  } catch {
    void audit(userId, path, 0, false);
    console.warn(`[t212] ${path} network error or timeout`);
    throw new T212Error("UNAVAILABLE");
  }

  void audit(userId, path, res.status, res.ok);

  const failure = failureForStatus(res.status);
  if (failure) {
    if (failure === "UNAVAILABLE") console.warn(`[t212] ${path} responded ${res.status}`);
    throw new T212Error(failure, res.status);
  }

  try {
    return (await res.json()) as T;
  } catch {
    throw new T212Error("BAD_RESPONSE", res.status);
  }
}

/** Any failure as a T212Error, so only fixed messages reach users and logs. */
export function asT212Error(err: unknown): T212Error {
  return err instanceof T212Error ? err : new T212Error("BAD_RESPONSE");
}

/** Runs a parser over a Trading 212 response, turning a shape it can't read into BAD_RESPONSE. */
export function parseResponse<T>(parse: () => T): T {
  try {
    return parse();
  } catch (err) {
    console.warn("[t212] unexpected response shape:", err instanceof Error ? err.message : "unknown");
    throw new T212Error("BAD_RESPONSE");
  }
}

async function audit(userId: string, endpoint: string, status: number, ok: boolean) {
  try {
    await db.apiKeyUsageLog.create({ data: { userId, endpoint, status } });
    if (ok) await db.apiKey.updateMany({ where: { userId }, data: { lastUsedAt: new Date() } });
  } catch (err) {
    console.warn("[t212] failed to write usage log:", err instanceof Error ? err.message : "unknown");
  }
}

// The only place key material is encrypted or decrypted. Plaintext never leaves this module
// except as the argument to t212Get.

export async function storeUserCredentials(userId: string, creds: T212Credentials): Promise<void> {
  const sealed = seal(JSON.stringify(creds), userId, secrets().encryptionKey);
  const data = { encryptedKey: new Uint8Array(sealed.ciphertext), iv: new Uint8Array(sealed.iv) };
  await db.apiKey.upsert({
    where: { userId },
    create: { userId, ...data },
    // A new key may belong to a different account, so its histories start again.
    update: {
      ...data,
      createdAt: new Date(),
      lastUsedAt: null,
      transactionsSyncedAt: null,
      transactionsError: null,
      cashTransactions: { deleteMany: {} },
      valueSnapshots: { deleteMany: {} },
    },
  });
}

export async function loadUserCredentials(userId: string): Promise<T212Credentials | null> {
  const row = await db.apiKey.findUnique({ where: { userId }, select: { encryptedKey: true, iv: true } });
  if (!row) return null;
  try {
    const plain = open(
      { ciphertext: Buffer.from(row.encryptedKey), iv: Buffer.from(row.iv) },
      userId,
      secrets().encryptionKey,
    );
    const parsed = JSON.parse(plain) as Partial<T212Credentials>;
    if (typeof parsed.key !== "string" || typeof parsed.secret !== "string") throw new Error("shape");
    return { key: parsed.key, secret: parsed.secret };
  } catch {
    throw new T212Error("KEY_UNREADABLE");
  }
}
