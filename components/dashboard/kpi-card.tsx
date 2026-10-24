"use client";

import { ArrowDownRight, ArrowUpRight } from "lucide-react";
import { motion } from "motion/react";
import { AnimatedNumber } from "@/components/charts/animated-number";
import { MiniBars } from "@/components/charts/mini-bars";
import { Skeleton } from "@/components/ui/skeleton";
import { formatPercent } from "@/lib/format";
import { cn } from "@/lib/utils";

export function KpiCard({
  label,
  value,
  format,
  delta,
  deltaLabel,
  series,
  color,
  index = 0,
}: {
  label: string;
  value: number;
  format: (n: number) => string;
  delta: number;
  /** Texto del delta (p. ej. "+1.2 pp"). Por defecto, porcentaje con signo. */
  deltaLabel?: string;
  series: number[];
  color: string;
  index?: number;
}) {
  const up = delta >= 0;
  return (
    <motion.article
      initial={{ opacity: 0, y: 14 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.06, duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
      className="group relative overflow-hidden rounded-2xl border border-white/[0.07] bg-gradient-to-b from-white/[0.04] to-white/[0.01] p-5 transition hover:-translate-y-0.5 hover:border-white/15"
    >
      <div
        aria-hidden="true"
        className="pointer-events-none absolute -top-16 -right-10 size-40 rounded-full opacity-0 blur-3xl transition-opacity duration-500 group-hover:opacity-40"
        style={{ background: color }}
      />
      <div className="font-mono text-[10px] tracking-[0.16em] text-subtle uppercase">{label}</div>
      <div className="mt-2 font-mono text-[26px] leading-none text-white tabular">
        <AnimatedNumber value={value} format={format} />
      </div>
      <div
        className={cn(
          "mt-2 inline-flex items-center gap-1 rounded-md px-1.5 py-0.5 font-mono text-[11px]",
          up ? "bg-success/10 text-success" : "bg-danger/10 text-danger",
        )}
      >
        {up ? <ArrowUpRight className="size-3" /> : <ArrowDownRight className="size-3" />}
        {deltaLabel ?? formatPercent(delta, { signed: true })}
        <span className="sr-only">{up ? "aumento" : "disminución"} contra el periodo anterior</span>
      </div>
      <MiniBars className="mt-4" values={series} color={color} height={40} />
    </motion.article>
  );
}

export function KpiSkeleton() {
  return (
    <div className="rounded-2xl border border-white/[0.07] bg-white/[0.02] p-5">
      <Skeleton className="h-2.5 w-24" />
      <Skeleton className="mt-3 h-7 w-36" />
      <Skeleton className="mt-3 h-4 w-16" />
      <Skeleton className="mt-4 h-10 w-full" />
    </div>
  );
}
