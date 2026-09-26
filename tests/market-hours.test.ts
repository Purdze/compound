import { expect, test } from "bun:test";
import { describeMarkets, sessionState } from "../src/lib/market-hours";

// London: Friday 26 Sept and Monday 29 Sept 2026, with a lunch break on Friday for the test.
const events = [
  { at: "2026-09-26T07:00:00Z", type: "PRE_MARKET_OPEN" },
  { at: "2026-09-26T07:00:00Z", type: "OPEN" },
  { at: "2026-09-26T11:00:00Z", type: "BREAK_START" },
  { at: "2026-09-26T11:30:00Z", type: "BREAK_END" },
  { at: "2026-09-26T15:30:00Z", type: "CLOSE" },
  { at: "2026-09-26T15:30:00Z", type: "AFTER_HOURS_OPEN" },
  { at: "2026-09-26T19:00:00Z", type: "AFTER_HOURS_CLOSE" },
  { at: "2026-09-29T07:00:00Z", type: "OPEN" },
  { at: "2026-09-29T15:30:00Z", type: "CLOSE" },
];
const at = (iso: string) => sessionState(events, new Date(iso));

test("open during the session, and again after a break", () => {
  expect(at("2026-09-26T09:00:00Z")).toMatchObject({ open: true });
  expect(at("2026-09-26T13:00:00Z")).toMatchObject({ open: true });
});

test("closed during a break", () => {
  expect(at("2026-09-26T11:15:00Z")).toMatchObject({ open: false, nextOpen: "2026-09-29T07:00:00Z" });
});

test("after-hours trading counts as closed, and the weekend points to Monday's open", () => {
  const evening = at("2026-09-26T17:00:00Z");
  expect(evening).toEqual({ open: false, nextOpen: "2026-09-29T07:00:00Z" });
  expect(at("2026-09-27T12:00:00Z")).toEqual(evening);
});

test("unknown outside the schedule it was given", () => {
  expect(at("2026-09-25T12:00:00Z")).toBeNull();
  expect(at("2026-10-01T12:00:00Z")).toBeNull();
  expect(sessionState([], new Date())).toBeNull();
});

test("describeMarkets says nothing while open, and names what's closed", () => {
  const lse = { exchange: "London Stock Exchange", nextOpen: "2026-09-29T07:00:00Z" };
  const nyse = { exchange: "NYSE", nextOpen: "2026-09-28T13:30:00Z" };
  const time = (iso: string) => iso.slice(8, 16);
  expect(describeMarkets([{ ...lse, open: true }], time)).toBeNull();
  expect(describeMarkets([{ ...lse, open: false }], time)).toBe("London Stock Exchange closed · reopens 29T07:00");
  expect(
    describeMarkets(
      [
        { ...lse, open: false },
        { ...nyse, open: false },
      ],
      time,
    ),
  ).toBe("Markets closed · reopens 28T13:30");
  expect(
    describeMarkets(
      [
        { ...lse, open: false },
        { ...nyse, open: true },
      ],
      time,
    ),
  ).toBe("London Stock Exchange closed · NYSE open");
});
