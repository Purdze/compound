import { NextResponse } from "next/server";
import { z } from "zod";
import { crossSiteRejection, jsonError, parseBody } from "@/lib/api";
import { setSessionCookie } from "@/lib/auth";
import { newPasswordSchema, ownerNameSchema } from "@/lib/field-rules";
import { completeSetup } from "@/lib/setup";

const body = z.object({
  name: ownerNameSchema,
  password: newPasswordSchema,
  updateCheck: z.boolean(),
});

export async function POST(req: Request) {
  const rejection = crossSiteRejection(req);
  if (rejection) return rejection;
  const b = await parseBody(req, body, "Check the setup details and try again.");
  if ("response" in b) return b.response;

  const binding = await completeSetup(b.data);
  if (!binding) return jsonError(409, "Compound is already set up. Sign in instead.");
  return setSessionCookie(NextResponse.json({ setUp: true }), binding);
}
