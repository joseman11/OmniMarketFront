"use client";

import { Bar, BarChart, CartesianGrid, Cell, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import type { CategoryPoint } from "@/lib/analytics";
import { categoryColor } from "@/lib/catalog";
import { formatCurrency, formatPercent } from "@/lib/format";

function MarginTooltip({ active, payload }: { active?: boolean; payload?: { payload: CategoryPoint }[] }) {
  const p = payload?.[0]?.payload;
  if (!active || !p) return null;
  return (
    <div className="rounded-xl border border-white/10 bg-[#0e0e15]/95 px-3 py-2 text-xs shadow-xl backdrop-blur">
      <div className="mb-1 text-white/50">{p.categoryName}</div>
      <div className="font-mono text-sm text-white">{formatPercent(p.marginPct)} margen</div>
      <div className="text-white/50">{formatCurrency(p.margin)} de {formatCurrency(p.revenue)}</div>
    </div>
  );
}

/** Margen bruto % por categoría: barras horizontales con etiqueta directa. */
export function MarginBars({ data, height = 260 }: { data: CategoryPoint[]; height?: number }) {
  return (
    <div style={{ height }} role="img" aria-label="Gráfica de barras: margen bruto por categoría">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} layout="vertical" margin={{ top: 0, right: 48, left: 0, bottom: 0 }} barCategoryGap={8}>
          <CartesianGrid horizontal={false} stroke="rgb(255 255 255 / 0.06)" />
          <XAxis
            type="number"
            domain={[0, 1]}
            tickFormatter={(v: number) => formatPercent(v, { digits: 0 })}
            tick={{ fill: "rgb(255 255 255 / 0.4)", fontSize: 11 }}
            axisLine={false}
            tickLine={false}
          />
          <YAxis
            type="category"
            dataKey="categoryName"
            width={104}
            tick={{ fill: "rgb(255 255 255 / 0.65)", fontSize: 12 }}
            axisLine={false}
            tickLine={false}
          />
          <Tooltip content={<MarginTooltip />} cursor={{ fill: "rgb(255 255 255 / 0.04)" }} />
          <Bar
            dataKey="marginPct"
            radius={[0, 4, 4, 0]}
            maxBarSize={22}
            animationDuration={900}
            label={{
              position: "right",
              fill: "rgb(255 255 255 / 0.7)",
              fontSize: 11,
              formatter: (v: unknown) => formatPercent(Number(v)),
            }}
          >
            {data.map((d) => (
              <Cell key={d.categoryId} fill={categoryColor(d.categoryId)} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
