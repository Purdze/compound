import { jsonOk } from "@/lib/api";
import { guard } from "@/lib/guard";
import { limiters } from "@/lib/rate-limit";
import { getPortfolio, requestPortfolioRefresh } from "@/lib/t212/portfolio";

export async function GET(req: Request) {
  const g = await guard(req, limiters.read);
  if ("response" in g) return g.response;
  return jsonOk(await getPortfolio(g.userId));
}

export async function POST(req: Request) {
  const g = await guard(req, limiters.write);
  if ("response" in g) return g.response;
  requestPortfolioRefresh(g.userId);
  return jsonOk({ requested: true });
}
