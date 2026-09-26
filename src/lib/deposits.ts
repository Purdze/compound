import { ISA_ALLOWANCE } from "@/lib/simulator";
import type { CashTransaction } from "@/lib/t212/normalise";

export type MonthTotal = { month: string; net: number };

export type DepositSummary = {
  currency: string;
  deposited: number;
  withdrawn: number;
  netContributed: number;
  fees: number;
  monthly: MonthTotal[];
  /** Net deposited per month over the last 12 full months (fewer if the history is shorter). */
  averageMonthly: number | null;
  otherCurrencies: number;
};

export type Snapshot = { day: string; value: number; currency: string };

export type ValuePoint = { day: string; value: number; contributed: number };

const CONTRIBUTIONS = new Set(["DEPOSIT", "WITHDRAW", "TRANSFER"]);
const AVERAGE_MONTHS = 12;
const YEAR_MS = 365.25 * 24 * 60 * 60_000;

/** Deposits (positive) and withdrawals (negative) in `currency`, in date order. */
const contributions = (transactions: CashTransaction[], currency: string) =>
  transactions
    .filter((t) => t.currency === currency && CONTRIBUTIONS.has(t.type))
    .toSorted((a, b) => a.occurredAt.localeCompare(b.occurredAt));

const monthKey = (d: Date) => `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, "0")}`;

function monthsBetween(from: string, to: string): string[] {
  const out: string[] = [];
  const [y, m] = from.split("-").map(Number) as [number, number];
  for (let d = new Date(Date.UTC(y, m - 1)); monthKey(d) <= to; d.setUTCMonth(d.getUTCMonth() + 1)) {
    out.push(monthKey(d));
  }
  return out;
}

export function transactionLabel(t: CashTransaction): string {
  switch (t.type) {
    case "DEPOSIT":
      return "Deposit";
    case "WITHDRAW":
      return "Withdrawal";
    case "TRANSFER":
      return t.amount < 0 ? "Transfer out" : "Transfer in";
    case "FEE":
      return "Fee";
    default:
      return t.type.charAt(0) + t.type.slice(1).toLowerCase().replaceAll("_", " ");
  }
}

/** Totals in `currency`, the account's currency; transactions in any other are counted but left out. */
export function summariseDeposits(transactions: CashTransaction[], currency: string, now = new Date()): DepositSummary {
  const own = transactions.filter((t) => t.currency === currency);
  let deposited = 0;
  let withdrawn = 0;
  let fees = 0;
  const byMonth = new Map<string, number>();

  for (const t of own) if (t.type === "FEE") fees += Math.abs(t.amount);
  for (const t of contributions(own, currency)) {
    if (t.amount >= 0) deposited += t.amount;
    else withdrawn -= t.amount;
    const month = monthKey(new Date(t.occurredAt));
    byMonth.set(month, (byMonth.get(month) ?? 0) + t.amount);
  }

  const current = monthKey(now);
  const first = [...byMonth.keys()].sort()[0];
  const monthly = first ? monthsBetween(first, current).map((month) => ({ month, net: byMonth.get(month) ?? 0 })) : [];

  const full = monthly.slice(0, -1).slice(-AVERAGE_MONTHS);
  const window = full.length > 0 ? full : monthly;
  const averageMonthly = window.length > 0 ? window.reduce((sum, m) => sum + m.net, 0) / window.length : null;

  return {
    currency,
    deposited,
    withdrawn,
    netContributed: deposited - withdrawn,
    fees,
    monthly,
    averageMonthly,
    otherCurrencies: transactions.length - own.length,
  };
}

/** Portfolio value minus net deposits; the percentage is null when nothing has gone in. */
export function realReturn(totalValue: number, netContributed: number): { amount: number; pct: number | null } {
  const amount = totalValue - netContributed;
  return { amount, pct: netContributed > 0 ? amount / netContributed : null };
}

/**
 * The yearly rate that turns the dated deposits and withdrawals into today's value (XIRR),
 * found by bisection. Null until the first deposit is a year old: annualising a shorter
 * stretch exaggerates wildly.
 */
export function annualisedReturn(
  transactions: CashTransaction[],
  currency: string,
  totalValue: number,
  now = new Date(),
): number | null {
  const flows = contributions(transactions, currency).map((t) => ({
    years: (now.getTime() - Date.parse(t.occurredAt)) / YEAR_MS,
    amount: -t.amount,
  }));
  if (flows.length === 0 || flows[0]!.years < 1) return null;
  flows.push({ years: 0, amount: totalValue });

  // Value of every flow carried forward to today at `rate`.
  const futureValue = (rate: number) => flows.reduce((sum, f) => sum + f.amount * Math.pow(1 + rate, f.years), 0);
  let low = -0.99;
  let high = 10;
  if (Math.sign(futureValue(low)) === Math.sign(futureValue(high))) return null;
  for (let i = 0; i < 200 && high - low > 1e-9; i++) {
    const mid = (low + high) / 2;
    if (Math.sign(futureValue(mid)) === Math.sign(futureValue(low))) low = mid;
    else high = mid;
  }
  return (low + high) / 2;
}

/** For each recorded day, the value then and the net amount deposited by the end of that day. */
export function valueHistory(snapshots: Snapshot[], transactions: CashTransaction[], currency: string): ValuePoint[] {
  const flows = contributions(transactions, currency);
  let i = 0;
  let contributed = 0;
  return snapshots
    .filter((s) => s.currency === currency)
    .map(({ day, value }) => {
      for (; i < flows.length && flows[i]!.occurredAt.slice(0, 10) <= day; i++) contributed += flows[i]!.amount;
      return { day, value, contributed };
    });
}

/**
 * 6 April 00:00 UK time starting the tax year `now` is in. British Summer Time has always
 * begun by then, so it's 23:00 UTC on 5 April.
 */
export function taxYearStart(now = new Date()): Date {
  const startOf = (year: number) => new Date(Date.UTC(year, 3, 5, 23));
  const thisYear = startOf(now.getUTCFullYear());
  return now >= thisYear ? thisYear : startOf(now.getUTCFullYear() - 1);
}

/** `startDay` is the tax year's first day, e.g. "2026-04-06". */
export type IsaAllowance = { startDay: string; used: number; remaining: number; transfersIn: number };

/**
 * ISA allowance used this tax year: deposits minus withdrawals, since Trading 212's ISA is
 * flexible. Transfers in are reported apart, as only some of them use allowance.
 */
export function isaAllowance(transactions: CashTransaction[], now = new Date()): IsaAllowance {
  const start = taxYearStart(now);
  const thisYear = transactions.filter((t) => t.currency === "GBP" && Date.parse(t.occurredAt) >= start.getTime());
  const sum = (keep: (t: CashTransaction) => boolean) =>
    thisYear.filter(keep).reduce((total, t) => total + t.amount, 0);
  const used = Math.max(
    0,
    sum((t) => t.type === "DEPOSIT" || t.type === "WITHDRAW"),
  );
  const transfersIn = sum((t) => t.type === "TRANSFER" && t.amount > 0);
  return {
    startDay: `${start.getUTCFullYear()}-04-06`,
    used,
    remaining: Math.max(0, ISA_ALLOWANCE - used),
    transfersIn,
  };
}
