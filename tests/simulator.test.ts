import { ISA_MONTHLY, isaOverflow } from "../src/lib/isa";
import { describe, expect, test } from "bun:test";
import { DEFAULT_INPUT, LIMITS, clampInput, roundToStep, simulate } from "../src/lib/simulator";

describe("simulate", () => {
  test("defaults: £1.5M in 25 years at 10% needs about £1,130/month", () => {
    const r = simulate(DEFAULT_INPUT);
    expect(r.years).toBe(25);
    expect(r.months).toBe(300);
    // PMT = 1.5M × r / ((1+r)^300 − 1), r = 0.1/12
    const mr = 0.1 / 12;
    const expected = (1_500_000 * mr) / (Math.pow(1 + mr, 300) - 1);
    expect(r.monthlyContribution).toBeCloseTo(expected, 6);
    expect(Math.round(r.monthlyContribution)).toBe(1131);
  });

  test("final projected value equals the goal", () => {
    const r = simulate({ ...DEFAULT_INPUT, lumpSum: 50_000 });
    expect(r.series.at(-1)!.value).toBeCloseTo(1_500_000, 2);
  });

  test("lump sum reduces the monthly figure", () => {
    const none = simulate(DEFAULT_INPUT).monthlyContribution;
    const some = simulate({ ...DEFAULT_INPUT, lumpSum: 100_000 }).monthlyContribution;
    expect(some).toBeLessThan(none);
  });

  test("success state when the lump sum alone reaches the goal", () => {
    const r = simulate({ ...DEFAULT_INPUT, currentAge: 20, targetAge: 90, goalAmount: 50_000, lumpSum: 200_000 });
    expect(r.goalReachedByLumpSum).toBe(true);
    expect(r.monthlyContribution).toBe(0);
  });

  test("series has one point per year including the start", () => {
    const r = simulate({ ...DEFAULT_INPUT, currentAge: 40, targetAge: 50 });
    expect(r.series).toHaveLength(11);
    expect(r.series[0]).toEqual({ age: 40, value: 0, contributed: 0 });
  });
});

describe("clampInput", () => {
  test("keeps target age above current age", () => {
    expect(clampInput({ ...DEFAULT_INPUT, currentAge: 60, targetAge: 55 }).targetAge).toBe(61);
  });
  test("clamps into slider ranges", () => {
    const c = clampInput({
      mode: "value",
      account: "isa",
      currentAge: 5,
      targetAge: 200,
      goalAmount: 1,
      rate: 50,
      lumpSum: 1e9,
      monthly: -5,
    });
    expect(c).toEqual({
      mode: "value",
      account: "isa",
      currentAge: 18,
      targetAge: 90,
      goalAmount: 50_000,
      rate: 14,
      lumpSum: 200_000,
      monthly: 0,
    });
  });
});

describe("final value mode", () => {
  test("grows the lump sum and monthly amount to the target age", () => {
    const mr = 0.1 / 12;
    const growth = Math.pow(1 + mr, 300);
    const r = simulate({ ...DEFAULT_INPUT, mode: "value", monthly: 500, lumpSum: 10_000 });
    expect(r.monthlyContribution).toBe(500);
    expect(r.finalValue).toBeCloseTo(10_000 * growth + (500 * (growth - 1)) / mr, 4);
    expect(r.series.at(-1)!.age).toBe(55);
  });

  test("with nothing monthly, only the lump sum grows", () => {
    const r = simulate({ ...DEFAULT_INPUT, mode: "value", monthly: 0, lumpSum: 1_000 });
    expect(r.finalValue).toBeCloseTo(r.lumpFutureValue, 6);
  });

  test("the monthly mode's answer grows to exactly the goal", () => {
    const needed = simulate(DEFAULT_INPUT).monthlyContribution;
    expect(simulate({ ...DEFAULT_INPUT, mode: "value", monthly: needed }).finalValue).toBeCloseTo(1_500_000, 2);
  });
});

describe("target age mode", () => {
  test("the monthly mode's answer reaches the goal at the target age", () => {
    const needed = simulate(DEFAULT_INPUT).monthlyContribution;
    const r = simulate({ ...DEFAULT_INPUT, mode: "age", monthly: needed + 0.01 });
    expect(r.reachAge).toBe(55);
    expect(r.finalValue).toBeGreaterThanOrEqual(1_500_000);
    expect(r.series.at(-1)!.age).toBe(55);
  });

  test("investing less takes longer", () => {
    expect(simulate({ ...DEFAULT_INPUT, mode: "age", monthly: 500 }).reachAge).toBeGreaterThan(55);
  });

  test("null when not reached by 90, with the chart running to 90", () => {
    const r = simulate({ ...DEFAULT_INPUT, mode: "age", monthly: 0, rate: 1 });
    expect(r.reachAge).toBeNull();
    expect(r.series.at(-1)!.age).toBe(90);
  });

  test("the current age when the lump sum already covers the goal", () => {
    const r = simulate({ ...DEFAULT_INPUT, mode: "age", goalAmount: 50_000, lumpSum: 100_000 });
    expect(r.reachAge).toBe(30);
    expect(r.goalReachedByLumpSum).toBe(true);
  });
});

test("roundToStep lands on the nearest slider step", () => {
  expect(roundToStep(15, LIMITS.monthly)).toBe(25);
  expect(roundToStep(449, LIMITS.monthly)).toBe(450);
  expect(roundToStep(15_030, LIMITS.lumpSum)).toBe(15_000);
});

test("isaOverflow is what doesn't fit in the £20,000 yearly allowance", () => {
  expect(ISA_MONTHLY).toBeCloseTo(1_666.67, 2);
  expect(isaOverflow(1_000)).toBe(0);
  expect(isaOverflow(ISA_MONTHLY)).toBe(0);
  expect(isaOverflow(2_500)).toBeCloseTo(833.33, 2);
});
