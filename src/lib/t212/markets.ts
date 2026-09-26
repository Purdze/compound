import "server-only";
import { TtlCache } from "@/lib/cache";
import { sessionState, type MarketStatus } from "@/lib/market-hours";
import { loadUserCredentials, parseResponse, t212Get } from "./client";
import { normaliseExchanges, normaliseInstrumentSchedules, type Schedule } from "./normalise";

const HOUR = 60 * 60_000;
// Null means unavailable, usually a key without the optional Metadata permission.
const retryAfterFailure = (value: unknown) => (value === null ? HOUR : undefined);
const instrumentCache = new TtlCache<Map<string, number> | null>(24 * HOUR);
const exchangeCache = new TtlCache<Map<number, Schedule> | null>(6 * HOUR);

function loadInBackground<T>(
  cache: TtlCache<T | null>,
  userId: string,
  path: string,
  parse: (raw: unknown) => T,
): T | null | undefined {
  const cached = cache.peek(userId);
  if (cached === undefined) {
    const load = async () => {
      try {
        const creds = await loadUserCredentials(userId);
        if (!creds) return null;
        const raw = await t212Get<unknown>(creds, path, userId);
        return parseResponse(() => parse(raw));
      } catch {
        return null;
      }
    };
    void cache.get(userId, load, retryAfterFailure);
  }
  return cached;
}

/**
 * The regular session state of each exchange the given tickers trade on. Never waits on
 * Trading 212: returns null until the schedules have loaded, or if they can't be.
 */
export function marketStatus(userId: string, tickers: string[], now = new Date()): MarketStatus[] | null {
  const instruments = loadInBackground(
    instrumentCache,
    userId,
    "/equity/metadata/instruments",
    normaliseInstrumentSchedules,
  );
  const schedules = loadInBackground(exchangeCache, userId, "/equity/metadata/exchanges", normaliseExchanges);
  if (!instruments || !schedules) return null;

  const byExchange = new Map<string, MarketStatus>();
  for (const ticker of tickers) {
    const scheduleId = instruments.get(ticker);
    const schedule = scheduleId === undefined ? undefined : schedules.get(scheduleId);
    if (!schedule || byExchange.has(schedule.exchange)) continue;
    const state = sessionState(schedule.events, now);
    if (state) byExchange.set(schedule.exchange, { exchange: schedule.exchange, ...state });
  }
  return [...byExchange.values()];
}
