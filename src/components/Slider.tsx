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
};

export function Slider({ label, value, min, max, step, format, onChange, hint, locked = false }: Props) {
  const id = useId();
  const shown = Math.min(max, Math.max(min, value));
  const fill = ((shown - min) / (max - min)) * 100;
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
        style={{ "--fill": `${fill}%` } as React.CSSProperties}
        className="mt-1"
      />
      {hint && <p className="text-xs text-ink-muted">{hint}</p>}
    </div>
  );
}
