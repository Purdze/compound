"use client";

import type { ChartDataset, ChartOptions, Plugin } from "chart.js";
import { Line } from "react-chartjs-2";
import { colors } from "@/lib/tokens";
import { baseOptions, categoryAxis, moneyAxis, tooltipStyle } from "./chartTheme";

const crosshair: Plugin<"line"> = {
  id: "crosshair",
  afterDatasetsDraw(chart) {
    const x = chart.tooltip?.getActiveElements()?.[0]?.element.x;
    if (x === undefined) return;
    const { ctx, chartArea } = chart;
    ctx.save();
    ctx.strokeStyle = colors.inkMuted;
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(x, chartArea.top);
    ctx.lineTo(x, chartArea.bottom);
    ctx.stroke();
    ctx.restore();
  },
};

type Props = {
  legend: ReadonlyArray<{ label: string; swatch: string }>;
  labels: string[];
  datasets: ChartDataset<"line", number[]>[];
  plugins: Plugin<"line">[];
  formatValue: (value: number) => string;
  ariaLabel: string;
  xTitle?: string;
  tooltipTitle?: (label: string) => string;
};

export function LineChart({
  legend,
  labels,
  datasets,
  plugins,
  formatValue,
  ariaLabel,
  xTitle,
  tooltipTitle = (label) => label,
}: Props) {
  const options: ChartOptions<"line"> = {
    ...baseOptions,
    interaction: { mode: "index", intersect: false },
    // Headroom so lines and their labels never sit on the top edge.
    scales: { x: categoryAxis(xTitle), y: { ...moneyAxis, beginAtZero: true, grace: "8%" } },
    plugins: {
      legend: { display: false },
      tooltip: {
        ...tooltipStyle,
        callbacks: {
          title: (items) => tooltipTitle(items[0]?.label ?? ""),
          label: (item) => ` ${item.dataset.label}: ${formatValue(Number(item.raw))}`,
        },
      },
    },
  };

  return (
    <figure>
      <ul className="flex flex-wrap gap-x-6 gap-y-2 text-sm text-ink-muted" aria-label="Chart legend">
        {legend.map(({ label, swatch }) => (
          <li key={label} className="flex items-center gap-2">
            <span className={`block w-5 ${swatch}`} />
            {label}
          </li>
        ))}
      </ul>
      <div className="relative mt-4 h-[420px] w-full">
        <Line
          data={{ labels, datasets }}
          options={options}
          plugins={[...plugins, crosshair]}
          role="img"
          aria-label={ariaLabel}
        />
      </div>
    </figure>
  );
}
