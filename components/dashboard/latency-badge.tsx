import { Gauge } from "lucide-react";
import { LATENCY_SLA_MS } from "@/lib/api/config";
import { formatMs } from "@/lib/format";
import { cn } from "@/lib/utils";

export function LatencyBadge({ ms, testId, className }: { ms?: number; testId?: string; className?: string }) {
  const ok = ms !== undefined && ms < LATENCY_SLA_MS;
  return (
    <span
      data-testid={testId}
      data-ok={ms === undefined ? undefined : ok}
      title={`SLA: < ${LATENCY_SLA_MS} ms`}
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 font-mono text-[11px] tabular",
        className,
        ms === undefined
          ? "border-white/10 text-white/40"
          : ok
            ? "border-success/30 bg-success/10 text-success"
            : "border-danger/30 bg-danger/10 text-danger",
      )}
    >
      <Gauge className="size-3.5" />
      {ms === undefined ? "— ms" : formatMs(ms)}
      <span className="sr-only">{ok ? "dentro del SLA" : "fuera del SLA"}</span>
    </span>
  );
}
