"use client";

import { motion } from "motion/react";
import { cn } from "@/lib/utils";

export type Segment = { label: string; value: number; color: string; display?: string };

/**
 * Barra segmentada con resplandor inferior (ref. Starlight).
 * Cada segmento es proporcional a su valor.
 */
export function SegmentedBar({
  segments,
  className,
  showLegend = true,
}: {
  segments: Segment[];
  className?: string;
  showLegend?: boolean;
}) {
  const total = segments.reduce((a, s) => a + s.value, 0) || 1;
  return (
    <div className={cn("w-full", className)}>
      <div className="flex w-full gap-1" role="img" aria-label={segments.map((s) => `${s.label}: ${s.display ?? s.value}`).join(", ")}>
        {segments.map((s, i) => (
          <motion.div
            key={s.label}
            initial={{ scaleX: 0, opacity: 0 }}
            whileInView={{ scaleX: 1, opacity: 1 }}
            viewport={{ once: true }}
            transition={{ duration: 0.9, delay: i * 0.08, ease: [0.22, 1, 0.36, 1] }}
            className="relative h-[5px] origin-left rounded-full"
            style={{ flexGrow: s.value / total, flexBasis: 0, background: s.color }}
          >
            <span
              aria-hidden="true"
              className="pointer-events-none absolute inset-x-0 top-full h-14 opacity-50 blur-[2px]"
              style={{ background: `linear-gradient(to bottom, ${s.color}55, transparent)` }}
            />
            <span
              aria-hidden="true"
              className="absolute inset-0 rounded-full"
              style={{ boxShadow: `0 0 14px ${s.color}` }}
            />
          </motion.div>
        ))}
      </div>
      {showLegend && (
        <div className="relative mt-5 flex flex-wrap gap-x-8 gap-y-3">
          {segments.map((s) => (
            <div key={s.label} className="min-w-0">
              <div className="flex items-center gap-2 text-xs text-white/55">
                <span className="size-1.5 rounded-full" style={{ background: s.color }} />
                {s.label}
              </div>
              <div className="mt-0.5 font-mono text-sm font-medium text-white tabular">{s.display ?? s.value}</div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
