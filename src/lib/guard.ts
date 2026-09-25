import "server-only";
import type { NextResponse } from "next/server";
import { crossSiteRejection, jsonError, tooManyRequests } from "@/lib/api";
import { currentUserId } from "@/lib/auth";
import type { RateLimiter } from "@/lib/rate-limit";

export async function guard(
  req: Request,
  ...limits: RateLimiter[]
): Promise<{ userId: string } | { response: NextResponse }> {
  const rejection = crossSiteRejection(req);
  if (rejection) return { response: rejection };

  const userId = await currentUserId();
  if (!userId) return { response: jsonError(401, "You're signed out. Sign in again to continue.") };

  for (const limiter of limits) {
    const { ok, retryAfter } = limiter.check(userId);
    if (!ok) return { response: tooManyRequests(retryAfter) };
  }
  return { userId };
}
