import { expect, test } from "bun:test";
import { T212Error } from "../src/lib/t212/client";
import type { TransactionPage } from "../src/lib/t212/normalise";
import { syncErrorCode, walkTransactions } from "../src/lib/t212/transactions";

const item = (reference: string) => ({
  reference,
  type: "DEPOSIT",
  amount: 1,
  currency: "GBP",
  occurredAt: "2026-01-01T00:00:00Z",
});

const pages: Record<string, TransactionPage> = {
  "/equity/history/transactions?limit=50": { items: [item("c"), item("b")], nextPath: "/p2" },
  "/p2": { items: [item("a")], nextPath: null },
};

const noPause = async () => {};

test("a first sync reads every page", async () => {
  const seen: string[] = [];
  const found = await walkTransactions(async (path) => (seen.push(path), pages[path]!), null, noPause);
  expect(found.map((t) => t.reference)).toEqual(["c", "b", "a"]);
  expect(seen).toHaveLength(2);
});

test("a later sync stops at the first page with a stored transaction", async () => {
  const seen: string[] = [];
  const found = await walkTransactions(
    async (path) => (seen.push(path), pages[path]!),
    async (refs) => refs.includes("b"),
    noPause,
  );
  expect(found.map((t) => t.reference)).toEqual(["c", "b"]);
  expect(seen).toHaveLength(1);
});

test("a 403 means the History - Transactions permission is off", () => {
  expect(syncErrorCode(new T212Error("BAD_KEY", 403))).toBe("MISSING_PERMISSION");
  expect(syncErrorCode(new T212Error("BAD_KEY", 401))).toBe("BAD_KEY");
  expect(syncErrorCode(new T212Error("RATE_LIMITED", 429))).toBe("RATE_LIMITED");
  expect(syncErrorCode(new Error("boom"))).toBe("BAD_RESPONSE");
});
