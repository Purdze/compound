import "server-only";
import { createCipheriv, createDecipheriv, randomBytes } from "node:crypto";

const ALGORITHM = "aes-256-gcm";
const IV_BYTES = 12;
const TAG_BYTES = 16;

type Sealed = { ciphertext: Buffer; iv: Buffer };

function keyFrom(base64Key: string): Buffer {
  const key = Buffer.from(base64Key, "base64");
  if (key.length !== 32) throw new Error("ENCRYPTION_KEY must decode to 32 bytes");
  return key;
}

/**
 * Encrypts `plaintext` with AES-256-GCM. `aad` (the owning userId) is authenticated
 * but not encrypted, so a ciphertext copied onto another user's row will not decrypt.
 * Returned ciphertext is `encrypted || authTag`.
 */
export function seal(plaintext: string, aad: string, base64Key: string): Sealed {
  const iv = randomBytes(IV_BYTES);
  const cipher = createCipheriv(ALGORITHM, keyFrom(base64Key), iv);
  cipher.setAAD(Buffer.from(aad, "utf8"));
  const encrypted = Buffer.concat([cipher.update(plaintext, "utf8"), cipher.final()]);
  return { ciphertext: Buffer.concat([encrypted, cipher.getAuthTag()]), iv };
}

export function open(sealed: Sealed, aad: string, base64Key: string): string {
  const { ciphertext, iv } = sealed;
  if (iv.length !== IV_BYTES || ciphertext.length <= TAG_BYTES) throw new Error("Malformed ciphertext");
  const decipher = createDecipheriv(ALGORITHM, keyFrom(base64Key), iv);
  decipher.setAAD(Buffer.from(aad, "utf8"));
  decipher.setAuthTag(ciphertext.subarray(ciphertext.length - TAG_BYTES));
  const body = ciphertext.subarray(0, ciphertext.length - TAG_BYTES);
  return Buffer.concat([decipher.update(body), decipher.final()]).toString("utf8");
}
