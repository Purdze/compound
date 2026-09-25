import { randomBytes, scrypt, timingSafeEqual, type ScryptOptions } from "node:crypto";

const scryptAsync = (password: string, salt: Buffer, keylen: number, options: ScryptOptions) =>
  new Promise<Buffer>((resolve, reject) =>
    scrypt(password, salt, keylen, options, (err, key) => (err ? reject(err) : resolve(key))),
  );

type Params = { N: number; r: number; p: number };

// OWASP's recommended scrypt settings. Raising them later is safe: stored hashes carry
// their own settings, and sign-in rehashes anything older (see needsRehash).
const CURRENT: Params = { N: 2 ** 17, r: 8, p: 1 };
// Hashes stored before settings were recorded used Node's defaults.
const LEGACY: Params = { N: 16384, r: 8, p: 1 };
const KEY_BYTES = 32;

// scrypt needs 128 * N * r bytes; Node's default limit (32 MB) is too low for CURRENT.
const maxmem = (params: Params) => 256 * params.N * params.r;

/** Format: `scrypt$<N>$<r>$<p>$<salt b64>$<hash b64>`. */
export async function hashPassword(password: string): Promise<string> {
  const { N, r, p } = CURRENT;
  const salt = randomBytes(16);
  const hash = await scryptAsync(password, salt, KEY_BYTES, { N, r, p, maxmem: maxmem(CURRENT) });
  return ["scrypt", N, r, p, salt.toString("base64"), hash.toString("base64")].join("$");
}

function parse(stored: string): { params: Params; salt: Buffer; hash: Buffer } | null {
  const parts = stored.split("$");
  if (parts[0] !== "scrypt" || (parts.length !== 3 && parts.length !== 6)) return null;

  let params = LEGACY;
  if (parts.length === 6) {
    const [N, r, p] = parts.slice(1, 4).map(Number) as [number, number, number];
    if (![N, r, p].every(Number.isSafeInteger)) return null;
    params = { N, r, p };
  }
  const [salt, hash] = parts.slice(-2).map((b64) => Buffer.from(b64, "base64")) as [Buffer, Buffer];
  return { params, salt, hash };
}

export async function verifyPassword(password: string, stored: string): Promise<boolean> {
  const parsed = parse(stored);
  if (!parsed || parsed.hash.length === 0) return false;
  const { params, salt, hash } = parsed;
  const actual = await scryptAsync(password, salt, hash.length, { ...params, maxmem: maxmem(params) });
  return timingSafeEqual(actual, hash);
}

export function needsRehash(stored: string): boolean {
  const params = parse(stored)?.params;
  return !params || params.N !== CURRENT.N || params.r !== CURRENT.r || params.p !== CURRENT.p;
}
