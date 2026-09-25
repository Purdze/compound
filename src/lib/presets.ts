import type { SimulatorInput } from "@/lib/simulator";

export type Preset = SimulatorInput & { id: string; name: string; createdAt: string };

export const presetSelect = {
  id: true,
  name: true,
  currentAge: true,
  targetAge: true,
  goalAmount: true,
  rate: true,
  lumpSum: true,
  createdAt: true,
} as const;

type PresetRow = Omit<Preset, "rate" | "createdAt"> & { rate: { toNumber(): number }; createdAt: Date };

export function toPreset(row: PresetRow): Preset {
  return { ...row, rate: row.rate.toNumber(), createdAt: row.createdAt.toISOString() };
}
