"use client";

import type { Plugin } from "chart.js";
import { wholeGBP } from "@/lib/format";
import type { YearPoint } from "@/lib/simulator";
import { colors } from "@/lib/tokens";
import { LineChart } from "./LineChart";
import { SWATCHES, contributedLine, drawLabel, endLabels, valueLine } from "./chartTheme";

const LEGEND = [
  { label: "Portfolio value", swatch: SWATCHES.value },
  { label: "Total contributed", swatch: SWATCHES.contributed },
  { label: "Goal", swatch: SWATCHES.goal },
] as const;

const lineLabels = endLabels([
  { dataset: 0, text: "Portfolio", dy: -12, color: colors.accent },
  { dataset: 1, text: "Contributed", dy: 14, color: colors.inkMuted },
]);

const goalLabel: Plugin<"line"> = {
  id: "goalLabel",
  afterDatasetsDraw(chart) {
    const goalPoint = chart.getDatasetMeta(2).data[0];
    if (goalPoint) drawLabel(chart.ctx, "Goal", chart.chartArea.left + 6, goalPoint.y - 10, colors.ink, "left");
  },
};

export function SimulatorChart({ series, goal }: { series: YearPoint[]; goal: number }) {
  return (
    <LineChart
      legend={LEGEND}
      labels={series.map((p) => String(p.age))}
      datasets={[
        valueLine(
          LEGEND[0].label,
          series.map((p) => p.value),
        ),
        contributedLine(
          LEGEND[1].label,
          series.map((p) => p.contributed),
        ),
        {
          label: LEGEND[2].label,
          data: series.map(() => goal),
          borderColor: colors.ink,
          borderWidth: 1,
          borderDash: [2, 4],
          pointRadius: 0,
          pointHoverRadius: 0,
        },
      ]}
      plugins={[lineLabels, goalLabel]}
      formatValue={wholeGBP}
      ariaLabel="Projected portfolio value by age, compared with total contributed and the goal"
      xTitle="Age"
      tooltipTitle={(age) => `Age ${age}`}
    />
  );
}
