"use client";

import type { ChartOptions } from "chart.js";
import { Bar } from "react-chartjs-2";
import type { MonthTotal } from "@/lib/deposits";
import { money, monthLabel } from "@/lib/format";
import { colors } from "@/lib/tokens";
import { baseOptions, categoryAxis, moneyAxis, tooltipStyle } from "./chartTheme";

export function DepositsChart({ monthly, currency }: { monthly: MonthTotal[]; currency: string }) {
  const options: ChartOptions<"bar"> = {
    ...baseOptions,
    scales: { x: categoryAxis(), y: { ...moneyAxis, grace: "8%" } },
    plugins: {
      legend: { display: false },
      tooltip: {
        ...tooltipStyle,
        displayColors: false,
        callbacks: { label: (item) => `Net deposited: ${money(Number(item.raw), currency)}` },
      },
    },
  };

  const data = {
    labels: monthly.map((m) => monthLabel(m.month)),
    datasets: [
      {
        data: monthly.map((m) => m.net),
        backgroundColor: monthly.map((m) => (m.net < 0 ? colors.accentRust : colors.accent)),
        maxBarThickness: 28,
        borderRadius: 2,
      },
    ],
  };

  return (
    <div className="relative h-[360px] w-full">
      <Bar data={data} options={options} role="img" aria-label="Net amount deposited each month" />
    </div>
  );
}
