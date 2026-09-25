import "server-only";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import type { NextResponse } from "next/server";
import { env } from "@/lib/env";
import { secrets } from "@/lib/secrets";
import { SESSION_COOKIE, SESSION_MAX_AGE_S, type SessionBinding, signSession, verifySession } from "@/lib/session";
import { ownerRow } from "@/lib/setup";

type Owner = NonNullable<Awaited<ReturnType<typeof ownerRow>>>;

type SessionState = { status: "needs-setup" } | { status: "signed-out" } | { status: "signed-in"; owner: Owner };

export async function sessionState(): Promise<SessionState> {
  const owner = await ownerRow();
  if (!owner?.passwordHash) return { status: "needs-setup" };
  const token = (await cookies()).get(SESSION_COOKIE)?.value;
  const valid =
    token &&
    verifySession(token, Date.now(), secrets().sessionSecret, {
      passwordHash: owner.passwordHash,
      epoch: owner.sessionEpoch,
    });
  return valid ? { status: "signed-in", owner } : { status: "signed-out" };
}

export async function currentUserId(): Promise<string | null> {
  const state = await sessionState();
  return state.status === "signed-in" ? state.owner.id : null;
}

export async function requireOwner(): Promise<Owner> {
  const state = await sessionState();
  if (state.status === "needs-setup") redirect("/setup");
  if (state.status === "signed-out") redirect("/login");
  return state.owner;
}

function cookieOptions(maxAge: number) {
  return {
    httpOnly: true,
    sameSite: "lax" as const,
    secure: env().APP_URL?.startsWith("https://") ?? false,
    path: "/",
    maxAge,
  };
}

export function setSessionCookie(res: NextResponse, binding: SessionBinding): NextResponse {
  res.cookies.set(
    SESSION_COOKIE,
    signSession(Date.now(), secrets().sessionSecret, binding),
    cookieOptions(SESSION_MAX_AGE_S),
  );
  return res;
}

export function clearSessionCookie(res: NextResponse): NextResponse {
  res.cookies.set(SESSION_COOKIE, "", cookieOptions(0));
  return res;
}
