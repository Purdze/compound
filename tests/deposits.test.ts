import { describe, expect, test } from "bun:test";
import {
  annualisedReturn,
  isaAllowance,
  realReturn,
  summariseDeposits,
  taxYearStart,
  transactionLabel,
  valueHistory,
} from "../src/lib/deposits";
import type { CashTransaction } from "../src/lib/t212/normalise";

const tx = (type: string, amount: number, occurredAt: string, currency = "GBP"): CashTransaction => ({
  reference: `${type}-${amount}-${occurredAt}`,
  type,
  amount,
  currency,
  occurredAt,
});

const NOW = new Date("2026-09-15T12:00:00Z");

describe("summariseDeposits", () => {
  test("adds deposits and transfers in, subtracts withdrawals and transfers out, keeps fees apart", () => {
    const s = summariseDeposits(
      [
        tx("DEPOSIT", 500, "2026-07-02T10:00:00Z"),
        tx("TRANSFER", 200, "2026-07-20T10:00:00Z"),
        tx("WITHDRAW", -100, "2026-08-05T10:00:00Z"),
        tx("TRANSFER", -50, "2026-08-06T10:00:00Z"),
        tx("FEE", -1.5, "2026-08-07T10:00:00Z"),
      ],
      "GBP",
      NOW,
    );
    expect(s).toMatchObject({ deposited: 700, withdrawn: 150, netContributed: 550, fees: 1.5, otherCurrencies: 0 });
  });

  test("fills months without deposits up to now and averages the full months", () => {
    const s = summariseDeposits(
      [tx("DEPOSIT", 300, "2026-06-10T00:00:00Z"), tx("DEPOSIT", 600, "2026-08-10T00:00:00Z")],
      "GBP",
      NOW,
    );
    expect(s.monthly).toEqual([
      { month: "2026-06", net: 300 },
      { month: "2026-07", net: 0 },
      { month: "2026-08", net: 600 },
      { month: "2026-09", net: 0 },
    ]);
    expect(s.averageMonthly).toBe(300);
  });

  test("averages only the last 12 full months", () => {
    const s = summariseDeposits(
      [tx("DEPOSIT", 12_000, "2024-01-10T00:00:00Z"), tx("DEPOSIT", 1_200, "2026-03-10T00:00:00Z")],
      "GBP",
      NOW,
    );
    expect(s.averageMonthly).toBe(100);
  });

  test("uses the current month when there are no full months yet", () => {
    const s = summariseDeposits([tx("DEPOSIT", 250, "2026-09-01T00:00:00Z")], "GBP", NOW);
    expect(s.averageMonthly).toBe(250);
  });

  test("leaves out other currencies and handles no history", () => {
    const s = summariseDeposits([tx("DEPOSIT", 100, "2026-09-01T00:00:00Z", "EUR")], "GBP", NOW);
    expect(s).toMatchObject({ deposited: 0, monthly: [], averageMonthly: null, otherCurrencies: 1 });
  });
});

test("realReturn has no percentage when nothing went in", () => {
  expect(realReturn(1_100, 1_000)).toEqual({ amount: 100, pct: 0.1 });
  expect(realReturn(50, 0)).toEqual({ amount: 50, pct: null });
});

test("transactionLabel reads plainly", () => {
  expect(transactionLabel(tx("TRANSFER", 10, "2026-01-01T00:00:00Z"))).toBe("Transfer in");
  expect(transactionLabel(tx("TRANSFER", -10, "2026-01-01T00:00:00Z"))).toBe("Transfer out");
  expect(transactionLabel(tx("WITHDRAW", -10, "2026-01-01T00:00:00Z"))).toBe("Withdrawal");
  expect(transactionLabel(tx("INTEREST_PAID", 1, "2026-01-01T00:00:00Z"))).toBe("Interest paid");
});

