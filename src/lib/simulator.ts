export type SimulatorInput = {
  currentAge: number;
  targetAge: number;
  goalAmount: number;
  rate: number; // annual %, e.g. 10 for 10%
  lumpSum: number;
};

export type YearPoint = { age: number; value: number; contributed: number };

type SimulatorResult = {
  years: number;
  months: number;
  monthlyContribution: number;
  lumpFutureValue: number;
  goalReachedByLumpSum: boolean;
  series: YearPoint[];
};

export const LIMITS = {
  currentAge: { min: 18, max: 70, step: 1, default: 30 },
  targetAge: { min: 19, max: 90, step: 1, default: 55 },
  goalAmount: { min: 50_000, max: 3_000_000, step: 25_000, default: 1_500_000 },
  rate: { min: 1, max: 14, step: 0.5, default: 10 },
  lumpSum: { min: 0, max: 200_000, step: 1_000, default: 0 },
} as const;

export const DEFAULT_INPUT: SimulatorInput = {
  currentAge: LIMITS.currentAge.default,
  targetAge: LIMITS.targetAge.default,
  goalAmount: LIMITS.goalAmount.default,
  rate: LIMITS.rate.default,
  lumpSum: LIMITS.lumpSum.default,
};

function futureValue(lump: number, pmt: number, monthlyRate: number, months: number): number {
  const growth = Math.pow(1 + monthlyRate, months);
  return lump * growth + pmt * ((growth - 1) / monthlyRate);
}

export function simulate(input: SimulatorInput): SimulatorResult {
  const years = Math.max(1, input.targetAge - input.currentAge);
  const months = years * 12;
  const monthlyRate = input.rate / 100 / 12;

  const lumpFutureValue = input.lumpSum * Math.pow(1 + monthlyRate, months);
  const remaining = input.goalAmount - lumpFutureValue;
  const goalReachedByLumpSum = remaining <= 0;
  const monthlyContribution = goalReachedByLumpSum
    ? 0
    : (remaining * monthlyRate) / (Math.pow(1 + monthlyRate, months) - 1);

  const series: YearPoint[] = [];
  for (let y = 0; y <= years; y++) {
    const m = y * 12;
    series.push({
      age: input.currentAge + y,
      value: futureValue(input.lumpSum, monthlyContribution, monthlyRate, m),
      contributed: input.lumpSum + monthlyContribution * m,
    });
  }

  return { years, months, monthlyContribution, lumpFutureValue, goalReachedByLumpSum, series };
}

export function clampInput(input: SimulatorInput): SimulatorInput {
  const clamp = (v: number, { min, max }: { min: number; max: number }) => Math.min(max, Math.max(min, v));
  const currentAge = clamp(input.currentAge, LIMITS.currentAge);
  return {
    currentAge,
    targetAge: clamp(Math.max(input.targetAge, currentAge + 1), LIMITS.targetAge),
    goalAmount: clamp(input.goalAmount, LIMITS.goalAmount),
    rate: clamp(input.rate, LIMITS.rate),
    lumpSum: clamp(input.lumpSum, LIMITS.lumpSum),
  };
}
