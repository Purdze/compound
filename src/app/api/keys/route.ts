import { z } from "zod";
import { jsonError, jsonOk, parseBody } from "@/lib/api";
import { guard } from "@/lib/guard";
import { db } from "@/lib/db";
import { limiters } from "@/lib/rate-limit";
import { T212Error, storeUserCredentials, t212Get } from "@/lib/t212/client";
import { invalidatePortfolio } from "@/lib/t212/portfolio";

const credential = z
  .string()
  .trim()
  .min(8, "That looks too short to be a Trading 212 key.")
  .max(256, "That looks too long to be a Trading 212 key.")
  .regex(/^\S+$/, "Keys don't contain spaces. Check you copied the whole value.");

const body = z.object({ key: credential, secret: credential });

export async function POST(req: Request) {
  const g = await guard(req, limiters.write, limiters.keySave);
  if ("response" in g) return g.response;
  const b = await parseBody(req, body, "Enter both the API key and secret.");
  if ("response" in b) return b.response;

  // Only an outright rejection blocks saving; if Trading 212 is briefly
  // unavailable the key is saved and checked on next use.
  let warning: string | null = null;
  try {
    await t212Get(b.data, "/equity/account/summary", g.userId);
  } catch (err) {
    if (err instanceof T212Error && err.code === "BAD_KEY") {
      return jsonError(
        400,
        "Trading 212 rejected this key and secret. Check both values and that the key has the Account data and Portfolio permissions.",
      );
    }
    warning =
      "Saved, but Trading 212 couldn't be reached to check the key. It will be checked when your portfolio next loads.";
  }

  await storeUserCredentials(g.userId, b.data);
  invalidatePortfolio(g.userId);
  return jsonOk({ connected: true, warning });
}

export async function DELETE(req: Request) {
  const g = await guard(req, limiters.write);
  if ("response" in g) return g.response;
  await db.apiKey.deleteMany({ where: { userId: g.userId } });
  invalidatePortfolio(g.userId);
  return jsonOk({ connected: false });
}
