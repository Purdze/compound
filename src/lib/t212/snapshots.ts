import "server-only";
import { db } from "@/lib/db";
import type { Snapshot } from "@/lib/deposits";
import type { Portfolio } from "./normalise";

const utcDay = (d: Date) => new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()));

/** Keeps today's value; a later fetch the same day replaces it. Never fails the caller. */
export async function recordSnapshot(userId: string, portfolio: Portfolio): Promise<void> {
  try {
    const key = await db.apiKey.findUnique({ where: { userId }, select: { id: true } });
    if (!key) return;
    const day = utcDay(new Date(portfolio.fetchedAt));
    const data = { totalValue: portfolio.totalValue, currency: portfolio.accountCurrency };
    await db.valueSnapshot.upsert({
      where: { apiKeyId_day: { apiKeyId: key.id, day } },
      create: { userId, apiKeyId: key.id, day, ...data },
      update: data,
    });
  } catch (err) {
    console.warn("[snapshots] failed to record today's value:", err instanceof Error ? err.message : "unknown");
  }
}

export async function readSnapshots(userId: string): Promise<Snapshot[]> {
  const rows = await db.valueSnapshot.findMany({
    where: { userId },
    orderBy: { day: "asc" },
    select: { day: true, totalValue: true, currency: true },
  });
  return rows.map((r) => ({
    day: r.day.toISOString().slice(0, 10),
    value: Number(r.totalValue),
    currency: r.currency,
  }));
}
