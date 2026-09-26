import {
  BarElement,
  CategoryScale,
  Chart as ChartJS,
  Filler,
  LinearScale,
  LineElement,
  PointElement,
  Tooltip,
  type Plugin,
} from "chart.js";
import { compactGBP } from "@/lib/format";
import { colors } from "@/lib/tokens";

ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, BarElement, Filler, Tooltip);

const FONT = "Inter, system-ui, sans-serif";
const AXIS_FONT = { family: FONT, size: 12 };

export const baseOptions = {
  responsive: true,
  maintainAspectRatio: false,
  animation: false as const,
  layout: { padding: { top: 8, right: 4 } },
};

export const categoryAxis = (title?: string) => ({
  grid: { display: false },
  border: { color: colors.rule },
  ticks: { color: colors.inkMuted, font: AXIS_FONT, maxRotation: 0, autoSkipPadding: 16 },
  title: { display: !!title, text: title ?? "", color: colors.inkMuted, font: AXIS_FONT },
});

export const moneyAxis = {
  grid: { color: colors.rule, lineWidth: 1 },
  border: { display: false },
  ticks: {
    color: colors.inkMuted,
    font: AXIS_FONT,
    maxTicksLimit: 6,
    callback: (v: string | number) => compactGBP(Number(v)),
  },
};

export const tooltipStyle = {
  backgroundColor: colors.ink,
  titleColor: colors.paper,
  bodyColor: colors.paper,
  titleFont: { family: FONT, weight: 600 as const },
  bodyFont: { family: FONT },
  padding: 10,
  cornerRadius: 2,
  boxPadding: 4,
};

const hoverPoint = (color: string) => ({
  pointRadius: 0,
  pointHoverRadius: 5,
  pointHoverBackgroundColor: color,
  pointHoverBorderColor: colors.paper,
  pointHoverBorderWidth: 2,
});

// The palette's green and slate sit close together, so value and contributions also
// differ by line style (solid + fill / dashed), the legend, and direct end labels.
export const valueLine = (label: string, data: number[]) => ({
  label,
  data,
  borderColor: colors.accent,
  backgroundColor: `${colors.accent}14`, // ~8% alpha
  borderWidth: 2,
  fill: "origin" as const,
  cubicInterpolationMode: "monotone" as const,
  ...hoverPoint(colors.accent),
});

export const contributedLine = (label: string, data: number[]) => ({
  label,
  data,
  borderColor: colors.inkMuted,
  borderWidth: 2,
  borderDash: [6, 4],
  ...hoverPoint(colors.inkMuted),
});

export const SWATCHES = {
  value: "h-0.5 bg-accent",
  contributed: "border-t-2 border-dashed border-ink-muted",
  goal: "border-t border-dotted border-ink",
} as const;

export function drawLabel(
  ctx: CanvasRenderingContext2D,
  text: string,
  x: number,
  y: number,
  color: string,
  align: CanvasTextAlign,
) {
  ctx.save();
  ctx.font = `500 12px ${FONT}`;
  ctx.textBaseline = "middle";
  ctx.textAlign = align;
  ctx.fillStyle = color;
  ctx.fillText(text, x, y);
  ctx.restore();
}

/** Labels each listed dataset at its last point, on the right edge. */
export const endLabels = (
  labels: Array<{ dataset: number; text: string; dy: number; color: string }>,
): Plugin<"line"> => ({
  id: "endLabels",
  afterDatasetsDraw(chart) {
    const { ctx, chartArea } = chart;
    for (const { dataset, text, dy, color } of labels) {
      const last = chart.getDatasetMeta(dataset).data.at(-1);
      if (!last) continue;
      const y = Math.min(chartArea.bottom - 8, Math.max(chartArea.top + 8, last.y + dy));
      drawLabel(ctx, text, chartArea.right - 4, y, color, "right");
    }
  },
});
