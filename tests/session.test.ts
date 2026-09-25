import { describe, expect, test } from "bun:test";
import { SESSION_MAX_AGE_S, signSession, verifySession } from "../src/lib/session";

const secret = "test-secret";
const binding = { passwordHash: "scrypt$c2FsdA==$aGFzaA==", epoch: 0 };
const now = 1_760_000_000_000;

describe("session cookie", () => {
  test("verifies a freshly signed token", () => {
    expect(verifySession(signSession(now, secret, binding), now, secret, binding)).toBe(true);
  });

  test("rejects a tampered signature or timestamp", () => {
    const [issued, sig] = signSession(now, secret, binding).split(".");
    expect(verifySession(`${issued}.${sig}x`, now, secret, binding)).toBe(false);
    expect(verifySession(`${Number(issued) + 1}.${sig}`, now, secret, binding)).toBe(false);
    expect(verifySession("garbage", now, secret, binding)).toBe(false);
  });

  test("a new password, secret or session epoch signs everyone out", () => {
    const token = signSession(now, secret, binding);
    expect(verifySession(token, now, secret, { ...binding, passwordHash: "scrypt$other$hash" })).toBe(false);
    expect(verifySession(token, now, "other-secret", binding)).toBe(false);
    expect(verifySession(token, now, secret, { ...binding, epoch: 1 })).toBe(false);
  });

  test("expires after the max age and rejects future timestamps", () => {
    const token = signSession(now, secret, binding);
    expect(verifySession(token, now + SESSION_MAX_AGE_S * 1000 + 1, secret, binding)).toBe(false);
    expect(verifySession(signSession(now + 60_000, secret, binding), now, secret, binding)).toBe(false);
  });
});
