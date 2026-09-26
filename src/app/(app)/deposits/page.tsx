import Link from "next/link";
import { DepositsChart } from "@/components/DepositsChart";
import { LocalTime } from "@/components/LocalTime";
import { RefreshWhilePending } from "@/components/RefreshWhilePending";
import { ValueChart } from "@/components/ValueChart";
import {
  API_KEY_SETTINGS,
  ExternalLink,
  HeadRow,
  Notice,
  Row,
  Stat,
  T212_APP_URL,
  Table,
  Td,
  Th,
  buttonClass,
  linkClass,
  lossClass,
} from "@/components/ui";
import { apiKeyStatus } from "@/lib/api-key-status";
import { requireOwner } from "@/lib/auth";
import {
  annualisedReturn,
  isaAllowance,
  realReturn,
  summariseDeposits,
  transactionLabel,
  valueHistory,
  type Snapshot,
} from "@/lib/deposits";
import { dayLabel, money, monthLabel, signedMoney, signedPercent, wholeGBP } from "@/lib/format";
import { T212Error } from "@/lib/t212/client";
import type { CashTransaction } from "@/lib/t212/normalise";
import { getPortfolio } from "@/lib/t212/portfolio";
import { ISA_ALLOWANCE } from "@/lib/simulator";
import { readSnapshots } from "@/lib/t212/snapshots";
import { depositHistory, type SyncError } from "@/lib/t212/transactions";

export const dynamic = "force-dynamic";

const LIST_LIMIT = 100;

export default async function DepositsPage() {
  const { id: userId } = await requireOwner();
  const [history, portfolio, key] = await Promise.all([
    depositHistory(userId),
    getPortfolio(userId),
    apiKeyStatus(userId),
  ]);
  // After the portfolio fetch, which records today's value.
  const snapshots = await readSnapshots(userId);

  return (
    <div className="pt-12">
      <h1 className="text-2xl">Deposits</h1>
      <p className="mt-3 max-w-2xl text-ink-muted">
        What you&apos;ve put into your Trading 212 account, and what it&apos;s grown to.
      </p>

      {history.status === "no-key" && (
        <div className="mt-10 max-w-xl border-t border-rule pt-10">
          <p className="text-ink-muted">
            No API key connected yet. Add a read-only key with the History - Transactions permission to see your
            deposits here.
          </p>
          <Link href={API_KEY_SETTINGS} className={`${buttonClass()} mt-6`}>
            Add an API key
          </Link>
        </div>
      )}

      {history.status === "syncing" && (
        <div className="mt-10 max-w-2xl">
          <Notice>Fetching your deposit history from Trading 212. A long history can take a few minutes.</Notice>
          <RefreshWhilePending />
        </div>
      )}

      {history.status === "error" && <SyncProblem code={history.code} />}

      {history.status === "ready" && (
        <DepositsView
          transactions={history.transactions}
          snapshots={snapshots}
          isIsa={key.connected && key.isIsa}
          totalValue={portfolio.status === "ok" ? portfolio.portfolio.totalValue : null}
          currency={
            portfolio.status === "ok"
              ? portfolio.portfolio.accountCurrency
              : (history.transactions.at(-1)?.currency ?? "GBP")
          }
        />
      )}
    </div>
  );
}

function SyncProblem({ code }: { code: SyncError }) {
  if (code === "MISSING_PERMISSION") {
    return (
      <div className="mt-10 max-w-2xl space-y-4">
        <Notice tone="problem">
          Your key doesn&apos;t have the <strong>History - Transactions</strong> permission, so Compound can&apos;t read
          your deposits. Keys can&apos;t be changed after they&apos;re created: in{" "}
          <ExternalLink href={T212_APP_URL}>Trading 212</ExternalLink>, create a new read-only key with it turned on,
          then replace your key in Settings.
        </Notice>
        <Link href={API_KEY_SETTINGS} className={`${linkClass} text-sm`}>
          Go to Settings
        </Link>
      </div>
    );
  }
  return (
    <div className="mt-10 max-w-2xl">
      <Notice tone="problem">{new T212Error(code).message}</Notice>
    </div>
  );
}

function IsaLine({ transactions, isIsa }: { transactions: CashTransaction[]; isIsa: boolean }) {
  if (!isIsa) {
    return (
      <p className="mt-6 text-sm text-ink-muted">
        Is this a Stocks &amp; Shares ISA?{" "}
        <Link href={API_KEY_SETTINGS} className={linkClass}>
          Mark it in Settings
        </Link>{" "}
        to track your allowance.
      </p>
    );
  }
  const a = isaAllowance(transactions);
  return (
    <p className={`mt-6 text-sm ${a.remaining === 0 ? "text-accent-rust" : "text-ink-muted"}`}>
      This tax year (since {dayLabel(a.startDay)}): {wholeGBP(a.used)} of your {wholeGBP(ISA_ALLOWANCE)} ISA allowance
      used · {wholeGBP(a.remaining)} left.
      {a.transfersIn > 0 &&
        ` Plus ${wholeGBP(a.transfersIn)} transferred in, which counts too unless it came from another ISA.`}
    </p>
  );
}

function returnNote(overall: number | null, yearly: number | null): string | undefined {
  if (overall === null) return undefined;
  const perYear = yearly === null ? "yearly figure after your first year" : `${signedPercent(yearly)} a year`;
  return `${signedPercent(overall)} overall · ${perYear}`;
}

