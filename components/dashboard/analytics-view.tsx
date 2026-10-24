"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight, RotateCcw } from "lucide-react";
import { useCallback, useMemo } from "react";
import { MarginBars } from "@/components/charts/margin-bars";
import { RevenueAreaChart } from "@/components/charts/revenue-area";
import { LatencyBadge } from "@/components/dashboard/latency-badge";
import { ErrorState, PageHeader, Panel } from "@/components/dashboard/panel";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { aggregateByCategory, aggregateByDay, isoDaysAgo } from "@/lib/analytics";
import { analyticsFiltersSchema, PAGE_SIZES, paginationSchema } from "@/lib/api/schemas";
import { categoryColor } from "@/lib/catalog";
import { formatCurrency, formatDay, formatNumber, formatPercent } from "@/lib/format";
import { marginRatio } from "@/lib/finance";
import { useAnalytics, useAnalyticsSeries, useCategories } from "@/lib/hooks/use-api";
import { cn } from "@/lib/utils";

const ALL = "all";

export function AnalyticsView() {
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();

  const defaults = useMemo(() => ({ from: isoDaysAgo(29), to: isoDaysAgo(0) }), []);
  const pag = paginationSchema.safeParse({ page: params.get("page") ?? 1, limit: params.get("limit") ?? 25 });
  const page = pag.success ? pag.data.page : 1;
  const limit = pag.success && (PAGE_SIZES as readonly number[]).includes(pag.data.limit) ? pag.data.limit : 25;
  const from = params.get("from") ?? defaults.from;
  const to = params.get("to") ?? defaults.to;
  const categoryId = params.get("categoryId") ?? undefined;
  const filtersCheck = analyticsFiltersSchema.safeParse({ from, to, categoryId });
  const filters = filtersCheck.success ? filtersCheck.data : { from: defaults.from, to: defaults.to };

  const setParams = useCallback(
    (patch: Record<string, string | number | undefined>) => {
      const next = new URLSearchParams(params.toString());
      for (const [k, v] of Object.entries(patch)) {
        if (v === undefined || v === "") next.delete(k);
        else next.set(k, String(v));
      }
      router.replace(`${pathname}?${next.toString()}`, { scroll: false });
    },
    [params, pathname, router],
  );

  const table = useAnalytics({ page, limit, ...filters });
  const series = useAnalyticsSeries(filters);
  const categories = useCategories();
  const byDay = series.data ? aggregateByDay(series.data) : [];
  const byCat = series.data ? aggregateByCategory(series.data) : [];
  const meta = table.data?.data.meta;
  const totalPages = Math.max(1, meta?.totalPages ?? 1);

  return (
    <div className="mx-auto max-w-7xl">
      <PageHeader
        title="Analítica"
        accent="de ventas"
        description="Métricas diarias por categoría desde GET /api/analytics, paginadas en el servidor."
        actions={<LatencyBadge ms={table.data?.latencyMs} testId="analytics-latency" />}
      />

      {/* Filtros: una sola fila sobre las gráficas */}
      <Panel className="mb-4 p-4 md:p-4">
        <form
          className="flex flex-wrap items-end gap-3"
          onSubmit={(e) => e.preventDefault()}
          aria-label="Filtros de analítica"
        >
          <div className="grid gap-1.5">
            <Label htmlFor="f-from" className="text-xs text-white/50">Desde</Label>
            <Input
              id="f-from"
              type="date"
              value={from}
              max={to}
              onChange={(e) => setParams({ from: e.target.value, page: 1 })}
              className="h-9 w-40 [color-scheme:dark]"
            />
          </div>
          <div className="grid gap-1.5">
            <Label htmlFor="f-to" className="text-xs text-white/50">Hasta</Label>
            <Input
              id="f-to"
              type="date"
              value={to}
              min={from}
              onChange={(e) => setParams({ to: e.target.value, page: 1 })}
              className="h-9 w-40 [color-scheme:dark]"
            />
          </div>
          <div className="grid gap-1.5">
            <Label htmlFor="f-cat" className="text-xs text-white/50">Categoría</Label>
            <Select value={categoryId ?? ALL} onValueChange={(v) => setParams({ categoryId: v === ALL ? undefined : v, page: 1 })}>
              <SelectTrigger id="f-cat" className="h-9 w-48">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={ALL}>Todas las categorías</SelectItem>
                {(categories.data?.data.items ?? []).map((c) => (
                  <SelectItem key={c.id} value={c.id}>
                  <span className="size-2 rounded-full" style={{ background: categoryColor(c.id) }} /> {c.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="flex gap-1.5">
            {[7, 30, 60].map((d) => (
              <button
                key={d}
                type="button"
                onClick={() => setParams({ from: isoDaysAgo(d - 1), to: isoDaysAgo(0), page: 1 })}
                className={cn(
                  "h-9 rounded-lg border px-3 text-xs transition",
                  from === isoDaysAgo(d - 1) && to === isoDaysAgo(0)
                    ? "border-brand/50 bg-brand/15 text-white"
                    : "border-white/10 text-white/55 hover:text-white",
                )}
              >
                {d} d
              </button>
            ))}
          </div>
          <button
            type="button"
            onClick={() => router.replace(pathname, { scroll: false })}
            className="ml-auto inline-flex h-9 items-center gap-1.5 rounded-lg px-3 text-xs text-white/45 hover:text-white"
          >
            <RotateCcw className="size-3.5" /> Limpiar
          </button>
          {!filtersCheck.success && (
            <p role="alert" className="w-full text-xs text-danger">
              {filtersCheck.error.issues[0]?.message}
            </p>
          )}
        </form>
      </Panel>

      <div className="grid gap-4 xl:grid-cols-[1.5fr_1fr]">
        <Panel title="Ingresos por día" description={`${formatDay(filters.from ?? from, { year: true })} – ${formatDay(filters.to ?? to, { year: true })}`}>
          {series.error ? (
            <ErrorState message={series.error.message} onRetry={() => void series.mutate()} />
          ) : !series.data ? (
            <Skeleton className="h-[260px] w-full" />
          ) : (
            <RevenueAreaChart data={byDay} />
          )}
        </Panel>
        <Panel title="Margen bruto por categoría" description="Margen / ingresos del periodo">
          {!series.data ? <Skeleton className="h-[260px] w-full" /> : <MarginBars data={byCat} />}
        </Panel>
      </div>

      <Panel
        className="mt-4 p-0 md:p-0 [&>header]:px-5 [&>header]:pt-5"
        title="Detalle diario"
        description={meta ? `${formatNumber(meta.total)} registros · página ${meta.page} de ${totalPages}` : "Cargando…"}
        action={
          <div className="flex items-center gap-2 pr-0 text-xs text-white/50">
            <Label htmlFor="page-size" className="text-xs text-white/50">Filas</Label>
            <Select value={String(limit)} onValueChange={(v) => setParams({ limit: v, page: 1 })}>
              <SelectTrigger id="page-size" className="h-8 w-20" aria-label="Filas por página">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {PAGE_SIZES.map((s) => (
                  <SelectItem key={s} value={String(s)}>
                    {s}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        }
      >
        {table.error ? (
          <div className="p-5">
            <ErrorState message={table.error.message} onRetry={() => void table.mutate()} />
          </div>
        ) : (
          <div className="overflow-x-auto">
            <Table data-testid="analytics-table" aria-busy={table.isValidating}>
              <TableHeader>
                <TableRow className="border-white/[0.06] hover:bg-transparent">
                  <TableHead className="pl-5">Día</TableHead>
                  <TableHead>Categoría</TableHead>
                  <TableHead className="text-right">Órdenes</TableHead>
                  <TableHead className="text-right">Ingresos</TableHead>
                  <TableHead className="text-right">Ticket prom.</TableHead>
                  <TableHead className="text-right">Margen bruto</TableHead>
                  <TableHead className="pr-5 text-right">Margen %</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody className={cn("transition-opacity", table.isValidating && table.data && "opacity-60")}>
                {!table.data
                  ? Array.from({ length: Math.min(limit, 10) }).map((_, i) => (
                      <TableRow key={i} className="border-white/[0.04]">
                        {Array.from({ length: 7 }).map((__, j) => (
                          <TableCell key={j} className={j === 0 ? "pl-5" : ""}>
                            <Skeleton className="h-3.5 w-full max-w-24" />
                          </TableCell>
                        ))}
                      </TableRow>
                    ))
                  : table.data.data.data.map((r) => (
                      <TableRow key={`${r.day}-${r.categoryId}`} className="border-white/[0.04] font-mono text-[13px] tabular">
                        <TableCell className="pl-5 font-sans text-white/80">{formatDay(r.day, { year: true })}</TableCell>
                        <TableCell className="font-sans">
                          <span className="inline-flex items-center gap-2">
                            <span className="size-2 rounded-full" style={{ background: categoryColor(r.categoryId) }} />
                            {r.categoryName}
                          </span>
                        </TableCell>
                        <TableCell className="text-right">{formatNumber(r.ordersCount)}</TableCell>
                        <TableCell className="text-right text-white">{formatCurrency(r.revenue)}</TableCell>
                        <TableCell className="text-right">{formatCurrency(r.avgTicket)}</TableCell>
                        <TableCell className="text-right">{formatCurrency(r.grossMargin)}</TableCell>
                        <TableCell className="pr-5 text-right text-white/70">{formatPercent(marginRatio(r.grossMargin, r.revenue))}</TableCell>
                      </TableRow>
                    ))}
                {table.data && table.data.data.data.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={7} className="py-10 text-center font-sans text-white/45">
                      No hay datos para los filtros seleccionados.
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        )}

        <nav aria-label="Paginación" className="flex flex-wrap items-center justify-between gap-3 border-t border-white/[0.06] px-5 py-3">
          <span className="text-xs text-white/45">
            {meta ? `Mostrando ${formatNumber(Math.min((page - 1) * limit + 1, meta.total))}–${formatNumber(Math.min(page * limit, meta.total))} de ${formatNumber(meta.total)}` : <Skeleton className="h-3 w-32" />}
          </span>
          <div className="flex items-center gap-1">
            {[
              { label: "Primera página", icon: ChevronsLeft, to: 1, disabled: page <= 1 },
              { label: "Página anterior", icon: ChevronLeft, to: page - 1, disabled: page <= 1 },
            ].map((b) => (
              <button
                key={b.label}
                type="button"
                aria-label={b.label}
                disabled={b.disabled}
                onClick={() => setParams({ page: b.to })}
                className="grid size-8 place-items-center rounded-lg border border-white/10 text-white/60 transition hover:text-white disabled:opacity-30"
              >
                <b.icon className="size-4" />
              </button>
            ))}
            <span className="px-3 font-mono text-xs text-white/70" aria-live="polite">
              {page} / {totalPages}
            </span>
            {[
              { label: "Página siguiente", icon: ChevronRight, to: page + 1, disabled: page >= totalPages },
              { label: "Última página", icon: ChevronsRight, to: totalPages, disabled: page >= totalPages },
            ].map((b) => (
              <button
                key={b.label}
                type="button"
                aria-label={b.label}
                disabled={b.disabled}
                onClick={() => setParams({ page: b.to })}
                className="grid size-8 place-items-center rounded-lg border border-white/10 text-white/60 transition hover:text-white disabled:opacity-30"
              >
                <b.icon className="size-4" />
              </button>
            ))}
          </div>
        </nav>
      </Panel>
    </div>
  );
}
