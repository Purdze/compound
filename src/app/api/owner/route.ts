import { z } from "zod";
import { jsonOk, parseBody } from "@/lib/api";
import { guard } from "@/lib/guard";
import { db } from "@/lib/db";
import { limiters } from "@/lib/rate-limit";
import { ownerNameSchema } from "@/lib/field-rules";

const body = z.object({ name: ownerNameSchema.optional(), updateCheck: z.boolean().optional() });

export async function PATCH(req: Request) {
  const g = await guard(req, limiters.write);
  if ("response" in g) return g.response;
  const b = await parseBody(req, body, "Check your details and try again.");
  if ("response" in b) return b.response;

  const owner = await db.user.update({
    where: { id: g.userId },
    data: b.data,
    select: { name: true, updateCheck: true },
  });
  return jsonOk(owner);
}
