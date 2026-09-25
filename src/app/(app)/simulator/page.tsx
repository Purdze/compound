import { Simulator } from "@/components/Simulator";
import { apiKeyStatus } from "@/lib/api-key-status";
import { requireOwner } from "@/lib/auth";
import { db } from "@/lib/db";
import { presetSelect, toPreset } from "@/lib/presets";

export const dynamic = "force-dynamic";

export default async function SimulatorPage() {
  const { id: userId } = await requireOwner();
  const [key, presets] = await Promise.all([
    apiKeyStatus(userId),
    db.calculatorPreset.findMany({ where: { userId }, orderBy: { createdAt: "desc" }, select: presetSelect }),
  ]);

  return <Simulator connected={key.connected} initialPresets={presets.map(toPreset)} />;
}
