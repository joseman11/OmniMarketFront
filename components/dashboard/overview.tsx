"use client";

import Link from "next/link";
import { ChevronRight } from "lucide-react";
import { useMemo } from "react";
import { useReferenceDate } from "@/components/dashboard/reference-date";
import { SegmentedBar } from "@/components/charts/segmented-bar";
import { RevenueAreaChart } from "@/components/charts/revenue-area";
import { KpiCard, KpiSkeleton } from "@/components/dashboard/kpi-card";
import { ErrorState, PageHeader, Panel } from "@/components/dashboard/panel";
import { Skeleton } from "@/components/ui/skeleton";
import { aggregateByCategory, aggregateByDay, computeKpis, fillDays, isoDaysBefore } from "@/lib/analytics";
import { categoryColor } from "@/lib/catalog";
import { formatCurrency, formatNumber, formatPercent, formatRelativeTime, splitCurrency } from "@/lib/format";
import { marginRatio } from "@/lib/finance";
import { useAnalyticsSeries, useKanbanBoard } from "@/lib/hooks/use-api";
import { avatarDataUri } from "@/lib/avatar";
import { STATUS_META } from "@/lib/status";

const WINDOW = 15;

export function Overview() {
  const today = useReferenceDate();
  const from = isoDaysBefore(today, WINDOW * 2 - 1);
  const series = useAnalyticsSeries({ from });
  const board = useKanbanBoard();

  const rows = series.data;
  const kpis = useMemo(() => (rows ? computeKpis(rows, WINDOW, today) : null), [rows, today]);
  const currentRows = useMemo(() => {
    if (!rows) return [];
    const cutoff = isoDaysBefore(today, WINDOW - 1);
    return rows.filter((r) => r.day >= cutoff);
  }, [rows, today]);
  const byCategory = useMemo(() => aggregateByCategory(currentRows), [currentRows]);
  // Mismo corte de calendario que los KPI: días sin ventas aparecen en cero.
  const byDay = useMemo(() => fillDays(aggregateByDay(currentRows), isoDaysBefore(today, WINDOW - 1), today), [currentRows, today]);
  const totalRevenue = byCategory.reduce((a, c) => a + c.revenue, 0);
  const big = splitCurrency(totalRevenue);

  const latest = useMemo(() => {
    const cards = board.data?.columns.flatMap((c) => c.cards) ?? [];
    return [...cards].sort((a, b) => (b.updatedAt ?? "").localeCompare(a.updatedAt ?? "")).slice(0, 6);
  }, [board.data]);

  return (
    <div className="mx-auto max-w-7xl">
      <PageHeader
        title="Resumen"
        accent="de operación"
        description={`Últimos ${WINDOW} días comparados con los ${WINDOW} anteriores.`}
      />

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {!kpis ? (
          Array.from({ length: 4 }).map((_, i) => <KpiSkeleton key={i} />)
        ) : (
          <>
            <KpiCard index={0} label="Ingresos" value={kpis.revenue.value} format={(n) => formatCurrency(n)} delta={kpis.revenue.delta} series={kpis.revenue.series} color="#7c5cff" />
            <KpiCard index={1} label="Órdenes" value={kpis.orders.value} format={(n) => formatNumber(Math.round(n))} delta={kpis.orders.delta} series={kpis.orders.series} color="#3987e5" />
            <KpiCard index={2} label="Ticket promedio" value={kpis.avgTicket.value} format={(n) => formatCurrency(n)} delta={kpis.avgTicket.delta} series={kpis.avgTicket.series} color="#e8834a" />
            <KpiCard
              index={3}
              label="Margen bruto"
              value={kpis.marginPct.value}
              format={(n) => formatPercent(n)}
              delta={kpis.marginPct.delta}
              deltaLabel={`${kpis.marginPct.delta >= 0 ? "+" : ""}${(kpis.marginPct.delta * 100).toFixed(1)} pp`}
              series={kpis.marginPct.series}
              color="#199e70"
            />
          </>
        )}
      </div>

      {series.error && (
        <div className="mt-4">
          <ErrorState message={series.error.message} onRetry={() => void series.mutate()} />
        </div>
      )}

      <Panel className="mt-4" title="Ingresos por categoría" description={`Distribución de los últimos ${WINDOW} días`}>
        {!rows ? (
          <div>
            <Skeleton className="h-9 w-64" />
            <Skeleton className="mt-6 h-[5px] w-full" />
            <div className="mt-5 flex gap-8">
              {Array.from({ length: 5 }).map((_, i) => (
                <Skeleton key={i} className="h-8 w-24" />
              ))}
            </div>
          </div>
        ) : (
          <>
            <div className="mb-6 font-mono text-4xl text-white tabular md:text-5xl">
              {big.whole}
              <span className="align-top text-lg text-subtle">{big.cents}</span>
              <span className="ml-2 align-middle font-sans text-xs text-subtle">MXN</span>
            </div>
            <SegmentedBar
              segments={byCategory.map((c) => ({
                label: c.categoryName,
                value: c.revenue,
                color: categoryColor(c.categoryId),
                display: formatCurrency(c.revenue),
              }))}
            />
          </>
        )}
      </Panel>

      <div className="mt-4 grid gap-4 xl:grid-cols-[1.6fr_1fr]">
        <Panel title="Ingresos por día" description="Total diario de todas las categorías">
          {!rows ? <Skeleton className="h-[260px] w-full" /> : <RevenueAreaChart data={byDay} />}
        </Panel>

        <Panel
          title="Últimas órdenes"
          description="Actualizadas recientemente"
          action={
            <Link href="/dashboard/kanban" className="inline-flex items-center gap-1 text-xs text-subtle hover:text-white">
              Ver tablero <ChevronRight className="size-3.5" />
            </Link>
          }
          className="p-0 md:p-0 [&>header]:px-5 [&>header]:pt-5 md:[&>header]:px-6 md:[&>header]:pt-6"
        >
          {board.error ? (
            <div className="p-5">
              <ErrorState message={board.error.message} onRetry={() => void board.mutate()} />
            </div>
          ) : !board.data ? (
            <ul className="divide-y divide-white/[0.05]">
              {Array.from({ length: 6 }).map((_, i) => (
                <li key={i} className="flex items-center gap-3 px-5 py-3">
                  <Skeleton className="size-8 rounded-full" />
                  <div className="flex-1">
                    <Skeleton className="h-3 w-32" />
                    <Skeleton className="mt-2 h-2.5 w-20" />
                  </div>
                  <Skeleton className="h-3 w-16" />
                </li>
              ))}
            </ul>
          ) : (
            <ul className="divide-y divide-white/[0.05]">
              {latest.map((o) => {
                const meta = STATUS_META[o.status];
                return (
                  <li key={o.id}>
                    <Link
                      href={`/dashboard/orders/${encodeURIComponent(o.id)}`}
                      className="flex items-center gap-3 px-5 py-3 transition hover:bg-white/[0.03] md:px-6"
                    >
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={avatarDataUri(o.customerName, "#26263a", "#3a3a55")} alt="" className="size-8 rounded-full" />
                      <div className="min-w-0 flex-1">
                        <div className="truncate text-sm text-white">{o.customerName}</div>
                        <div className="flex items-center gap-1.5 truncate font-mono text-[11px] whitespace-nowrap text-subtle">
                          {o.orderNumber}
                          {o.updatedAt && <span className="truncate">· {formatRelativeTime(o.updatedAt)}</span>}
                        </div>
                      </div>
                      <span
                        className="hidden rounded-md px-1.5 py-0.5 text-[11px] sm:inline"
                        style={{ color: meta.color, background: `${meta.color}1a` }}
                      >
                        {meta.label}
                      </span>
                      <div className="text-right">
                        <div className="font-mono text-sm text-white tabular">{formatCurrency(o.total)}</div>
                        <div className="font-mono text-[10px] text-success">{formatPercent(marginRatio(o.margin, o.total))} mg</div>
                      </div>
                      <ChevronRight className="size-4 text-white/25" />
                    </Link>
                  </li>
                );
              })}
            </ul>
          )}
        </Panel>
      </div>
    </div>
  );
}
