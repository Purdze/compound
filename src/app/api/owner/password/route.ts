import { NextResponse } from "next/server";
import { z } from "zod";
import { jsonError, parseBody } from "@/lib/api";
import { guard } from "@/lib/guard";
import { setSessionCookie } from "@/lib/auth";
import { db } from "@/lib/db";
import { hashPassword, verifyPassword } from "@/lib/password";
import { newPasswordSchema } from "@/lib/field-rules";
import { limiters } from "@/lib/rate-limit";

const body = z.object({ current: z.string().max(1024), next: newPasswordSchema });

export async function POST(req: Request) {
  const g = await guard(req, limiters.write);
  if ("response" in g) return g.response;
  const b = await parseBody(req, body, "Check the passwords and try again.");
  if ("response" in b) return b.response;

  const owner = await db.user.findUniqueOrThrow({ where: { id: g.userId }, select: { passwordHash: true } });
  if (!owner.passwordHash || !(await verifyPassword(b.data.current, owner.passwordHash))) {
    return jsonError(401, "Your current password isn't right.");
  }

  const passwordHash = await hashPassword(b.data.next);
  const { sessionEpoch } = await db.user.update({
    where: { id: g.userId },
    data: { passwordHash },
    select: { sessionEpoch: true },
  });
  // Re-issue this browser's cookie; every other session is signed with the old hash and stops working.
  return setSessionCookie(NextResponse.json({ changed: true }), { passwordHash, epoch: sessionEpoch });
}
