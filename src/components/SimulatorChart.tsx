"use client";

import {
  CategoryScale,
  Chart as ChartJS,
  Filler,
  LinearScale,
  LineElement,
  PointElement,
  Tooltip,
  type ChartOptions,
  type Plugin,
} from "chart.js";
import { Line } from "react-chartjs-2";
import { compactGBP, wholeGBP } from "@/lib/format";
import type { YearPoint } from "@/lib/simulator";
import { colors } from "@/lib/tokens";

ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, Filler, Tooltip);

const ACCENT_FILL = `${colors.accent}14`; // ~8% alpha

const FONT = "Inter, system-ui, sans-serif";
const AXIS_FONT = { family: FONT, size: 12 };

const SERIES = [
  { label: "Portfolio value", swatch: "h-0.5 bg-accent" },
  { label: "Total contributed", swatch: "border-t-2 border-dashed border-ink-muted" },
  { label: "Goal", swatch: "border-t border-dotted border-ink" },
] as const;

// The palette's green and slate sit close together, so series also differ by
// line style (solid + fill / dashed / dotted), the legend, and direct end labels.
const endLabels: Plugin<"line"> = {
  id: "endLabels",
  afterDatasetsDraw(chart) {
    const { ctx, chartArea } = chart;
    ctx.save();
    ctx.font = `500 12px ${FONT}`;
    ctx.textBaseline = "middle";

    const goalPoint = chart.getDatasetMeta(2).data[0];
    if (goalPoint) {
      ctx.fillStyle = colors.ink;
      ctx.textAlign = "left";
      ctx.fillText("Goal", chartArea.left + 6, goalPoint.y - 10);
    }

    const labels: Array<[number, string, number, string]> = [
      [0, "Portfolio", -12, colors.accent],
      [1, "Contributed", 14, colors.inkMuted],
    ];
    for (const [index, label, dy, color] of labels) {
      const pts = chart.getDatasetMeta(index).data;
      const last = pts[pts.length - 1];
      if (!last) continue;
      ctx.fillStyle = color;
      ctx.textAlign = "right";
      ctx.fillText(
        label,
        chartArea.right - 4,
        Math.min(chartArea.bottom - 8, Math.max(chartArea.top + 8, last.y + dy)),
      );
    }
    ctx.restore();
  },
};

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

const hoverPoint = (color: string) => ({
  pointRadius: 0,
  pointHoverRadius: 5,
  pointHoverBackgroundColor: color,
  pointHoverBorderColor: colors.paper,
  pointHoverBorderWidth: 2,
});

const options: ChartOptions<"line"> = {
  responsive: true,
  maintainAspectRatio: false,
  animation: false,
  interaction: { mode: "index", intersect: false },
  layout: { padding: { top: 8, right: 4 } },
  scales: {
    x: {
      grid: { display: false },
      border: { color: colors.rule },
      ticks: { color: colors.inkMuted, font: AXIS_FONT, maxRotation: 0, autoSkipPadding: 16 },
      title: { display: true, text: "Age", color: colors.inkMuted, font: AXIS_FONT },
    },
    y: {
      beginAtZero: true,
      grace: "8%", // headroom so the goal line and its label never sit on the top edge
      grid: { color: colors.rule, lineWidth: 1 },
      border: { display: false },
      ticks: {
        color: colors.inkMuted,
        font: AXIS_FONT,
        maxTicksLimit: 6,
        callback: (v) => compactGBP(Number(v)),
      },
    },
  },
  plugins: {
    legend: { display: false },
    tooltip: {
      backgroundColor: colors.ink,
      titleColor: colors.paper,
      bodyColor: colors.paper,
      titleFont: { family: FONT, weight: 600 },
      bodyFont: { family: FONT },
      padding: 10,
      cornerRadius: 2,
      boxPadding: 4,
      callbacks: {
        title: (items) => `Age ${items[0]?.label ?? ""}`,
        label: (item) => ` ${item.dataset.label}: ${wholeGBP(Number(item.raw))}`,
      },
    },
  },
};

export function SimulatorChart({ series, goal }: { series: YearPoint[]; goal: number }) {
  const data = {
    labels: series.map((p) => String(p.age)),
    datasets: [
      {
        label: SERIES[0].label,
        data: series.map((p) => p.value),
        borderColor: colors.accent,
        backgroundColor: ACCENT_FILL,
        borderWidth: 2,
        fill: "origin" as const,
        tension: 0.2,
        ...hoverPoint(colors.accent),
      },
      {
        label: SERIES[1].label,
        data: series.map((p) => p.contributed),
        borderColor: colors.inkMuted,
        borderWidth: 2,
        borderDash: [6, 4],
        ...hoverPoint(colors.inkMuted),
      },
      {
        label: SERIES[2].label,
        data: series.map(() => goal),
        borderColor: colors.ink,
        borderWidth: 1,
        borderDash: [2, 4],
        pointRadius: 0,
        pointHoverRadius: 0,
      },
    ],
  };

  return (
    <figure>
      <ul className="flex flex-wrap gap-x-6 gap-y-2 text-sm text-ink-muted" aria-label="Chart legend">
        {SERIES.map(({ label, swatch }) => (
          <li key={label} className="flex items-center gap-2">
            <span className={`block w-5 ${swatch}`} />
            {label}
          </li>
        ))}
      </ul>
      <div className="relative mt-4 h-[420px] w-full">
        <Line
          data={data}
          options={options}
          plugins={[endLabels, crosshair]}
          role="img"
          aria-label="Projected portfolio value by age, compared with total contributed and the goal"
        />
      </div>
    </figure>
  );
}
