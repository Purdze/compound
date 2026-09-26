"use client";

import { useMemo, useState } from "react";
import { apiRequest } from "@/lib/client-api";
import { NAME_MAX_LENGTH } from "@/lib/field-rules";
import { compactGBP, wholeGBP } from "@/lib/format";
import type { Preset } from "@/lib/presets";
import {
  DEFAULT_INPUT,
  LIMITS,
  MODES,
  MODE_LABELS,
  clampInput,
  simulate,
  type SimulatorInput,
  type SimulatorMode,
} from "@/lib/simulator";
import type { PortfolioResult } from "@/lib/t212/portfolio";
import { SimulatorChart } from "./SimulatorChart";
import { Slider } from "./Slider";
import { Button, HeadRow, Notice, Row, Table, Td, Th, inputClass, type NoticeMessage } from "./ui";
import { useAnimatedNumber } from "./useAnimatedNumber";

type Props = {
  connected: boolean;
  initialPresets: Preset[];
  averageMonthly: number | null;
};

export function Simulator({ connected, initialPresets, averageMonthly }: Props) {
  const [input, setInput] = useState<SimulatorInput>(DEFAULT_INPUT);
  const [presets, setPresets] = useState(initialPresets);
  const [notice, setNotice] = useState<NoticeMessage | null>(null);
  const [prefilling, setPrefilling] = useState(false);

  const result = useMemo(() => simulate(input), [input]);
  const { mode } = input;
  const headline = useAnimatedNumber(
    mode === "monthly" ? result.monthlyContribution : mode === "value" ? result.finalValue : (result.reachAge ?? 0),
  );
  const contributed = wholeGBP(input.lumpSum + result.monthlyContribution * result.months);
  const averageDeposit = averageMonthly !== null && averageMonthly > 0 ? averageMonthly : null;

  const update = (patch: Partial<SimulatorInput>) => setInput((prev) => clampInput({ ...prev, ...patch }));
  const set = (field: keyof SimulatorInput) => (v: number) => update({ [field]: v });

  async function prefillFromPortfolio() {
    setPrefilling(true);
    setNotice(null);
    const res = await apiRequest<PortfolioResult>("/api/portfolio", "Couldn't load your portfolio.");
    setPrefilling(false);

    if (!res.ok) return setNotice({ tone: "problem", text: res.error });
    if (res.data.status === "error") return setNotice({ tone: "problem", text: res.data.message });
    if (res.data.status !== "ok")
      return setNotice({ tone: "problem", text: "Connect a Trading 212 key in Settings first." });

    const total = res.data.portfolio.totalValue;
    const rounded = Math.round(total / LIMITS.lumpSum.step) * LIMITS.lumpSum.step;
    update({ lumpSum: rounded });
    setNotice(
      rounded > LIMITS.lumpSum.max
        ? {
            tone: "info",
            text: `Your portfolio is worth ${wholeGBP(total)}. The lump sum is capped at ${wholeGBP(LIMITS.lumpSum.max)}.`,
          }
        : {
            tone: "success",
            text: `Lump sum set to your portfolio value, ${wholeGBP(total)}, rounded to the nearest £1,000.`,
          },
    );
  }

  return (
    <div className="pt-12">
      <h1 className="text-2xl">Goal simulator</h1>
      <p className="mt-3 max-w-2xl text-ink-muted">
        Work out how much to invest each month, what you&apos;d end up with, or when you&apos;d reach a goal. Move the
        sliders; everything updates as you go.
      </p>

      <div className="mt-10 grid gap-12 border-t border-rule pt-10 lg:grid-cols-[20rem_1fr]">
        <div className="space-y-7">
          <ModeSwitch mode={mode} onChange={(m) => update({ mode: m })} />
          <Slider
            label="Current age"
            {...LIMITS.currentAge}
            value={input.currentAge}
            format={String}
            onChange={set("currentAge")}
          />
          <Slider
            label="Target age"
            {...LIMITS.targetAge}
            value={mode === "age" ? (result.reachAge ?? LIMITS.targetAge.max) : input.targetAge}
            locked={mode === "age"}
            format={String}
            onChange={set("targetAge")}
            hint={
              mode !== "age" && input.targetAge <= input.currentAge + 1
                ? "Must be at least a year after your current age."
                : undefined
            }
          />
          <Slider
            label={mode === "value" ? "Goal to compare against" : "Goal"}
            {...LIMITS.goalAmount}
            value={input.goalAmount}
            format={wholeGBP}
            onChange={set("goalAmount")}
          />
          <div>
            <Slider
              label="Each month"
              {...LIMITS.monthly}
              value={mode === "monthly" ? Math.round(result.monthlyContribution) : input.monthly}
              locked={mode === "monthly"}
              format={wholeGBP}
              onChange={set("monthly")}
            />
            {mode !== "monthly" && averageDeposit !== null && (
              <Button
                variant="quiet"
                className="mt-2"
                onClick={() =>
                  update({ monthly: Math.round(averageDeposit / LIMITS.monthly.step) * LIMITS.monthly.step })
                }
              >
                Use my average deposit ({wholeGBP(averageDeposit)} a month)
              </Button>
            )}
          </div>
          <Slider
            label="Annual growth"
            {...LIMITS.rate}
            value={input.rate}
            format={(v) => `${v.toFixed(1)}%`}
            onChange={set("rate")}
          />
          <div>
            <Slider
              label="Lump sum now"
              {...LIMITS.lumpSum}
              value={input.lumpSum}
              format={wholeGBP}
              onChange={set("lumpSum")}
            />
            {connected && (
              <Button variant="quiet" className="mt-2" onClick={prefillFromPortfolio} disabled={prefilling}>
                {prefilling ? "Loading portfolio…" : "Use my portfolio value"}
              </Button>
            )}
          </div>
          {notice && <Notice tone={notice.tone}>{notice.text}</Notice>}
        </div>

        <div className="min-w-0">
          <div className="flex flex-wrap gap-x-16 gap-y-6">
            <div>
              <p className="text-sm text-ink-muted">
                {mode === "monthly" && (result.goalReachedByLumpSum ? "Monthly needed" : "Invest each month")}
                {mode === "value" && `By ${input.targetAge} you'd have`}
                {mode === "age" &&
                  (result.reachAge === null
                    ? `Reaching ${compactGBP(input.goalAmount)}`
                    : `You'd reach ${compactGBP(input.goalAmount)} at`)}
              </p>
              <p
                className={`figure mt-1 text-3xl ${mode === "monthly" && result.goalReachedByLumpSum ? "text-accent" : ""}`}
                aria-live="polite"
              >
                {mode === "age"
                  ? result.reachAge === null
                    ? `Not by ${LIMITS.targetAge.max}`
                    : Math.round(headline)
                  : wholeGBP(Math.round(headline))}
              </p>
            </div>
            {(mode !== "age" || result.reachAge !== null) && (
              <div>
                <p className="text-sm text-ink-muted">Years to grow</p>
                <p className="figure mt-1 text-3xl">{result.years}</p>
              </div>
            )}
          </div>
          <p className="mt-4 max-w-xl text-sm text-ink-muted">
            {mode === "monthly" &&
              (result.goalReachedByLumpSum ? (
                <span className="text-accent">
                  Your lump sum alone is on track to reach {compactGBP(input.goalAmount)} by {input.targetAge}, growing
                  to about {wholeGBP(result.lumpFutureValue)}. No monthly contributions needed.
                </span>
              ) : (
                <>
                  {wholeGBP(result.monthlyContribution)} a month for {result.years} years, at {input.rate.toFixed(1)}% a
                  year, reaches {wholeGBP(input.goalAmount)} by age {input.targetAge}. You&apos;d contribute{" "}
                  {contributed} in total; growth covers the rest.
                </>
              ))}
            {mode === "value" && (
              <>
                {result.finalValue >= input.goalAmount ? (
                  <span className="text-accent">
                    {wholeGBP(result.finalValue - input.goalAmount)} past your {compactGBP(input.goalAmount)} goal.
                  </span>
                ) : (
                  <>
                    {wholeGBP(input.goalAmount - result.finalValue)} short of your {compactGBP(input.goalAmount)} goal.
                  </>
                )}{" "}
                You&apos;d contribute {contributed} in total; growth covers the rest.
              </>
            )}
            {mode === "age" &&
              (result.reachAge === null ? (
                <>
                  Not reached by {LIMITS.targetAge.max} at {wholeGBP(input.monthly)} a month. Invest more each month or
                  add a lump sum.
                </>
              ) : (
                <>
                  {wholeGBP(input.monthly)} a month at {input.rate.toFixed(1)}% a year reaches{" "}
                  {wholeGBP(input.goalAmount)} in {result.years} years. You&apos;d contribute {contributed} in total.
                </>
              ))}
          </p>
          {mode === "monthly" && averageDeposit !== null && !result.goalReachedByLumpSum && (
            <p className="mt-2 max-w-xl text-sm text-ink-muted">
              Your deposits average {wholeGBP(averageDeposit)} a month
              {averageDeposit >= result.monthlyContribution ? (
                <span className="text-accent">: enough for this goal.</span>
              ) : (
                <>: {wholeGBP(result.monthlyContribution - averageDeposit)} a month short of this goal.</>
              )}
            </p>
          )}

          <div className="mt-10">
            <SimulatorChart series={result.series} goal={input.goalAmount} />
          </div>

          <details className="mt-6 text-sm">
            <summary className="text-ink-muted hover:text-ink">Show year-by-year table</summary>
            <div className="mt-4">
              <Table minWidth="28rem">
                <thead>
                  <HeadRow>
                    <Th>Age</Th>
                    <Th align="right">Portfolio value</Th>
                    <Th align="right">Total contributed</Th>
                  </HeadRow>
                </thead>
                <tbody>
                  {result.series.map((p) => (
                    <Row key={p.age}>
                      <Td>{p.age}</Td>
                      <Td align="right">{wholeGBP(p.value)}</Td>
                      <Td align="right">{wholeGBP(p.contributed)}</Td>
                    </Row>
                  ))}
                </tbody>
              </Table>
            </div>
          </details>
        </div>
      </div>

      <Presets input={input} presets={presets} setPresets={setPresets} onLoad={update} />
    </div>
  );
}

