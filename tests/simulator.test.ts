import { describe, expect, test } from "bun:test";
import { DEFAULT_INPUT, clampInput, simulate } from "../src/lib/simulator";

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
    const r = simulate({ currentAge: 20, targetAge: 90, goalAmount: 50_000, rate: 10, lumpSum: 200_000 });
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
    const c = clampInput({ currentAge: 5, targetAge: 200, goalAmount: 1, rate: 50, lumpSum: 1e9 });
    expect(c).toEqual({ currentAge: 18, targetAge: 90, goalAmount: 50_000, rate: 14, lumpSum: 200_000 });
  });
});
