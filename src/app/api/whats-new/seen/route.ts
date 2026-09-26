import { jsonOk } from "@/lib/api";
import { guard } from "@/lib/guard";
import { limiters } from "@/lib/rate-limit";
import { markSeen } from "@/lib/whats-new";

export async function POST(req: Request) {
  const g = await guard(req, limiters.write);
  if ("response" in g) return g.response;
  await markSeen(g.userId);
  return jsonOk({ seen: true });
}
