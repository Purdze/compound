import { describe, expect, test } from "bun:test";
import { randomBytes } from "node:crypto";
import { open, seal } from "../src/lib/crypto";

const key = randomBytes(32).toString("base64");
const creds = JSON.stringify({ key: "abc123", secret: "s3cr3t" });

describe("AES-256-GCM sealing", () => {
  test("round-trips", () => {
    const sealed = seal(creds, "user_1", key);
    expect(open(sealed, "user_1", key)).toBe(creds);
  });

  test("ciphertext does not contain the plaintext and IVs are unique", () => {
    const a = seal(creds, "user_1", key);
    const b = seal(creds, "user_1", key);
    expect(a.ciphertext.toString("utf8")).not.toContain("s3cr3t");
    expect(a.iv.equals(b.iv)).toBe(false);
    expect(a.iv.length).toBe(12);
  });

  test("fails for another user's id (AAD binding)", () => {
    const sealed = seal(creds, "user_1", key);
    expect(() => open(sealed, "user_2", key)).toThrow();
  });

  test("fails with the wrong encryption key", () => {
    const sealed = seal(creds, "user_1", key);
    expect(() => open(sealed, "user_1", randomBytes(32).toString("base64"))).toThrow();
  });

  test("fails when ciphertext is tampered with", () => {
    const sealed = seal(creds, "user_1", key);
    sealed.ciphertext[0] = (sealed.ciphertext[0] ?? 0) ^ 0xff;
    expect(() => open(sealed, "user_1", key)).toThrow();
  });

  test("rejects keys that aren't 32 bytes", () => {
    expect(() => seal(creds, "user_1", randomBytes(16).toString("base64"))).toThrow();
  });
});
