import { NextResponse } from "next/server";
import { guard } from "@/lib/guard";
import { setSessionCookie } from "@/lib/auth";
import { db } from "@/lib/db";
import { limiters } from "@/lib/rate-limit";

/** Signs out every other browser by changing what sessions are bound to; this one gets a new cookie. */
export async function POST(req: Request) {
  const g = await guard(req, limiters.write);
  if ("response" in g) return g.response;
  const { passwordHash, sessionEpoch } = await db.user.update({
    where: { id: g.userId },
    data: { sessionEpoch: { increment: 1 } },
    select: { passwordHash: true, sessionEpoch: true },
  });
  return setSessionCookie(NextResponse.json({ signedOutElsewhere: true }), {
    passwordHash: passwordHash!,
    epoch: sessionEpoch,
  });
}
