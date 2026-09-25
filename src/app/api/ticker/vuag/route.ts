import { jsonOk } from "@/lib/api";
import { guard } from "@/lib/guard";
import { limiters } from "@/lib/rate-limit";
import { getVuagPrice } from "@/lib/t212/portfolio";

export async function GET(req: Request) {
  const g = await guard(req, limiters.read);
  if ("response" in g) return g.response;
  return jsonOk({ vuag: await getVuagPrice(g.userId) });
}
