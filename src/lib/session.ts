import { createHmac, timingSafeEqual } from "node:crypto";

export const SESSION_COOKIE = "compound_session";
export const SESSION_MAX_AGE_S = 30 * 24 * 60 * 60;

/** What a session is bound to: changing either signs out every existing session. */
export type SessionBinding = { passwordHash: string; epoch: number };

const signature = (issuedAt: number, secret: string, { passwordHash, epoch }: SessionBinding) =>
  createHmac("sha256", secret).update(`${issuedAt}.${passwordHash}.${epoch}`).digest("base64url");

export function signSession(issuedAt: number, secret: string, binding: SessionBinding): string {
  return `${issuedAt}.${signature(issuedAt, secret, binding)}`;
}

export function verifySession(token: string, now: number, secret: string, binding: SessionBinding): boolean {
  const [issued, sig] = token.split(".");
  const issuedAt = Number(issued);
  if (!Number.isSafeInteger(issuedAt) || !sig) return false;
  if (issuedAt > now || now - issuedAt > SESSION_MAX_AGE_S * 1000) return false;
  const a = Buffer.from(sig);
  const b = Buffer.from(signature(issuedAt, secret, binding));
  return a.length === b.length && timingSafeEqual(a, b);
}
