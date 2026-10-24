import { KpiSkeleton } from "@/components/dashboard/kpi-card";
import { Skeleton } from "@/components/ui/skeleton";
import { ORDER_STATUSES } from "@/lib/api/schemas";

function HeaderSkeleton() {
  return (
    <div className="mb-8">
      <Skeleton className="h-9 w-64" />
      <Skeleton className="mt-3 h-3.5 w-80" />
    </div>
  );
}

export function OverviewSkeleton() {
  return (
    <div className="mx-auto max-w-7xl" aria-busy="true" aria-label="Cargando resumen">
      <HeaderSkeleton />
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <KpiSkeleton key={i} />
        ))}
      </div>
      <Skeleton className="mt-4 h-52 w-full rounded-2xl" />
      <div className="mt-4 grid gap-4 xl:grid-cols-[1.6fr_1fr]">
        <Skeleton className="h-80 rounded-2xl" />
        <Skeleton className="h-80 rounded-2xl" />
      </div>
    </div>
  );
}

export function AnalyticsSkeleton() {
  return (
    <div className="mx-auto max-w-7xl" aria-busy="true" aria-label="Cargando analítica">
      <HeaderSkeleton />
      <Skeleton className="mb-4 h-20 w-full rounded-2xl" />
      <div className="grid gap-4 xl:grid-cols-[1.5fr_1fr]">
        <Skeleton className="h-80 rounded-2xl" />
        <Skeleton className="h-80 rounded-2xl" />
      </div>
      <Skeleton className="mt-4 h-96 w-full rounded-2xl" />
    </div>
  );
}

export function KanbanCardSkeleton() {
  return (
    <div className="rounded-xl border border-white/[0.06] bg-white/[0.02] p-3">
      <div className="flex justify-between">
        <Skeleton className="h-3 w-16" />
        <Skeleton className="h-3 w-10" />
      </div>
      <Skeleton className="mt-3 h-3.5 w-32" />
      <div className="mt-4 flex justify-between">
        <Skeleton className="h-4 w-20" />
        <Skeleton className="size-6 rounded-full" />
      </div>
    </div>
  );
}

export function KanbanBoardSkeleton() {
  return (
    <div className="flex gap-4 overflow-hidden" aria-busy="true" aria-label="Cargando tablero">
      {ORDER_STATUSES.map((s, i) => (
        <div key={s} className="w-[280px] shrink-0 rounded-2xl border border-white/[0.06] bg-white/[0.015] p-3">
          <div className="mb-3 flex items-center justify-between px-1">
            <Skeleton className="h-3 w-24" />
            <Skeleton className="h-5 w-7 rounded-full" />
          </div>
          <div className="flex flex-col gap-2.5">
            {Array.from({ length: 4 - (i % 3) }).map((_, j) => (
              <KanbanCardSkeleton key={j} />
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}

export function KanbanSkeleton() {
  return (
    <div className="mx-auto max-w-[1600px]">
      <HeaderSkeleton />
      <KanbanBoardSkeleton />
    </div>
  );
}

export function AuditSkeleton() {
  return (
    <div className="mx-auto max-w-6xl" aria-busy="true" aria-label="Cargando auditoría">
      <HeaderSkeleton />
      <div className="grid gap-4">
        {Array.from({ length: 3 }).map((_, i) => (
          <Skeleton key={i} className="h-56 rounded-2xl" />
        ))}
      </div>
    </div>
  );
}