function DepositsView({
  transactions,
  snapshots,
  isIsa,
  totalValue,
  currency,
}: {
  transactions: CashTransaction[];
  snapshots: Snapshot[];
  isIsa: boolean;
  totalValue: number | null;
  currency: string;
}) {
  if (transactions.length === 0) {
    return (
      <p className="mt-10 max-w-xl border-t border-rule pt-10 text-ink-muted">
        No deposits yet. Once you add money to your Trading 212 account, it will show here within the hour.
      </p>
    );
  }

  const s = summariseDeposits(transactions, currency);
  const worth =
    totalValue === null
      ? null
      : {
          value: totalValue,
          ...realReturn(totalValue, s.netContributed),
          yearly: annualisedReturn(transactions, currency, totalValue),
        };
  const history = valueHistory(snapshots, transactions, currency);
  const newestFirst = transactions.toReversed();

  return (
    <>
      <section className="mt-8 border-b border-rule pb-10">
        <p className="text-sm text-ink-muted">Net deposited</p>
        <p className="figure mt-1 text-3xl">{money(s.netContributed, currency)}</p>

        <dl className="mt-10 grid grid-cols-2 gap-y-6 md:grid-cols-4 md:divide-x md:divide-rule">
          <Stat label="Deposited" value={money(s.deposited, currency)} />
          <Stat label="Withdrawn" value={money(s.withdrawn, currency)} />
          {worth && (
            <>
              <Stat label="Worth now" value={money(worth.value, currency)} />
              <Stat
                label="Return"
                value={signedMoney(worth.amount, currency)}
                note={returnNote(worth.pct, worth.yearly)}
                className={lossClass(worth.amount)}
              />
            </>
          )}
        </dl>
        <IsaLine transactions={transactions} isIsa={isIsa} />
        {s.fees > 0 && <p className="mt-2 text-sm text-ink-muted">Fees charged: {money(s.fees, currency)}</p>}
        {s.otherCurrencies > 0 && (
          <p className="mt-2 text-sm text-ink-muted">
            {s.otherCurrencies} transaction{s.otherCurrencies === 1 ? " isn't" : "s aren't"} in {currency} and{" "}
            {s.otherCurrencies === 1 ? "is" : "are"} left out of these totals.
          </p>
        )}
      </section>

      <section className="pt-10">
        <h2 className="text-xl">Worth and money put in</h2>
        {history.length >= 2 ? (
          <div className="mt-6">
            <ValueChart points={history} currency={currency} />
          </div>
        ) : (
          <p className="mt-2 max-w-2xl text-sm text-ink-muted">
            {history[0]
              ? `Compound started recording your portfolio's value on ${dayLabel(history[0].day)}.`
              : "Compound records your portfolio's value each day from now on."}{" "}
            This chart fills in a day at a time from there, showing what it&apos;s worth against what you&apos;ve put
            in.
          </p>
        )}
      </section>

      <section className="mt-16 border-t border-rule pt-10">
        <h2 className="text-xl">Each month</h2>
        <p className="mt-2 text-sm text-ink-muted">
          Deposits minus withdrawals.
          {s.averageMonthly !== null && <> On average {money(s.averageMonthly, currency, 0)} a month.</>}
        </p>
        <div className="mt-6">
          <DepositsChart monthly={s.monthly} currency={currency} />
        </div>
        <details className="mt-6 text-sm">
          <summary className="text-ink-muted hover:text-ink">Show month-by-month table</summary>
          <div className="mt-4">
            <Table minWidth="20rem">
              <thead>
                <HeadRow>
                  <Th>Month</Th>
                  <Th align="right">Net deposited</Th>
                </HeadRow>
              </thead>
              <tbody>
                {s.monthly.toReversed().map((m) => (
                  <Row key={m.month}>
                    <Td>{monthLabel(m.month)}</Td>
                    <Td align="right" className={lossClass(m.net)}>
                      {money(m.net, currency)}
                    </Td>
                  </Row>
                ))}
              </tbody>
            </Table>
          </div>
        </details>
      </section>

      <section className="mt-16 border-t border-rule pt-10">
        <h2 className="text-xl">Transactions</h2>
        <div className="mt-6">
          <Table minWidth="28rem">
            <thead>
              <HeadRow>
                <Th>Date</Th>
                <Th>Type</Th>
                <Th align="right">Amount</Th>
              </HeadRow>
            </thead>
            <tbody>
              {newestFirst.slice(0, LIST_LIMIT).map((t) => (
                <Row key={t.reference}>
                  <Td>
                    <LocalTime iso={t.occurredAt} withDate />
                  </Td>
                  <Td>{transactionLabel(t)}</Td>
                  <Td align="right" className={`font-medium ${lossClass(t.amount)}`}>
                    {signedMoney(t.amount, t.currency)}
                  </Td>
                </Row>
              ))}
            </tbody>
          </Table>
        </div>
        {newestFirst.length > LIST_LIMIT && (
          <p className="mt-4 text-sm text-ink-muted">
            Showing the latest {LIST_LIMIT} of {newestFirst.length}. Older ones are counted in the totals above.
          </p>
        )}
      </section>
    </>
  );
}
