"use client";

import { useId } from "react";

type Props = {
  label: string;
  value: number;
  min: number;
  max: number;
  step: number;
  format: (v: number) => string;
  onChange: (v: number) => void;
  hint?: string;
  /** Shows the value as the simulator's result instead of an input. */
  locked?: boolean;
  /** A labelled tick under the track, such as a limit. */
  mark?: { value: number; label: string };
};

export function Slider({ label, value, min, max, step, format, onChange, hint, locked = false, mark }: Props) {
  const id = useId();
  const shown = Math.min(max, Math.max(min, value));
  const percent = (v: number) => ((v - min) / (max - min)) * 100;
  return (
    <div>
      <div className="flex items-baseline justify-between gap-4">
        <label htmlFor={id} className="text-sm text-ink-muted">
          {label}
          {locked && <span className="text-accent"> · worked out</span>}
        </label>
        <output htmlFor={id} className="figure text-base">
          {format(value)}
        </output>
      </div>
      <input
        id={id}
        type="range"
        min={min}
        max={max}
        step={step}
        value={shown}
        disabled={locked}
        onChange={(e) => onChange(Number(e.target.value))}
        aria-valuetext={format(value)}
        style={{ "--fill": `${percent(shown)}%` } as React.CSSProperties}
        className="mt-1"
      />
      {mark && (
        <div className="relative h-4 text-xs text-ink-muted" aria-hidden>
          <span
            className="absolute top-0 -translate-x-1/2 border-l border-ink-muted pl-1 leading-none"
            style={{ left: `${percent(mark.value)}%` }}
          >
            {mark.label}
          </span>
        </div>
      )}
      {hint && <p className="text-xs text-ink-muted">{hint}</p>}
    </div>
  );
}
