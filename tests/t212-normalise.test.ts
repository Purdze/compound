import { describe, expect, test } from "bun:test";
import { displayTicker, findVuag, normalisePositions, normaliseSummary } from "../src/lib/t212/normalise";

describe("normalisePositions", () => {
  test("reads the current nested shape", () => {
    const [p] = normalisePositions([
      {
        instrument: { ticker: "VUAGl_EQ", name: "S&P 500 (Acc)", currency: "GBP" },
        quantity: 10,
        currentPrice: 95.5,
        averagePricePaid: 80,
        walletImpact: { currency: "GBP", currentValue: 955, unrealizedProfitLoss: 155 },
      },
    ]);
    expect(p).toMatchObject({
      ticker: "VUAGl_EQ",
      name: "S&P 500 (Acc)",
      value: 955,
      profitLoss: 155,
      averagePrice: 80,
    });
  });

  test("reads the legacy flat shape", () => {
    const [p] = normalisePositions([
      { ticker: "AAPL_US_EQ", quantity: 2, currentPrice: 200, averagePrice: 150, ppl: 80, fxPpl: -5 },
    ]);
    expect(p).toMatchObject({ ticker: "AAPL_US_EQ", value: 400, profitLoss: 75, averagePrice: 150 });
  });

  test("skips unreadable items and sorts by value", () => {
    const out = normalisePositions([
      { ticker: "A_EQ", quantity: 1, currentPrice: 1 },
      { nonsense: true },
      null,
      { ticker: "B_EQ", quantity: 1, currentPrice: 5 },
    ]);
    expect(out.map((p) => p.ticker)).toEqual(["B_EQ", "A_EQ"]);
  });

  test("throws on non-array input", () => {
    expect(() => normalisePositions({})).toThrow();
  });
});

describe("normaliseSummary", () => {
  test("maps account summary fields", () => {
    const s = normaliseSummary({
      currency: "GBP",
      totalValue: 1000,
      cash: { availableToTrade: 100, inPies: 20, reservedForOrders: 5 },
      investments: { currentValue: 875, unrealizedProfitLoss: -12.5 },
    });
    expect(s).toEqual({
      accountCurrency: "GBP",
      totalValue: 1000,
      cash: { available: 100, inPies: 20, reservedForOrders: 5 },
      invested: 875,
      unrealisedProfitLoss: -12.5,
    });
  });

  test("throws without totalValue", () => {
    expect(() => normaliseSummary({ cash: {} })).toThrow();
  });
});

test("findVuag matches the LSE ticker only", () => {
  const base = {
    name: null,
    quantity: 1,
    averagePrice: 1,
    currentPrice: 1,
    instrumentCurrency: null,
    value: 1,
    profitLoss: 0,
  };
  expect(
    findVuag([
      { ...base, ticker: "VUSAl_EQ" },
      { ...base, ticker: "VUAGl_EQ" },
    ])?.ticker,
  ).toBe("VUAGl_EQ");
  expect(findVuag([{ ...base, ticker: "VUAGX_EQ_OTHER" }])).toBeUndefined();
});

test("displayTicker strips exchange and type suffixes", () => {
  expect(displayTicker("VUAGl_EQ")).toBe("VUAG");
  expect(displayTicker("AAPL_US_EQ")).toBe("AAPL");
  expect(displayTicker("BRK_B_US_EQ")).toBe("BRK_B");
});
