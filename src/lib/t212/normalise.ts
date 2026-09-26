// Pure parsing of Trading 212 responses into Compound's own shapes. Kept free of
// server-only imports so it can be unit-tested directly.

export type Position = {
  ticker: string;
  name: string | null;
  quantity: number;
  averagePrice: number;
  currentPrice: number;
  instrumentCurrency: string | null;
  value: number;
  profitLoss: number;
};

export type Portfolio = {
  fetchedAt: string;
  accountCurrency: string;
  totalValue: number;
  cash: { available: number; inPies: number; reservedForOrders: number };
  invested: number;
  unrealisedProfitLoss: number;
  positions: Position[];
};

type Obj = Record<string, unknown>;

const isObj = (v: unknown): v is Obj => typeof v === "object" && v !== null && !Array.isArray(v);
const num = (v: unknown): number | undefined => (typeof v === "number" && Number.isFinite(v) ? v : undefined);
const str = (v: unknown): string | undefined => (typeof v === "string" && v.length > 0 ? v : undefined);

/**
 * Accepts both the current `/equity/positions` shape (nested `instrument` and `walletImpact`)
 * and the legacy `/equity/portfolio` shape (flat `ticker`, `averagePrice`, `ppl`).
 * Items that can't be read are skipped rather than failing the whole response.
 */
export function normalisePositions(raw: unknown): Position[] {
  if (!Array.isArray(raw)) throw new Error("positions: expected an array");
  const out: Position[] = [];

  for (const item of raw) {
    if (!isObj(item)) continue;
    const instrument = isObj(item.instrument) ? item.instrument : {};
    const wallet = isObj(item.walletImpact) ? item.walletImpact : {};

    const ticker = str(instrument.ticker) ?? str(item.ticker);
    const quantity = num(item.quantity);
    const currentPrice = num(item.currentPrice);
    if (!ticker || quantity === undefined || currentPrice === undefined) continue;

    const averagePrice = num(item.averagePricePaid) ?? num(item.averagePrice) ?? 0;
    const value = num(wallet.currentValue) ?? quantity * currentPrice;
    const legacyPnl = (num(item.ppl) ?? 0) + (num(item.fxPpl) ?? 0);
    const profitLoss = num(wallet.unrealizedProfitLoss) ?? legacyPnl;

    out.push({
      ticker,
      name: str(instrument.name) ?? null,
      quantity,
      averagePrice,
      currentPrice,
      instrumentCurrency: str(instrument.currency) ?? null,
      value,
      profitLoss,
    });
  }

  return out.sort((a, b) => b.value - a.value);
}

export function normaliseSummary(raw: unknown): Omit<Portfolio, "positions" | "fetchedAt"> {
  if (!isObj(raw)) throw new Error("summary: expected an object");
  const cash = isObj(raw.cash) ? raw.cash : {};
  const investments = isObj(raw.investments) ? raw.investments : {};
  const totalValue = num(raw.totalValue);
  if (totalValue === undefined) throw new Error("summary: missing totalValue");

  return {
    accountCurrency: str(raw.currency) ?? "GBP",
    totalValue,
    cash: {
      available: num(cash.availableToTrade) ?? 0,
      inPies: num(cash.inPies) ?? 0,
      reservedForOrders: num(cash.reservedForOrders) ?? 0,
    },
    invested: num(investments.currentValue) ?? 0,
    unrealisedProfitLoss: num(investments.unrealizedProfitLoss) ?? 0,
  };
}

export type CashTransaction = {
  reference: string;
  type: string;
  amount: number;
  currency: string;
  occurredAt: string;
};

export type TransactionPage = { items: CashTransaction[]; nextPath: string | null };

/**
 * `/equity/history/transactions` returns `{ items, nextPagePath }`, newest first. `nextPagePath`
 * includes the `/api/v0` prefix; it's returned without it, and only if it stays on this endpoint.
 */
export function normaliseTransactions(raw: unknown): TransactionPage {
  if (!isObj(raw) || !Array.isArray(raw.items)) throw new Error("transactions: expected { items }");
  const items: CashTransaction[] = [];

  for (const item of raw.items) {
    if (!isObj(item)) continue;
    const reference = str(item.reference);
    const type = str(item.type);
    const amount = num(item.amount);
    const occurredAt = str(item.dateTime);
    if (!reference || !type || amount === undefined || !occurredAt || Number.isNaN(Date.parse(occurredAt))) continue;
    items.push({ reference, type, amount, currency: str(item.currency) ?? "GBP", occurredAt });
  }

  const next = str(raw.nextPagePath)?.replace(/^\/api\/v\d+/, "");
  return { items, nextPath: next?.startsWith("/equity/history/transactions?") ? next : null };
}

export type ScheduleEvent = { at: string; type: string };
export type Schedule = { exchange: string; events: ScheduleEvent[] };

/** `/equity/metadata/instruments` → ticker to working schedule id. */
export function normaliseInstrumentSchedules(raw: unknown): Map<string, number> {
  if (!Array.isArray(raw)) throw new Error("instruments: expected an array");
  const out = new Map<string, number>();
  for (const item of raw) {
    if (!isObj(item)) continue;
    const ticker = str(item.ticker);
    const scheduleId = num(item.workingScheduleId);
    if (ticker && scheduleId !== undefined) out.set(ticker, scheduleId);
  }
  return out;
}

/** `/equity/metadata/exchanges` → working schedule id to its exchange and time events, in time order. */
export function normaliseExchanges(raw: unknown): Map<number, Schedule> {
  if (!Array.isArray(raw)) throw new Error("exchanges: expected an array");
  const out = new Map<number, Schedule>();
  for (const exchange of raw) {
    if (!isObj(exchange) || !Array.isArray(exchange.workingSchedules)) continue;
    const name = str(exchange.name);
    if (!name) continue;
    for (const schedule of exchange.workingSchedules) {
      if (!isObj(schedule) || !Array.isArray(schedule.timeEvents)) continue;
      const id = num(schedule.id);
      if (id === undefined) continue;
      const events = schedule.timeEvents
        .filter(isObj)
        .map((e) => ({ at: str(e.date), type: str(e.type) }))
        .filter((e): e is ScheduleEvent => !!e.at && !!e.type && !Number.isNaN(Date.parse(e.at)))
        .sort((a, b) => Date.parse(a.at) - Date.parse(b.at));
      out.set(id, { exchange: name, events });
    }
  }
  return out;
}

/** VUAG trades on the LSE as e.g. `VUAGl_EQ`. */
export function findVuag(positions: Position[]): Position | undefined {
  return positions.find((p) => /^VUAG[a-z]?_EQ$/i.test(p.ticker));
}

/** `VUAGl_EQ` → `VUAG`, `AAPL_US_EQ` → `AAPL`: drops Trading 212's exchange and type suffixes. */
export function displayTicker(ticker: string): string {
  return ticker.replace(/(_[A-Z]{2})?_EQ$/, "").replace(/[a-z]$/, "");
}
