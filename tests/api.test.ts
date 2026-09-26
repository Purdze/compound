import { describe, expect, test } from "bun:test";
import { z } from "zod";
import { crossSiteRejection, parseBody } from "../src/lib/api";

const post = (headers: Record<string, string>, body?: BodyInit) =>
  new Request("http://localhost:3000/api/x", { method: "POST", headers: { host: "localhost:3000", ...headers }, body });

describe("crossSiteRejection", () => {
  const blocked = (req: Request, appUrl: string | null = null) => crossSiteRejection(req, appUrl)?.status === 403;

  test("never blocks reads", () => {
    expect(
      crossSiteRejection(new Request("http://x/", { headers: { "sec-fetch-site": "cross-site" } }), null),
    ).toBeNull();
  });

  test("trusts the browser's Sec-Fetch-Site", () => {
    expect(blocked(post({ "sec-fetch-site": "same-origin" }))).toBe(false);
    expect(blocked(post({ "sec-fetch-site": "none" }))).toBe(false);
    expect(blocked(post({ "sec-fetch-site": "same-site" }))).toBe(true);
    expect(blocked(post({ "sec-fetch-site": "cross-site" }))).toBe(true);
  });

  test("falls back to comparing Origin with Host, or APP_URL behind a proxy", () => {
    expect(blocked(post({ origin: "http://localhost:3000" }))).toBe(false);
    expect(blocked(post({ origin: "http://localhost:8765" }))).toBe(true);
    expect(blocked(post({ origin: "null" }))).toBe(true);
    expect(blocked(post({ origin: "https://compound.home.lan" }), "https://compound.home.lan")).toBe(false);
    expect(blocked(post({ origin: "http://localhost:3000" }), "https://compound.home.lan")).toBe(true);
  });

  test("allows requests with neither header (not a browser)", () => {
    expect(blocked(post({}))).toBe(false);
  });
});

describe("parseBody", () => {
  const schema = z.object({ a: z.number() });
  const status = async (req: Request) => {
    const r = await parseBody(req, schema, "bad");
    return "response" in r ? r.response.status : 200;
  };

  test("accepts valid JSON", async () => {
    expect(await status(post({ "content-type": "application/json; charset=utf-8" }, '{"a":1}'))).toBe(200);
  });

  test("requires a JSON content type", async () => {
    expect(await status(post({ "content-type": "text/plain" }, '{"a":1}'))).toBe(415);
    expect(await status(post({}, '{"a":1}'))).toBe(415);
  });

  test("caps the body size, declared or not", async () => {
    const big = JSON.stringify({ a: 1, pad: "x".repeat(20_000) });
    expect(await status(post({ "content-type": "application/json", "content-length": "999999" }, "{}"))).toBe(413);
    const stream = new ReadableStream({ start: (c) => (c.enqueue(new TextEncoder().encode(big)), c.close()) });
    const req = new Request("http://localhost/api/x", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: stream,
      // @ts-expect-error Bun/undici need this for stream bodies
      duplex: "half",
    });
    expect(await status(req)).toBe(413);
  });

  test("returns 400 for malformed or invalid JSON", async () => {
    expect(await status(post({ "content-type": "application/json" }, "{nope"))).toBe(400);
    expect(await status(post({ "content-type": "application/json" }, '{"a":"x"}'))).toBe(400);
  });

  test("shows a schema's own message, and the fallback for missing or wrong-typed fields", async () => {
    const named = z.object({ name: z.string().min(3, "Name is too short.") });
    const error = async (body: string) => {
      const r = await parseBody(post({ "content-type": "application/json" }, body), named, "Enter a name.");
      return "response" in r ? ((await r.response.json()) as { error: string }).error : null;
    };
    expect(await error('{"name":"ab"}')).toBe("Name is too short.");
    expect(await error("{}")).toBe("Enter a name.");
    expect(await error('{"name":5}')).toBe("Enter a name.");
  });
});
