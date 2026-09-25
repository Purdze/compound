import "server-only";
import { db } from "@/lib/db";

export type ApiKeyStatus = { connected: true; createdAt: string; lastUsedAt: string | null } | { connected: false };

/** Connection facts only; never anything derived from the key itself. */
export async function apiKeyStatus(userId: string): Promise<ApiKeyStatus> {
  const key = await db.apiKey.findUnique({ where: { userId }, select: { createdAt: true, lastUsedAt: true } });
  return key
    ? { connected: true, createdAt: key.createdAt.toISOString(), lastUsedAt: key.lastUsedAt?.toISOString() ?? null }
    : { connected: false };
}
