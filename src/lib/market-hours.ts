import type { ScheduleEvent } from "@/lib/t212/normalise";

export type SessionState = { open: boolean; nextOpen: string | null };
export type MarketStatus = SessionState & { exchange: string };

// Only the regular session: pre-market, after-hours and overnight trading count as closed.
const OPENS = new Set(["OPEN", "BREAK_END"]);
const SESSION = new Set(["OPEN", "CLOSE", "BREAK_START", "BREAK_END"]);

/** Whether the regular session is open at `now`, or null when the schedule doesn't cover it. */
export function sessionState(events: ScheduleEvent[], now = new Date()): SessionState | null {
  const t = now.getTime();
  const session = events.filter((e) => SESSION.has(e.type));
  const latest = session.findLast((e) => Date.parse(e.at) <= t);
  if (!latest) return null;

  const nextOpen = session.find((e) => e.type === "OPEN" && Date.parse(e.at) > t)?.at ?? null;
  const open = OPENS.has(latest.type);
  if (!open && !nextOpen) return null;
  return { open, nextOpen };
}

/** "London Stock Exchange closed · reopens Mon 08:00", or null while every market is open. */
export function describeMarkets(markets: MarketStatus[], formatTime: (iso: string) => string): string | null {
  const closed = markets.filter((m) => !m.open);
  if (closed.length === 0) return null;
  if (closed.length < markets.length) {
    return markets.map((m) => `${m.exchange} ${m.open ? "open" : "closed"}`).join(" · ");
  }
  const reopens = closed
    .map((m) => m.nextOpen)
    .filter((at): at is string => at !== null)
    .sort((a, b) => Date.parse(a) - Date.parse(b))[0];
  const what = closed.length === 1 ? `${closed[0]!.exchange} closed` : "Markets closed";
  return reopens ? `${what} · reopens ${formatTime(reopens)}` : what;
}
