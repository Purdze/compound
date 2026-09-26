import Link from "next/link";
import { Greeting } from "@/components/Greeting";
import { LocalTime } from "@/components/LocalTime";
import { RefreshCountdown } from "@/components/RefreshCountdown";
import {
  API_KEY_SETTINGS,
  HeadRow,
  Notice,
  Row,
  Stat,
  Table,
  Td,
  Th,
  buttonClass,
  linkClass,
  lossClass,
} from "@/components/ui";
import { requireOwner } from "@/lib/auth";
import { realReturn, summariseDeposits } from "@/lib/deposits";
import { money, quantity, signedMoney, signedPercent } from "@/lib/format";
import { displayTicker, type CashTransaction, type Portfolio } from "@/lib/t212/normalise";
import { getPortfolio, nextPortfolioRefresh } from "@/lib/t212/portfolio";
import { depositHistory } from "@/lib/t212/transactions";

export const dynamic = "force-dynamic";

export default async function DashboardPage() {
  const { id: userId, name } = await requireOwner();
  const [result, history] = await Promise.all([getPortfolio(userId), depositHistory(userId)]);
  const next = nextPortfolioRefresh(userId);

  return (
    <div className="pt-12">
      {name && <Greeting name={name} />}
      <div className="flex flex-wrap items-baseline justify-between gap-4">
        <h1 className="text-2xl">Portfolio</h1>
        {result.status === "ok" && (
          <div className="flex items-baseline gap-4 text-sm text-ink-muted">
            <span>
              Last updated <LocalTime iso={result.portfolio.fetchedAt} />
            </span>
            <RefreshCountdown next={next} />
          </div>
        )}
      </div>

      {result.status === "no-key" && (
        <div className="mt-10 max-w-xl border-t border-rule pt-10">
          <h2 className="text-xl">Connect your Trading 212 account</h2>
          <p className="mt-3 text-ink-muted">
            No API key connected yet. Add a read-only key to see your live portfolio here. The goal simulator works
            either way.
          </p>
          <div className="mt-6 flex flex-wrap items-center gap-6 text-sm">
            <Link href={API_KEY_SETTINGS} className={buttonClass()}>
              Add an API key
            </Link>
            <Link href="/simulator" className={linkClass}>
              Open the simulator
            </Link>
          </div>
        </div>
      )}

      {result.status === "error" && (
        <div className="mt-10 max-w-2xl space-y-4">
          <Notice tone="problem">{result.message}</Notice>
          <div className="flex flex-wrap items-baseline gap-x-6 gap-y-2 text-sm text-ink-muted">
            <RefreshCountdown next={next} countdownLabel="Retrying" buttonLabel="Try again" />
            {(result.code === "BAD_KEY" || result.code === "KEY_UNREADABLE") && (
              <Link href={API_KEY_SETTINGS} className={linkClass}>
                Go to Settings
              </Link>
            )}
          </div>
        </div>
      )}

      {result.status === "ok" && (
        <PortfolioView
          portfolio={result.portfolio}
          transactions={history.status === "ready" ? history.transactions : null}
        />
      )}
    </div>
  );
}

function PortfolioView({
  portfolio: p,
  transactions,
}: {
  portfolio: Portfolio;
  transactions: CashTransaction[] | null;
}) {
  const cur = p.accountCurrency;
  const cash = p.cash.available + p.cash.reservedForOrders + p.cash.inPies;
  return (
    <>
      <section className="mt-8 border-b border-rule pb-10">
        <p className="text-sm text-ink-muted">Total value</p>
        <p className="figure mt-1 text-3xl">{money(p.totalValue, cur)}</p>

        <dl className="mt-10 grid grid-cols-2 gap-y-6 md:grid-cols-3 md:divide-x md:divide-rule">
          <Stat label="Invested" value={money(p.invested, cur)} />
          <Stat
            label="Cash"
            value={money(cash, cur)}
            note={p.cash.inPies > 0 ? `${money(p.cash.inPies, cur)} in pies` : undefined}
          />
          <Stat
            label="Unrealised gain"
            value={signedMoney(p.unrealisedProfitLoss, cur)}
            className={lossClass(p.unrealisedProfitLoss)}
          />
        </dl>
        {transactions && transactions.length > 0 && <DepositsLine portfolio={p} transactions={transactions} />}
      </section>

      <section className="pt-10">
        <h2 className="text-xl">Positions</h2>
        {p.positions.length === 0 ? (
          <p className="mt-4 text-ink-muted">
            No open positions. Anything you buy in Trading 212 will appear here within a minute.
          </p>
        ) : (
          <div className="mt-6">
            <Table minWidth="40rem">
              <thead>
                <HeadRow>
                  <Th>Instrument</Th>
                  <Th align="right">Quantity</Th>
                  <Th align="right">Avg price</Th>
                  <Th align="right">Price</Th>
                  <Th align="right">Value</Th>
                  <Th align="right">Gain</Th>
                </HeadRow>
              </thead>
              <tbody>
                {p.positions.map((pos) => {
                  const pc = pos.instrumentCurrency ?? cur;
                  return (
                    <Row key={pos.ticker}>
                      <Td>
                        <span className="font-medium">{displayTicker(pos.ticker)}</span>
                        {pos.name && <span className="block text-ink-muted">{pos.name}</span>}
                      </Td>
                      <Td align="right">{quantity(pos.quantity)}</Td>
                      <Td align="right">{money(pos.averagePrice, pc)}</Td>
                      <Td align="right">{money(pos.currentPrice, pc)}</Td>
                      <Td align="right" className="font-medium">
                        {money(pos.value, cur)}
                      </Td>
                      <Td align="right" className={lossClass(pos.profitLoss)}>
                        {signedMoney(pos.profitLoss, cur)}
                      </Td>
                    </Row>
                  );
                })}
              </tbody>
            </Table>
          </div>
        )}
      </section>
    </>
  );
}

function DepositsLine({ portfolio: p, transactions }: { portfolio: Portfolio; transactions: CashTransaction[] }) {
  const cur = p.accountCurrency;
  const { netContributed } = summariseDeposits(transactions, cur);
  const ret = realReturn(p.totalValue, netContributed);
  return (
    <p className="mt-8 text-sm text-ink-muted">
      You&apos;ve put in {money(netContributed, cur)} ·{" "}
      <span className={lossClass(ret.amount)}>
        {signedMoney(ret.amount, cur)}
        {ret.pct !== null && ` (${signedPercent(ret.pct)})`}
      </span>{" "}
      overall ·{" "}
      <Link href="/deposits" className={linkClass}>
        See deposits
      </Link>
    </p>
  );
}
