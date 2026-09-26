import "server-only";
import { NextResponse } from "next/server";
import type { z } from "zod";
import { env } from "@/lib/env";

const MAX_BODY_BYTES = 16 * 1024;

export function jsonError(status: number, error: string, headers?: HeadersInit) {
  return NextResponse.json({ error }, { status, headers: { "Cache-Control": "no-store", ...headers } });
}

export function jsonOk<T>(data: T, status = 200) {
  return NextResponse.json(data, { status, headers: { "Cache-Control": "no-store" } });
}

export function tooManyRequests(retryAfter: number) {
  const wait = retryAfter < 120 ? `${retryAfter} seconds` : `${Math.ceil(retryAfter / 60)} minutes`;
  return jsonError(429, `Too many attempts. Try again in ${wait}.`, { "Retry-After": String(retryAfter) });
}

/**
 * Blocks state-changing requests sent by another site. Other ports on the same host
 * count as the same site to browsers, so SameSite cookies alone don't stop them.
 * Sec-Fetch-Site is set by the browser and survives reverse proxies; Origin is the
 * fallback for browsers without it. Requests with neither don't come from a browser.
 */
export function crossSiteRejection(req: Request, appUrl: string | null = env().APP_URL ?? null): NextResponse | null {
  if (req.method === "GET" || req.method === "HEAD") return null;
  const blocked = () => jsonError(403, "This request came from another site and was blocked.");

  const site = req.headers.get("sec-fetch-site");
  if (site) return site === "same-origin" || site === "none" ? null : blocked();

  const origin = req.headers.get("origin");
  if (!origin) return null;
  const expectedHost = appUrl ? new URL(appUrl).host : req.headers.get("host");
  try {
    return new URL(origin).host === expectedHost ? null : blocked();
  } catch {
    return blocked();
  }
}

/** Reads the body as text, or null once it exceeds MAX_BODY_BYTES (declared or actual). */
async function readCappedBody(req: Request): Promise<string | null> {
  if (Number(req.headers.get("content-length")) > MAX_BODY_BYTES) return null;
  if (!req.body) return "";
  const reader = req.body.getReader();
  const chunks: Uint8Array[] = [];
  let size = 0;
  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    size += value.byteLength;
    if (size > MAX_BODY_BYTES) {
      await reader.cancel();
      return null;
    }
    chunks.push(value);
  }
  return Buffer.concat(chunks).toString("utf8");
}

/** Validates a JSON body, returning the first validation message as a 400 on failure. */
export async function parseBody<S extends z.ZodTypeAny>(
  req: Request,
  schema: S,
  fallbackError: string,
): Promise<{ data: z.infer<S> } | { response: NextResponse }> {
  const type = req.headers.get("content-type")?.split(";")[0]?.trim().toLowerCase();
  if (type !== "application/json") return { response: jsonError(415, "Send the request as JSON.") };

  const text = await readCappedBody(req);
  if (text === null) return { response: jsonError(413, "That request is too large.") };

  let raw: unknown = null;
  try {
    raw = JSON.parse(text);
  } catch {}
  const parsed = schema.safeParse(raw);
  if (parsed.success) return { data: parsed.data };
  // A missing or wrong-typed field gets Zod's technical wording, so show our own instead.
  const issue = parsed.error.issues[0];
  return { response: jsonError(400, !issue || issue.code === "invalid_type" ? fallbackError : issue.message) };
}
