import { expect, test } from "bun:test";
import { RateLimiter } from "../src/lib/rate-limit";
import { TtlCache } from "../src/lib/cache";

test("allows up to the limit within a window, then blocks", () => {
  const rl = new RateLimiter(3, 1000);
  expect(rl.check("u", 0).ok).toBe(true);
  expect(rl.check("u", 100).ok).toBe(true);
  expect(rl.check("u", 200).ok).toBe(true);
  const blocked = rl.check("u", 300);
  expect(blocked.ok).toBe(false);
  expect(blocked.retryAfter).toBe(1);
  expect(rl.check("other", 300).ok).toBe(true);
  expect(rl.check("u", 1001).ok).toBe(true);
});

test("TtlCache shares one in-flight load and caches the result", async () => {
  const cache = new TtlCache<number>(60_000);
  let calls = 0;
  const load = async () => {
    calls++;
    await new Promise((r) => setTimeout(r, 10));
    return 42;
  };
  const [a, b] = await Promise.all([cache.get("k", load), cache.get("k", load)]);
  expect([a, b, calls]).toEqual([42, 42, 1]);
  expect(await cache.get("k", load)).toBe(42);
  expect(calls).toBe(1);
});

test("peek checks the limit without recording a hit", () => {
  const rl = new RateLimiter(1, 1000);
  expect(rl.peek("u", 0).ok).toBe(true);
  expect(rl.peek("u", 0).ok).toBe(true);
  rl.check("u", 0);
  expect(rl.peek("u", 10).ok).toBe(false);
});

test("TtlCache reports when a cached value expires", async () => {
  const cache = new TtlCache<number>(60_000);
  expect(cache.expiresAt("k")).toBeUndefined();
  const before = Date.now();
  await cache.get("k", async () => 1);
  const at = cache.expiresAt("k")!;
  expect(at).toBeGreaterThanOrEqual(before + 60_000);
  expect(at).toBeLessThanOrEqual(Date.now() + 60_000);
  cache.delete("k");
  expect(cache.expiresAt("k")).toBeUndefined();
});
