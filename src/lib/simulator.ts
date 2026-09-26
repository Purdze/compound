/** Which number the simulator works out; the rest are inputs. */
export const MODES = ["monthly", "value", "age"] as const;
export type SimulatorMode = (typeof MODES)[number];

export const MODE_LABELS: Record<SimulatorMode, string> = {
  monthly: "Monthly",
  value: "Final value",
  age: "Target age",
};

export type SimulatorInput = {
  mode: SimulatorMode;
  currentAge: number;
  targetAge: number;
  goalAmount: number;
  rate: number; // annual %, e.g. 10 for 10%
  lumpSum: number;
  monthly: number;
};

export type YearPoint = { age: number; value: number; contributed: number };

export type SimulatorResult = {
  years: number;
  months: number;
  monthlyContribution: number;
  lumpFutureValue: number;
  goalReachedByLumpSum: boolean;
  /** Value at the end of the series: the target age, or the age the goal is reached. */
  finalValue: number;
  /** Age mode only: the first whole age at which the goal is reached, or null if not by the last age allowed. */
  reachAge: number | null;
  series: YearPoint[];
};

export const LIMITS = {
  currentAge: { min: 18, max: 70, step: 1, default: 30 },
  targetAge: { min: 19, max: 90, step: 1, default: 55 },
  goalAmount: { min: 50_000, max: 3_000_000, step: 25_000, default: 1_500_000 },
  rate: { min: 1, max: 14, step: 0.5, default: 10 },
  lumpSum: { min: 0, max: 200_000, step: 1_000, default: 0 },
  monthly: { min: 0, max: 10_000, step: 25, default: 500 },
} as const;

export const DEFAULT_INPUT: SimulatorInput = {
  mode: "monthly",
  currentAge: LIMITS.currentAge.default,
  targetAge: LIMITS.targetAge.default,
  goalAmount: LIMITS.goalAmount.default,
  rate: LIMITS.rate.default,
  lumpSum: LIMITS.lumpSum.default,
  monthly: LIMITS.monthly.default,
};

function futureValue(lump: number, pmt: number, monthlyRate: number, months: number): number {
  const growth = Math.pow(1 + monthlyRate, months);
  return lump * growth + pmt * ((growth - 1) / monthlyRate);
}

/** The monthly amount that grows `lump` to `goal` over `months`; 0 if the lump sum gets there alone. */
function requiredMonthly(goal: number, lump: number, monthlyRate: number, months: number): number {
  const remaining = goal - lump * Math.pow(1 + monthlyRate, months);
  return remaining <= 0 ? 0 : (remaining * monthlyRate) / (Math.pow(1 + monthlyRate, months) - 1);
}

/** Months until `lump` plus `pmt` a month reaches `goal`, or null if not within `maxMonths`. */
function monthsToReach(goal: number, lump: number, pmt: number, monthlyRate: number, maxMonths: number): number | null {
  for (let m = 0; m <= maxMonths; m++) {
    if (futureValue(lump, pmt, monthlyRate, m) >= goal) return m;
  }
  return null;
}

export function simulate(input: SimulatorInput): SimulatorResult {
  const monthlyRate = input.rate / 100 / 12;
  const lastAge = LIMITS.targetAge.max;

  let endAge = input.targetAge;
  let reachAge: number | null = null;
  let monthlyContribution = input.monthly;
  if (input.mode === "age") {
    const months = monthsToReach(
      input.goalAmount,
      input.lumpSum,
      input.monthly,
      monthlyRate,
      (lastAge - input.currentAge) * 12,
    );
    reachAge = months === null ? null : input.currentAge + Math.ceil(months / 12);
    endAge = reachAge ?? lastAge;
  }

  const years = Math.max(1, endAge - input.currentAge);
  const months = years * 12;
  if (input.mode === "monthly") {
    monthlyContribution = requiredMonthly(input.goalAmount, input.lumpSum, monthlyRate, months);
  }

  const lumpFutureValue = input.lumpSum * Math.pow(1 + monthlyRate, months);
  const series: YearPoint[] = [];
  for (let y = 0; y <= years; y++) {
    const m = y * 12;
    series.push({
      age: input.currentAge + y,
      value: futureValue(input.lumpSum, monthlyContribution, monthlyRate, m),
      contributed: input.lumpSum + monthlyContribution * m,
    });
  }

  return {
    years,
    months,
    monthlyContribution,
    lumpFutureValue,
    goalReachedByLumpSum: lumpFutureValue >= input.goalAmount,
    finalValue: series.at(-1)!.value,
    reachAge,
    series,
  };
}

export const roundToStep = (value: number, { step }: { step: number }) => Math.round(value / step) * step;

export function clampInput(input: SimulatorInput): SimulatorInput {
  const clamp = (v: number, { min, max }: { min: number; max: number }) => Math.min(max, Math.max(min, v));
  const currentAge = clamp(input.currentAge, LIMITS.currentAge);
  return {
    mode: input.mode,
    currentAge,
    targetAge: clamp(Math.max(input.targetAge, currentAge + 1), LIMITS.targetAge),
    goalAmount: clamp(input.goalAmount, LIMITS.goalAmount),
    rate: clamp(input.rate, LIMITS.rate),
    lumpSum: clamp(input.lumpSum, LIMITS.lumpSum),
    monthly: clamp(input.monthly, LIMITS.monthly),
  };
}
