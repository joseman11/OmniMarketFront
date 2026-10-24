"use client";

import { Area, AreaChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import type { DayPoint } from "@/lib/analytics";
import { formatCurrency, formatDay, formatNumber } from "@/lib/format";

function ChartTooltip({
  active,
  payload,
}: {
  active?: boolean;
  payload?: { payload: DayPoint }[];
}) {
  const p = payload?.[0]?.payload;
  if (!active || !p) return null;
  return (
    <div className="rounded-xl border border-white/10 bg-[#0e0e15]/95 px-3 py-2 text-xs shadow-xl backdrop-blur">
      <div className="mb-1 text-white/50">{formatDay(p.day, { year: true })}</div>
      <div className="font-mono text-sm text-white">{formatCurrency(p.revenue)}</div>
      <div className="text-white/50">{formatNumber(p.orders)} órdenes</div>
    </div>
  );
}

/** Ingresos por día (serie única → sin leyenda; el título la nombra). */
export function RevenueAreaChart({ data, height = 260 }: { data: DayPoint[]; height?: number }) {
  return (
    <div style={{ height }} role="img" aria-label="Gráfica de área: ingresos por día">
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={data} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
          <defs>
            <linearGradient id="rev-fill" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#7c5cff" stopOpacity={0.35} />
              <stop offset="100%" stopColor="#7c5cff" stopOpacity={0} />
            </linearGradient>
          </defs>
          <CartesianGrid vertical={false} stroke="rgb(255 255 255 / 0.06)" />
          <XAxis
            dataKey="day"
            tickFormatter={(d: string) => formatDay(d)}
            tick={{ fill: "rgb(255 255 255 / 0.4)", fontSize: 11 }}
            axisLine={false}
            tickLine={false}
            minTickGap={28}
          />
          <YAxis
            tickFormatter={(v: number) => formatCurrency(v, { compact: true })}
            tick={{ fill: "rgb(255 255 255 / 0.4)", fontSize: 11 }}
            axisLine={false}
            tickLine={false}
            width={64}
          />
          <Tooltip
            content={<ChartTooltip />}
            cursor={{ stroke: "rgb(255 255 255 / 0.25)", strokeDasharray: "3 3" }}
          />
          <Area
            type="monotone"
            dataKey="revenue"
            stroke="#a493ff"
            strokeWidth={2}
            fill="url(#rev-fill)"
            activeDot={{ r: 5, stroke: "#0c0c12", strokeWidth: 2, fill: "#a493ff" }}
            animationDuration={900}
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}
