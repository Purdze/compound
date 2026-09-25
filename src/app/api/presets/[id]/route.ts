import { jsonError, jsonOk } from "@/lib/api";
import { guard } from "@/lib/guard";
import { db } from "@/lib/db";
import { limiters } from "@/lib/rate-limit";

export async function DELETE(req: Request, ctx: { params: Promise<{ id: string }> }) {
  const g = await guard(req, limiters.write);
  if ("response" in g) return g.response;
  const { id } = await ctx.params;

  // Scoped by userId: another user's preset id simply matches nothing.
  const { count } = await db.calculatorPreset.deleteMany({ where: { id, userId: g.userId } });
  if (count === 0) return jsonError(404, "That preset no longer exists.");
  return jsonOk({ deleted: true });
}
