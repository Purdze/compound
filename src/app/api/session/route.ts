import { NextResponse } from "next/server";
import { z } from "zod";
import { crossSiteRejection, jsonError, parseBody, tooManyRequests } from "@/lib/api";
import { clearSessionCookie, setSessionCookie } from "@/lib/auth";
import { db } from "@/lib/db";
import { hashPassword, needsRehash, verifyPassword } from "@/lib/password";
import { limiters } from "@/lib/rate-limit";
import { ownerRow } from "@/lib/setup";

const body = z.object({ password: z.string().min(1, "Enter your password.").max(1024) });

// One key for the whole install: Compound has a single user, and client-supplied
// headers like X-Forwarded-For can't be trusted to tell attackers apart.
const SIGN_IN_KEY = "sign-in";

export async function POST(req: Request) {
  const rejection = crossSiteRejection(req);
  if (rejection) return rejection;
  // Only failed attempts count, so correct sign-ins never lock anyone out.
  const { ok, retryAfter } = limiters.failedSignIn.peek(SIGN_IN_KEY);
  if (!ok) return tooManyRequests(retryAfter);

  const b = await parseBody(req, body, "Enter your password.");
  if ("response" in b) return b.response;

  const owner = await ownerRow();
  if (!owner?.passwordHash) return jsonError(409, "Compound isn't set up yet. Open /setup to finish setting it up.");

  if (!(await verifyPassword(b.data.password, owner.passwordHash))) {
    limiters.failedSignIn.check(SIGN_IN_KEY);
    return jsonError(
      401,
      "That password isn't right. If you've forgotten it, see \"Forgot your password\" in the README.",
    );
  }

  let passwordHash = owner.passwordHash;
  if (needsRehash(passwordHash)) {
    passwordHash = await hashPassword(b.data.password);
    await db.user.update({ where: { id: owner.id }, data: { passwordHash } });
  }
  return setSessionCookie(NextResponse.json({ signedIn: true }), { passwordHash, epoch: owner.sessionEpoch });
}

export async function DELETE(req: Request) {
  const rejection = crossSiteRejection(req);
  if (rejection) return rejection;
  return clearSessionCookie(NextResponse.json({ signedIn: false }));
}
