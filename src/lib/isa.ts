import type { CashTransaction } from "@/lib/t212/normalise";

// UK Stocks & Shares ISA: new money per tax year. Update if the government changes it.
export const ISA_ALLOWANCE = 20_000;
export const ISA_MONTHLY = ISA_ALLOWANCE / 12;

/** How much of a monthly amount doesn't fit in the ISA allowance. */
export const isaOverflow = (monthly: number) => Math.max(0, monthly - ISA_MONTHLY);

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
