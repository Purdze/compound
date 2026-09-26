import { MODES, type SimulatorInput, type SimulatorMode } from "@/lib/simulator";

export type Preset = SimulatorInput & { id: string; name: string; createdAt: string };

export const presetSelect = {
  id: true,
  name: true,
  currentAge: true,
  targetAge: true,
  goalAmount: true,
  rate: true,
  lumpSum: true,
  mode: true,
  monthly: true,
  createdAt: true,
} as const;

type PresetRow = Omit<Preset, "rate" | "mode" | "createdAt"> & {
  rate: { toNumber(): number };
  mode: string;
  createdAt: Date;
};

const isMode = (mode: string): mode is SimulatorMode => (MODES as readonly string[]).includes(mode);

export function toPreset(row: PresetRow): Preset {
  return {
    ...row,
    rate: row.rate.toNumber(),
    mode: isMode(row.mode) ? row.mode : "monthly",
    createdAt: row.createdAt.toISOString(),
  };
}
