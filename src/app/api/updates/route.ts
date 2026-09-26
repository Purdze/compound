import { jsonError, jsonOk } from "@/lib/api";
import { env } from "@/lib/env";
import { guard } from "@/lib/guard";
import { limiters } from "@/lib/rate-limit";
import { checkForUpdates } from "@/lib/updates";
import { DEV_VERSION } from "@/lib/version";

export async function POST(req: Request) {
  const g = await guard(req, limiters.updateCheck);
  if ("response" in g) return g.response;
  if (env().APP_VERSION === DEV_VERSION) return jsonError(400, "Development builds have no version to compare.");
  return jsonOk(await checkForUpdates());
}
