import { z } from "zod";
import { jsonError, jsonOk, parseBody } from "@/lib/api";
import { guard } from "@/lib/guard";
import { db } from "@/lib/db";
import { nameSchema } from "@/lib/field-rules";
import { presetSelect, toPreset } from "@/lib/presets";
import { limiters } from "@/lib/rate-limit";
import { LIMITS, MODES } from "@/lib/simulator";

const MAX_PRESETS = 50;

const range = (l: { min: number; max: number }) => z.number().finite().min(l.min).max(l.max);

const body = z
  .object({
    name: nameSchema("Give the preset a name."),
    currentAge: range(LIMITS.currentAge).int(),
    targetAge: range(LIMITS.targetAge).int(),
    goalAmount: range(LIMITS.goalAmount).int(),
    rate: range(LIMITS.rate).multipleOf(LIMITS.rate.step),
    lumpSum: range(LIMITS.lumpSum).int(),
    mode: z.enum(MODES),
    monthly: range(LIMITS.monthly).int().multipleOf(LIMITS.monthly.step),
  })
  .refine((v) => v.targetAge > v.currentAge, { message: "Target age must be above current age." });

export async function GET(req: Request) {
  const g = await guard(req, limiters.read);
  if ("response" in g) return g.response;
  const presets = await db.calculatorPreset.findMany({
    where: { userId: g.userId },
    orderBy: { createdAt: "desc" },
    select: presetSelect,
  });
  return jsonOk({ presets: presets.map(toPreset) });
}

export async function POST(req: Request) {
  const g = await guard(req, limiters.write);
  if ("response" in g) return g.response;
  const b = await parseBody(req, body, "Check the preset values.");
  if ("response" in b) return b.response;

  const count = await db.calculatorPreset.count({ where: { userId: g.userId } });
  if (count >= MAX_PRESETS) return jsonError(400, `You have ${MAX_PRESETS} presets. Delete one to save another.`);

  const preset = await db.calculatorPreset.create({ data: { ...b.data, userId: g.userId }, select: presetSelect });
  return jsonOk({ preset: toPreset(preset) }, 201);
}