/** What a preset is about, in its own mode's terms: "£1.5M by 55", "£500/month to 55" or "£1.5M at £500/month". */
function presetSummary(p: Preset): string {
  const monthly = `${compactGBP(p.monthly)}/month`;
  if (p.mode === "value") return `${monthly} to ${p.targetAge}`;
  if (p.mode === "age") return `${compactGBP(p.goalAmount)} at ${monthly}`;
  return `${compactGBP(p.goalAmount)} by ${p.targetAge}`;
}

function ModeSwitch({ mode, onChange }: { mode: SimulatorMode; onChange: (mode: SimulatorMode) => void }) {
  return (
    <fieldset>
      <legend className="text-sm text-ink-muted">Work out</legend>
      <div className="mt-2 flex rounded-sm border border-rule">
        {MODES.map((m) => (
          <label key={m} className="flex-1 border-l border-rule first:border-l-0">
            <input
              type="radio"
              name="simulator-mode"
              value={m}
              checked={mode === m}
              onChange={() => onChange(m)}
              className="peer sr-only"
            />
            <span className="block cursor-pointer px-2 py-2 text-center text-sm text-ink-muted peer-checked:bg-accent peer-checked:text-paper peer-focus-visible:outline-2 peer-focus-visible:outline-accent">
              {MODE_LABELS[m]}
            </span>
          </label>
        ))}
      </div>
    </fieldset>
  );
}

