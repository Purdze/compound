import "server-only";
import { TtlCache } from "@/lib/cache";
import {
  asT212Error,
  type T212Credentials,
  type T212ErrorCode,
  loadUserCredentials,
  parseResponse,
  t212Get,
} from "./client";
import { findVuag, normalisePositions, normaliseSummary, type Portfolio } from "./normalise";
import { recordSnapshot } from "./snapshots";

export type PortfolioResult =
  | { status: "ok"; portfolio: Portfolio }
  | { status: "no-key" }
  | { status: "error"; code: T212ErrorCode; message: string };

export type VuagPrice = { price: number; currency: string | null; asOf: string };

const TTL_MS = 60_000;

// Outcomes (including errors) are cached per user for 60s so a failing key or a
// Trading 212 outage doesn't turn every page view into another upstream call.
const portfolioCache = new TtlCache<PortfolioResult>(TTL_MS);

function toErrorResult(err: unknown): PortfolioResult {
  const e = asT212Error(err);
  return { status: "error", code: e.code, message: e.message };
}

async function fetchPortfolio(creds: T212Credentials, userId: string): Promise<Portfolio> {
  const [summaryRaw, positionsRaw] = await Promise.all([
    t212Get<unknown>(creds, "/equity/account/summary", userId),
    t212Get<unknown>(creds, "/equity/positions", userId),
  ]);
  return parseResponse(() => ({
    ...normaliseSummary(summaryRaw),
    positions: normalisePositions(positionsRaw),
    fetchedAt: new Date().toISOString(),
  }));
}

export function getPortfolio(userId: string): Promise<PortfolioResult> {
  return portfolioCache.get(userId, async () => {
    try {
      const creds = await loadUserCredentials(userId);
      if (!creds) return { status: "no-key" };
      const portfolio = await fetchPortfolio(creds, userId);
      await recordSnapshot(userId, portfolio);
      return { status: "ok", portfolio };
    } catch (err) {
      return toErrorResult(err);
    }
  });
}

export function invalidatePortfolio(userId: string): void {
  portfolioCache.delete(userId);
}

/** When the cached portfolio expires and the next read fetches fresh data. */
export function nextPortfolioRefresh(userId: string): { at: number; inMs: number } {
  const now = Date.now();
  const at = portfolioCache.expiresAt(userId) ?? now;
  return { at, inMs: Math.max(0, at - now) };
}

// Trading 212 allows one account summary call per 5s, so a manual refresh within
// this long of the last fetch just re-shows the cached result.
const MIN_MANUAL_REFRESH_MS = 10_000;

export function requestPortfolioRefresh(userId: string): void {
  if (nextPortfolioRefresh(userId).inMs <= TTL_MS - MIN_MANUAL_REFRESH_MS) invalidatePortfolio(userId);
}

/** VUAG's price from the owner's own holdings; null if it isn't held or the portfolio can't load. */
export async function getVuagPrice(userId: string): Promise<VuagPrice | null> {
  const result = await getPortfolio(userId);
  if (result.status !== "ok") return null;
  const vuag = findVuag(result.portfolio.positions);
  return vuag
    ? { price: vuag.currentPrice, currency: vuag.instrumentCurrency, asOf: result.portfolio.fetchedAt }
    : null;
}