describe("annualisedReturn", () => {
  const now = new Date("2026-01-01T00:00:00Z");
  const ago = (years: number) => new Date(now.getTime() - years * 365.25 * 24 * 60 * 60_000).toISOString();

  test("one deposit growing 10% over a year is 10% a year", () => {
    expect(annualisedReturn([tx("DEPOSIT", 1_000, ago(1))], "GBP", 1_100, now)).toBeCloseTo(0.1, 6);
  });

  test("weighs each deposit by how long it was invested", () => {
    // £1,000 two years ago and £1,000 one year ago, worth £2,310 now: 10% a year exactly.
    const deposits = [tx("DEPOSIT", 1_000, ago(2)), tx("DEPOSIT", 1_000, ago(1))];
    expect(annualisedReturn(deposits, "GBP", 2_310, now)).toBeCloseTo(0.1, 6);
  });

  test("counts withdrawals as money back", () => {
    // £1,000 grows to £1,100, £1,100 is withdrawn, and nothing is left.
    const flows = [tx("DEPOSIT", 1_000, ago(1)), tx("WITHDRAW", -1_100, ago(0))];
    expect(annualisedReturn(flows, "GBP", 0, now)).toBeCloseTo(0.1, 6);
  });

  test("waits until the first deposit is a year old, and needs deposits", () => {
    expect(annualisedReturn([tx("DEPOSIT", 100, "2026-06-01T00:00:00Z")], "GBP", 200, NOW)).toBeNull();
    expect(annualisedReturn([], "GBP", 200, NOW)).toBeNull();
  });

  test("gives up rather than report a rate outside the search range", () => {
    expect(annualisedReturn([tx("DEPOSIT", 1, "2024-01-01T00:00:00Z")], "GBP", 1_000_000, NOW)).toBeNull();
  });
});

test("valueHistory pairs each day's value with what had been put in by then", () => {
  const points = valueHistory(
    [
      { day: "2026-09-01", value: 100, currency: "GBP" },
      { day: "2026-09-02", value: 105, currency: "GBP" },
      { day: "2026-09-03", value: 999, currency: "EUR" },
      { day: "2026-09-04", value: 160, currency: "GBP" },
    ],
    [
      tx("DEPOSIT", 100, "2026-09-01T08:00:00Z"),
      tx("FEE", -1, "2026-09-02T08:00:00Z"),
      tx("DEPOSIT", 50, "2026-09-04T23:00:00Z"),
      tx("DEPOSIT", 70, "2026-09-05T08:00:00Z"),
    ],
    "GBP",
  );
  expect(points).toEqual([
    { day: "2026-09-01", value: 100, contributed: 100 },
    { day: "2026-09-02", value: 105, contributed: 100 },
    { day: "2026-09-04", value: 160, contributed: 150 },
  ]);
});

describe("tax year and ISA allowance", () => {
  test("the tax year starts at midnight UK time on 6 April", () => {
    expect(taxYearStart(new Date("2026-04-05T22:59:59Z")).toISOString()).toBe("2025-04-05T23:00:00.000Z");
    expect(taxYearStart(new Date("2026-04-05T23:00:00Z")).toISOString()).toBe("2026-04-05T23:00:00.000Z");
    expect(taxYearStart(new Date("2027-01-15T12:00:00Z")).toISOString()).toBe("2026-04-05T23:00:00.000Z");
  });

  test("counts deposits minus withdrawals this tax year, never below zero", () => {
    const now = new Date("2026-09-26T12:00:00Z");
    const a = isaAllowance(
      [
        tx("DEPOSIT", 5_000, "2026-03-01T10:00:00Z"),
        tx("DEPOSIT", 3_000, "2026-05-01T10:00:00Z"),
        tx("WITHDRAW", -500, "2026-06-01T10:00:00Z"),
        tx("TRANSFER", 1_000, "2026-07-01T10:00:00Z"),
        tx("DEPOSIT", 999, "2026-07-01T10:00:00Z", "EUR"),
      ],
      now,
    );
    expect(a).toEqual({ startDay: "2026-04-06", used: 2_500, remaining: 17_500, transfersIn: 1_000 });
    expect(isaAllowance([tx("WITHDRAW", -500, "2026-06-01T10:00:00Z")], now).used).toBe(0);
  });

  test("nothing left once the allowance is used", () => {
    const a = isaAllowance([tx("DEPOSIT", 21_000, "2026-05-01T10:00:00Z")], new Date("2026-09-26T12:00:00Z"));
    expect(a).toMatchObject({ used: 21_000, remaining: 0 });
  });
});
