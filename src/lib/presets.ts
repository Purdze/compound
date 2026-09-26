import { ACCOUNTS, MODES, type Account, type SimulatorInput, type SimulatorMode } from "@/lib/simulator";

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
  account: true,
  monthly: true,
  createdAt: true,
} as const;

type PresetRow = Omit<Preset, "rate" | "mode" | "account" | "createdAt"> & {
  rate: { toNumber(): number };
  mode: string;
  account: string;
  createdAt: Date;
};

const isOneOf =
  <T extends string>(options: readonly T[]) =>
  (value: string): value is T =>
    (options as readonly string[]).includes(value);
const isMode = isOneOf<SimulatorMode>(MODES);
const isAccount = isOneOf<Account>(ACCOUNTS);

export function toPreset(row: PresetRow): Preset {
  return {
    ...row,
    rate: row.rate.toNumber(),
    mode: isMode(row.mode) ? row.mode : "monthly",
    account: isAccount(row.account) ? row.account : "general",
    createdAt: row.createdAt.toISOString(),
  };
}