function Presets({
  input,
  presets,
  setPresets,
  onLoad,
}: {
  input: SimulatorInput;
  presets: Preset[];
  setPresets: React.Dispatch<React.SetStateAction<Preset[]>>;
  onLoad: (p: SimulatorInput) => void;
}) {
  const [name, setName] = useState("");
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<NoticeMessage | null>(null);

  async function save(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setMessage(null);
    const res = await apiRequest<{ preset: Preset }>("/api/presets", "The preset couldn't be saved. Try again.", {
      method: "POST",
      body: { ...input, name },
    });
    setSaving(false);
    if (!res.ok) return setMessage({ tone: "problem", text: res.error });
    setPresets((prev) => [res.data.preset, ...prev]);
    setMessage({ tone: "success", text: `Saved “${res.data.preset.name}”.` });
    setName("");
  }

  async function remove(id: string) {
    setMessage(null);
    const res = await apiRequest(
      `/api/presets/${encodeURIComponent(id)}`,
      "The preset couldn't be deleted. Try again.",
      {
        method: "DELETE",
      },
    );
    if (!res.ok && res.status !== 404) return setMessage({ tone: "problem", text: res.error });
    setPresets((prev) => prev.filter((p) => p.id !== id));
  }

  return (
    <section className="mt-16 border-t border-rule pt-10">
      <h2 className="text-xl">Presets</h2>
      <p className="mt-2 text-sm text-ink-muted">Save a scenario to come back to it, or to compare against another.</p>

      <form onSubmit={save} className="mt-6 flex max-w-lg flex-wrap items-end gap-3">
        <label className="min-w-0 flex-1">
          <span className="sr-only">Preset name</span>
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="e.g. Retire at 55"
            maxLength={NAME_MAX_LENGTH}
            required
            className={inputClass}
          />
        </label>
        <Button type="submit" disabled={saving || !name.trim()}>
          {saving ? "Saving…" : "Save"}
        </Button>
      </form>
      {message && (
        <div className="mt-4 max-w-lg">
          <Notice tone={message.tone}>{message.text}</Notice>
        </div>
      )}

      {presets.length === 0 ? (
        <p className="mt-6 text-sm text-ink-muted">No presets yet. Set the sliders, name the scenario, and save it.</p>
      ) : (
        <ul className="mt-6 max-w-3xl">
          {presets.map((p) => (
            <li key={p.id} className="flex flex-wrap items-baseline justify-between gap-4 border-b border-rule py-3">
              <div>
                <span className="font-medium">{p.name}</span>
                <span className="ml-3 text-sm text-ink-muted tabular-nums">
                  {presetSummary(p)} · from {p.currentAge} · {p.rate}% · {compactGBP(p.lumpSum)} now
                </span>
              </div>
              <div className="flex gap-4">
                <Button variant="quiet" onClick={() => onLoad(p)}>
                  Load
                </Button>
                <Button variant="quiet" onClick={() => remove(p.id)}>
                  Delete
                </Button>
              </div>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
