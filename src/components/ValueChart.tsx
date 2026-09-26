"use client";

import type { ValuePoint } from "@/lib/deposits";
import { dayLabel, money } from "@/lib/format";
import { colors } from "@/lib/tokens";
import { LineChart } from "./LineChart";
import { SWATCHES, contributedLine, endLabels, valueLine } from "./chartTheme";

const LEGEND = [
  { label: "Worth", swatch: SWATCHES.value },
  { label: "Put in", swatch: SWATCHES.contributed },
] as const;

const lineLabels = endLabels([
  { dataset: 0, text: "Worth", dy: -12, color: colors.accent },
  { dataset: 1, text: "Put in", dy: 14, color: colors.inkMuted },
]);

export function ValueChart({ points, currency }: { points: ValuePoint[]; currency: string }) {
  return (
    <LineChart
      legend={LEGEND}
      labels={points.map((p) => dayLabel(p.day))}
      datasets={[
        valueLine(
          LEGEND[0].label,
          points.map((p) => p.value),
        ),
        contributedLine(
          LEGEND[1].label,
          points.map((p) => p.contributed),
        ),
      ]}
      plugins={[lineLabels]}
      formatValue={(v) => money(v, currency)}
      ariaLabel="Portfolio value each day, compared with the net amount deposited"
    />
  );
}
