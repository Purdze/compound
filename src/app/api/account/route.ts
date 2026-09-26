import { z } from "zod";
import { jsonOk, parseBody } from "@/lib/api";
import { guard } from "@/lib/guard";
import { db } from "@/lib/db";
import { limiters } from "@/lib/rate-limit";
import { invalidatePortfolio } from "@/lib/t212/portfolio";

const body = z.object({
  confirm: z.literal("erase", { error: "Type erase to confirm." }),
});

export async function DELETE(req: Request) {
  const g = await guard(req, limiters.write);
  if ("response" in g) return g.response;
  const b = await parseBody(req, body, "Type erase to confirm.");
  if ("response" in b) return b.response;

  const where = { userId: g.userId };
  await db.$transaction([
    db.cashTransaction.deleteMany({ where }),
    db.valueSnapshot.deleteMany({ where }),
    db.apiKey.deleteMany({ where }),
    db.apiKeyUsageLog.deleteMany({ where }),
    db.calculatorPreset.deleteMany({ where }),
  ]);
  invalidatePortfolio(g.userId);
  return jsonOk({ erased: true });
}
