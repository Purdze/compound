import "server-only";
import { db } from "@/lib/db";
import { type T212ErrorCode, asT212Error, loadUserCredentials, t212Read } from "./client";
import { normaliseTransactions, type CashTransaction, type TransactionPage } from "./normalise";

export type SyncError = T212ErrorCode | "MISSING_PERMISSION";

export type DepositHistory =
  | { status: "no-key" }
  | { status: "syncing" }
  | { status: "error"; code: SyncError }
  | { status: "ready"; transactions: CashTransaction[] };

const FIRST_PAGE = "/equity/history/transactions?limit=50";
// Trading 212 allows 6 transaction history calls a minute.
const PAGE_GAP_MS = 10_500;
const RESYNC_AFTER_MS = 60 * 60_000;
const RETRY_FAILED_AFTER_MS = 60_000;
// A first sync of a short history finishes within this, so the page shows it straight away.
const WAIT_FOR_SYNC_MS = 2_000;

const sleep = (ms: number) => new Promise<void>((resolve) => setTimeout(resolve, ms));

/**
 * Walks pages newest first. Without `isKnown` it reads everything; with it, it stops at the
 * first page reaching a transaction already stored. Nothing is returned unless the walk
 * completes, so what's stored is always a complete run back to the first transaction.
 */
export async function walkTransactions(
  fetchPage: (path: string) => Promise<TransactionPage>,
  isKnown: ((references: string[]) => Promise<boolean>) | null,
  pause: () => Promise<void> = () => sleep(PAGE_GAP_MS),
): Promise<CashTransaction[]> {
  const found: CashTransaction[] = [];
  let path: string | null = FIRST_PAGE;
  while (path) {
    const page: TransactionPage = await fetchPage(path);
    found.push(...page.items);
    if (isKnown && (await isKnown(page.items.map((t) => t.reference)))) break;
    path = page.nextPath;
    if (path) await pause();
  }
  return found;
}

/** The key already works for the portfolio, so a 403 here means this one permission is off. */
export function syncErrorCode(err: unknown): SyncError {
  const e = asT212Error(err);
  return e.status === 403 ? "MISSING_PERMISSION" : e.code;
}

async function syncTransactions(userId: string): Promise<void> {
  const key = await db.apiKey.findUnique({
    where: { userId },
    select: { id: true, createdAt: true, transactionsSyncedAt: true },
  });
  if (!key) return;

  try {
    const creds = await loadUserCredentials(userId);
    if (!creds) return;
    const fetchPage = (path: string) => t212Read(creds, path, userId, normaliseTransactions);
    const isKnown = async (references: string[]) =>
      (await db.cashTransaction.count({ where: { userId, apiKeyId: key.id, reference: { in: references } } })) > 0;

    const found = await walkTransactions(fetchPage, key.transactionsSyncedAt ? isKnown : null);
    // If the key was replaced mid-sync, what was fetched belongs to the old account.
    await db.$transaction(async (tx) => {
      const { count } = await tx.apiKey.updateMany({
        where: { id: key.id, userId, createdAt: key.createdAt },
        data: { transactionsSyncedAt: new Date(), transactionsError: null },
      });
      if (count === 0) return;
      await tx.cashTransaction.createMany({
        data: found.map((t) => ({ ...t, userId, apiKeyId: key.id })),
        skipDuplicates: true,
      });
    });
  } catch (err) {
    await db.apiKey.updateMany({
      where: { id: key.id, userId, createdAt: key.createdAt },
      data: { transactionsError: syncErrorCode(err) },
    });
  }
}

const running = new Map<string, Promise<void>>();
const lastAttempt = new Map<string, number>();

function startSync(userId: string): Promise<void> {
  let sync = running.get(userId);
  if (!sync) {
    lastAttempt.set(userId, Date.now());
    sync = syncTransactions(userId).finally(() => running.delete(userId));
    running.set(userId, sync);
  }
  return sync;
}

/**
 * The owner's stored transactions, oldest first. Starts a background sync when the stored
 * copy is over an hour old; pages never wait for more than a moment of it.
 */
export async function depositHistory(userId: string): Promise<DepositHistory> {
  const read = () =>
    db.apiKey.findUnique({ where: { userId }, select: { transactionsSyncedAt: true, transactionsError: true } });
  let key = await read();
  if (!key) return { status: "no-key" };

  const now = Date.now();
  const stale = !key.transactionsSyncedAt || now - key.transactionsSyncedAt.getTime() > RESYNC_AFTER_MS;
  const retryDue = !key.transactionsError || now - (lastAttempt.get(userId) ?? 0) > RETRY_FAILED_AFTER_MS;
  if (stale && retryDue) {
    const sync = startSync(userId);
    if (!key.transactionsSyncedAt) {
      await Promise.race([sync, sleep(WAIT_FOR_SYNC_MS)]);
      key = await read();
      if (!key) return { status: "no-key" };
    }
  }

  if (!key.transactionsSyncedAt) {
    return key.transactionsError && !running.has(userId)
      ? { status: "error", code: key.transactionsError as SyncError }
      : { status: "syncing" };
  }

  const rows = await db.cashTransaction.findMany({
    where: { userId },
    orderBy: { occurredAt: "asc" },
    select: { reference: true, type: true, amount: true, currency: true, occurredAt: true },
  });
  return {
    status: "ready",
    transactions: rows.map((r) => ({ ...r, amount: Number(r.amount), occurredAt: r.occurredAt.toISOString() })),
  };
}
