"use client";

import { AnimatePresence, motion, useMotionValue, useSpring, useTransform, type MotionValue } from "motion/react";
import { X } from "lucide-react";
import { useRef } from "react";
import { ORDER_STATUSES, type OrderStatus } from "@/lib/api/schemas";
import { STATUS_META } from "@/lib/status";

function DockButton({
  mouseX,
  status,
  onClick,
}: {
  mouseX: MotionValue<number>;
  status: OrderStatus;
  onClick: () => void;
}) {
  const ref = useRef<HTMLButtonElement>(null);
  const distance = useTransform(mouseX, (x) => {
    const b = ref.current?.getBoundingClientRect() ?? { x: 0, width: 0 };
    return x - b.x - b.width / 2;
  });
  const scale = useSpring(useTransform(distance, [-140, 0, 140], [1, 1.18, 1]), { mass: 0.1, stiffness: 160, damping: 12 });
  const meta = STATUS_META[status];
  return (
    <motion.button
      ref={ref}
      type="button"
      style={{ scale }}
      onClick={onClick}
      data-testid={`bulk-to-${status}`}
      className="flex h-10 origin-bottom items-center gap-2 rounded-xl border border-white/10 bg-white/[0.04] px-3 text-xs font-medium text-white/85 transition-colors hover:bg-white/[0.09]"
    >
      <span className="size-2 rounded-full" style={{ background: meta.color }} />
      {meta.label}
    </motion.button>
  );
}

/** Barra flotante estilo Floating Dock para acciones masivas. */
export function BulkBar({
  count,
  onPick,
  onClear,
}: {
  count: number;
  onPick: (status: OrderStatus) => void;
  onClear: () => void;
}) {
  const mouseX = useMotionValue(Infinity);
  return (
    <AnimatePresence>
      {count > 0 && (
        <motion.div
          initial={{ y: 80, opacity: 0, x: "-50%" }}
          animate={{ y: 0, opacity: 1, x: "-50%" }}
          exit={{ y: 80, opacity: 0, x: "-50%" }}
          transition={{ type: "spring", stiffness: 380, damping: 30 }}
          className="fixed bottom-6 left-1/2 z-40 w-max max-w-[calc(100vw-2rem)]"
        >
          <div
            data-testid="bulk-bar"
            role="toolbar"
            aria-label="Acciones masivas"
            onMouseMove={(e) => mouseX.set(e.clientX)}
            onMouseLeave={() => mouseX.set(Infinity)}
            className="flex items-end gap-2 overflow-x-auto rounded-2xl border border-white/10 bg-[#0e0e15]/90 p-2 pl-4 shadow-[0_20px_60px_-15px_rgb(0_0_0/0.9),0_0_40px_-10px_rgb(124_92_255/0.4)] backdrop-blur-xl"
          >
            <div className="flex h-10 shrink-0 items-center gap-2 pr-2 text-sm text-white">
              <span className="grid size-6 place-items-center rounded-full bg-brand font-mono text-[11px]">{count}</span>
              <span className="hidden sm:inline">Cambiar estado a…</span>
            </div>
            {ORDER_STATUSES.map((s) => (
              <DockButton key={s} mouseX={mouseX} status={s} onClick={() => onPick(s)} />
            ))}
            <div className="mx-1 h-8 w-px self-center bg-white/10" />
            <button
              type="button"
              onClick={onClear}
              data-testid="bulk-clear"
              className="flex h-10 shrink-0 items-center gap-1.5 rounded-xl px-3 text-xs text-white/60 hover:bg-white/[0.06] hover:text-white"
            >
              <X className="size-3.5" /> Cancelar selección
            </button>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
