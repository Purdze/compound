import { Simulator } from "@/components/Simulator";
import { apiKeyStatus } from "@/lib/api-key-status";
import { requireOwner } from "@/lib/auth";
import { db } from "@/lib/db";
import { summariseDeposits } from "@/lib/deposits";
import { presetSelect, toPreset } from "@/lib/presets";
import { depositHistory } from "@/lib/t212/transactions";

export const dynamic = "force-dynamic";

export default async function SimulatorPage() {
  const { id: userId } = await requireOwner();
  const [key, presets, history] = await Promise.all([
    apiKeyStatus(userId),
    db.calculatorPreset.findMany({ where: { userId }, orderBy: { createdAt: "desc" }, select: presetSelect }),
    depositHistory(userId),
  ]);
  // The simulator works in pounds, so only GBP deposits are compared.
  const averageMonthly =
    history.status === "ready" ? summariseDeposits(history.transactions, "GBP").averageMonthly : null;

  return <Simulator connected={key.connected} initialPresets={presets.map(toPreset)} averageMonthly={averageMonthly} />;
}
