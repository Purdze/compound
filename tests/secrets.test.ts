import { afterEach, expect, test } from "bun:test";
import { mkdtempSync, rmSync, statSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { loadSecrets } from "../src/lib/secrets";

const dirs: string[] = [];
const tempDir = () => {
  const d = mkdtempSync(join(tmpdir(), "compound-secrets-"));
  dirs.push(d);
  return d;
};
afterEach(() => dirs.splice(0).forEach((d) => rmSync(d, { recursive: true, force: true })));

test("generates 32-byte secrets once and reuses them", () => {
  const dir = tempDir();
  const first = loadSecrets(dir);
  expect(Buffer.from(first.encryptionKey, "base64")).toHaveLength(32);
  expect(first.encryptionKey).not.toBe(first.sessionSecret);
  expect(loadSecrets(dir)).toEqual(first);
  if (process.platform !== "win32") expect(statSync(join(dir, "secrets.json")).mode & 0o777).toBe(0o600);
});

test("env overrides win over the file", () => {
  const dir = tempDir();
  loadSecrets(dir);
  expect(loadSecrets(dir, { encryptionKey: "override" }).encryptionKey).toBe("override");
});

test("a corrupt file is an error, never silently regenerated", () => {
  const dir = tempDir();
  writeFileSync(join(dir, "secrets.json"), "{not json");
  expect(() => loadSecrets(dir)).toThrow(/Restore it from a backup/);
});
