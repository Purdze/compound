import { expect, test } from "bun:test";
import { scryptSync } from "node:crypto";
import { hashPassword, needsRehash, verifyPassword } from "../src/lib/password";

test("hashes with recorded settings and a random salt, and verifies", async () => {
  const a = await hashPassword("correct horse battery");
  const b = await hashPassword("correct horse battery");
  expect(a).toMatch(/^scrypt\$131072\$8\$1\$[A-Za-z0-9+/=]+\$[A-Za-z0-9+/=]+$/);
  expect(a).not.toBe(b);
  expect(await verifyPassword("correct horse battery", a)).toBe(true);
  expect(await verifyPassword("correct horse batter", a)).toBe(false);
  expect(needsRehash(a)).toBe(false);
});

test("still verifies hashes from before settings were recorded, and flags them for rehash", async () => {
  const salt = Buffer.from("legacy-salt-1234");
  const legacy = `scrypt$${salt.toString("base64")}$${scryptSync("old password", salt, 32).toString("base64")}`;
  expect(await verifyPassword("old password", legacy)).toBe(true);
  expect(await verifyPassword("wrong", legacy)).toBe(false);
  expect(needsRehash(legacy)).toBe(true);
});

test("rejects malformed stored values", async () => {
  expect(await verifyPassword("anything", "")).toBe(false);
  expect(await verifyPassword("anything", "bcrypt$x$y")).toBe(false);
  expect(await verifyPassword("anything", "scrypt$abc$8$1$c2FsdA==$aGFzaA==")).toBe(false);
  expect(needsRehash("garbage")).toBe(true);
});
